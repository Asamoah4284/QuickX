const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const BookOfferGroup = require('../models/BookOfferGroup');
const auth = require('../middleware/auth');
const requireApprovedCreator = require('../middleware/requireApprovedCreator');
const {
    normalizeOfferOptions,
    assertBooksOwnedByCreator,
    syncBooksToOfferGroup,
    resolveOfferOptionsWithPlanBooks,
    ensureOfferGroupPlanBooksEmbeds,
} = require('../utils/bookOfferHelpers');

function collectBookIdsFromOptions(options) {
    const ids = [];
    for (const opt of options) {
        for (const id of opt.bookIds || []) {
            ids.push(String(id));
        }
    }
    return ids;
}

// List author's books for building offer groups
router.get('/my-books', auth, requireApprovedCreator, async (req, res) => {
    try {
        const books = await Book.find({
            createdBy: req.user._id,
            source: 'instructor',
        })
            .select('title author price thumbnail type fileUrl listingStatus offerGroupId')
            .sort({ updatedAt: -1 });
        res.json(books);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Books in the same series (for plan picker — each has its own PDF)
router.get('/series-for-book/:bookId', auth, requireApprovedCreator, async (req, res) => {
    try {
        const anchor = await Book.findById(req.params.bookId);
        if (!anchor || anchor.createdBy?.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const idSet = new Set([String(anchor._id)]);

        if (anchor.offerGroupId) {
            const siblings = await Book.find({
                offerGroupId: anchor.offerGroupId,
                createdBy: req.user._id,
            }).select('_id');
            siblings.forEach((b) => idSet.add(String(b._id)));

            const group = await BookOfferGroup.findById(anchor.offerGroupId);
            if (group) {
                for (const opt of group.options || []) {
                    for (const id of opt.bookIds || []) {
                        idSet.add(String(id));
                    }
                }
            }
        }

        const books = await Book.find({
            _id: { $in: [...idSet] },
            createdBy: req.user._id,
            source: 'instructor',
        })
            .select('title author price thumbnail type fileUrl listingStatus offerGroupId')
            .sort({ createdAt: 1 });

        res.json(books);
    } catch (err) {
        console.error('series-for-book:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create another book in the same series (separate PDF from Book 1, Book 2, etc.)
router.post('/series-book', auth, requireApprovedCreator, async (req, res) => {
    try {
        const { anchorBookId, title, fileUrl } = req.body;
        if (!anchorBookId) {
            return res.status(400).json({ message: 'anchorBookId is required' });
        }
        const pdfUrl = String(fileUrl || '').trim();
        if (!pdfUrl) {
            return res.status(400).json({ message: 'fileUrl is required — upload the PDF first' });
        }

        const anchor = await Book.findById(anchorBookId);
        if (!anchor || anchor.createdBy?.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Book not found' });
        }

        const book = new Book({
            title: String(title || 'Book 2').trim(),
            author: String(anchor.author || '').trim() || 'Author',
            description: String(anchor.description || '').trim() || 'Part of a book series.',
            type: 'ebook',
            price: Number(anchor.price) || 0,
            category: anchor.category || 'general',
            createdBy: req.user._id,
            source: 'instructor',
            listingStatus:
                anchor.listingStatus === 'published' || anchor.listingStatus === 'approved'
                    ? 'published'
                    : 'draft',
            isPlanDeliverable: true,
            listingStatus: 'draft',
            offerGroupId: null,
            fileUrl: pdfUrl,
        });

        await book.save();
        res.status(201).json(book);
    } catch (err) {
        console.error('series-book:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get offer group for a book (owner)
router.get('/by-book/:bookId', auth, requireApprovedCreator, async (req, res) => {
    try {
        const book = await Book.findById(req.params.bookId);
        if (!book || book.createdBy?.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Book not found' });
        }
        if (!book.offerGroupId) {
            return res.json({ offerGroup: null, bookId: book._id });
        }
        let offerGroup = await BookOfferGroup.findById(book.offerGroupId);
        if (offerGroup) {
            offerGroup = await ensureOfferGroupPlanBooksEmbeds(offerGroup);
        }
        res.json({ offerGroup, bookId: book._id });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Create or update offer group for a book
router.put('/by-book/:bookId', auth, requireApprovedCreator, async (req, res) => {
    try {
        const book = await Book.findById(req.params.bookId);
        if (!book || book.createdBy?.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Book not found' });
        }
        if (book.listingStatus === 'pending_review') {
            return res.status(400).json({
                message: 'Book is under review. You can edit bundle plans after it is approved or returned to draft.',
            });
        }

        const { heading, subheading, options, enabled } = req.body;

        if (!enabled) {
            if (book.offerGroupId) {
                const group = await BookOfferGroup.findById(book.offerGroupId);
                if (group) {
                    const allIds = collectBookIdsFromOptions(group.options || []);
                    if (allIds.length) {
                        await Book.updateMany(
                            { _id: { $in: allIds } },
                            { $set: { offerGroupId: null } }
                        );
                    }
                    await BookOfferGroup.findByIdAndDelete(group._id);
                }
                book.offerGroupId = null;
                await book.save();
            }
            return res.json({ offerGroup: null, bookId: book._id });
        }

        const anchor = await Book.findById(book._id);
        const resolvedRaw = await resolveOfferOptionsWithPlanBooks(anchor, options, req.user._id);
        const normalized = normalizeOfferOptions(resolvedRaw);
        if (normalized.length < 1) {
            return res.status(400).json({
                message: 'Add at least one purchase option (single book or bundle)',
            });
        }

        const allBookIds = collectBookIdsFromOptions(normalized);
        const ownedBooks = await assertBooksOwnedByCreator(allBookIds, req.user._id);

        for (const owned of ownedBooks) {
            if (owned.type === 'ebook' && !String(owned.fileUrl || '').trim()) {
                return res.status(400).json({
                    message: `Upload a PDF for "${owned.title}" inside that purchase plan before saving.`,
                });
            }
        }

        for (const opt of normalized) {
            if (opt.type === 'single' && opt.bookIds.length !== 1) {
                return res.status(400).json({
                    message: 'Single options must include exactly one book',
                });
            }
            if (opt.type === 'bundle' && opt.bookIds.length < 1) {
                return res.status(400).json({
                    message: 'Bundles must include at least one book',
                });
            }
        }

        let offerGroup;
        if (book.offerGroupId) {
            offerGroup = await BookOfferGroup.findById(book.offerGroupId);
        }
        if (!offerGroup) {
            offerGroup = new BookOfferGroup({ createdBy: req.user._id });
        }

        offerGroup.heading = String(heading || 'PICK YOUR PLAN & START TODAY').trim();
        offerGroup.subheading = String(subheading || '').trim();
        offerGroup.options = normalized;
        offerGroup.storefrontBookId = book._id;
        offerGroup.listingStatus = 'published';
        await offerGroup.save();
        offerGroup = await ensureOfferGroupPlanBooksEmbeds(offerGroup);

        await syncBooksToOfferGroup(offerGroup._id, allBookIds, book._id);
        book.offerGroupId = offerGroup._id;
        await book.save();

        res.json({ offerGroup, bookId: book._id });
    } catch (err) {
        console.error('instructor book-offers put:', err);
        const isValidation =
            err.name === 'ValidationError' || err.message?.includes('validation failed');
        const status = err.status || (isValidation ? 400 : 500);
        const message = isValidation
            ? 'Each book in a purchase plan needs its PDF uploaded before you save.'
            : err.message || 'Server error';
        res.status(status).json({
            message,
            error: err.message,
        });
    }
});

module.exports = router;
