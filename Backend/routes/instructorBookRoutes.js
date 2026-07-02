const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const BookOfferGroup = require('../models/BookOfferGroup');
const auth = require('../middleware/auth');
const requireApprovedCreator = require('../middleware/requireApprovedCreator');
const { syncStorefrontBookPriceToOfferGroup } = require('../utils/bookOfferHelpers');

function normalizeStringArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    return String(value)
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeTestimonials(value) {
    if (!value) return [];
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => ({
            tagline: String(item?.tagline || '').trim(),
            quote: String(item?.quote || '').trim(),
            name: String(item?.name || '').trim(),
            role: String(item?.role || '').trim(),
            image: String(item?.image || '').trim(),
        }))
        .filter((item) => item.quote);
}

function collectBookIdsFromOptions(options) {
    const ids = [];
    for (const opt of options || []) {
        for (const id of opt.bookIds || []) {
            ids.push(String(id));
        }
    }
    return ids;
}

/** Helper: confirm the requesting user owns this book */
function canEdit(book, userId) {
    return (
        book.source === 'instructor' &&
        book.createdBy &&
        book.createdBy.toString() === userId.toString()
    );
}

// ── List my books ────────────────────────────────────────────────────────────
router.get('/', auth, requireApprovedCreator, async (req, res) => {
    try {
        const query = { createdBy: req.user._id, source: 'instructor' };
        if (req.query.status && req.query.status !== 'all') {
            query.listingStatus = req.query.status;
        }
        const books = await Book.find(query).sort({ updatedAt: -1 });
        res.json(books);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ── Create book draft ────────────────────────────────────────────────────────
router.post('/', auth, requireApprovedCreator, async (req, res) => {
    try {
        const {
            title, author, description, type, price,
            fileUrl, stock, thumbnail, isbn,
            deliveryFee, watermarkTemplate, category,
            whatYoullLearn, afterReadingOutcomes, testimonials, hardcopyPrice
        } = req.body;

        if (!title || !author || !description || !type) {
            return res.status(400).json({
                message: 'title, author, description and type are required'
            });
        }
        const ebookFileUrl = type === 'ebook' ? String(fileUrl || '').trim() : '';

        const book = new Book({
            title: String(title).trim(),
            author: String(author).trim(),
            description: String(description).trim(),
            type,
            price: Number(price) || 0,
            category: category || 'general',
            fileUrl: ebookFileUrl || undefined,
            stock: type === 'hardcopy' ? (parseInt(stock) || 0) : undefined,
            thumbnail: String(thumbnail || '').trim() || undefined,
            isbn: String(isbn || '').trim() || undefined,
            deliveryFee: type === 'hardcopy' ? (parseFloat(deliveryFee) || 0) : undefined,
            watermarkTemplate: String(watermarkTemplate || '').trim() || undefined,
            // workflow
            createdBy: req.user._id,
            source: 'instructor',
            listingStatus: 'draft',
            rejectionReason: '',
            whatYoullLearn: normalizeStringArray(whatYoullLearn),
            afterReadingOutcomes: normalizeStringArray(afterReadingOutcomes),
            testimonials: normalizeTestimonials(testimonials),
            hardcopyPrice:
                type === 'ebook' && hardcopyPrice != null && hardcopyPrice !== ''
                    ? Number(hardcopyPrice)
                    : undefined,
        });

        await book.save();
        res.status(201).json(book);
    } catch (err) {
        console.error('instructor create book:', err);
        res.status(500).json({ message: 'Error creating book', error: err.message });
    }
});

// ── Get one book (owner only) ─────────────────────────────────────────────────
router.get('/:id', auth, requireApprovedCreator, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        if (!canEdit(book, req.user._id)) return res.status(403).json({ message: 'Access denied' });
        res.json(book);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ── Update draft / rejected book ─────────────────────────────────────────────
router.patch('/:id', auth, requireApprovedCreator, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        if (!canEdit(book, req.user._id)) return res.status(403).json({ message: 'Access denied' });
        if (book.listingStatus === 'pending_review') {
            return res.status(400).json({ message: 'Book is under review and cannot be edited right now' });
        }

        const allowed = [
            'title', 'author', 'description', 'type', 'price',
            'fileUrl', 'stock', 'thumbnail', 'isbn',
            'deliveryFee', 'watermarkTemplate', 'category',
            'whatYoullLearn', 'afterReadingOutcomes', 'testimonials', 'hardcopyPrice'
        ];
        allowed.forEach((key) => {
            if (req.body[key] === undefined) return;
            if (key === 'whatYoullLearn' || key === 'afterReadingOutcomes') {
                book[key] = normalizeStringArray(req.body[key]);
                return;
            }
            if (key === 'testimonials') {
                book[key] = normalizeTestimonials(req.body[key]);
                return;
            }
            if (key === 'hardcopyPrice') {
                const v = req.body[key];
                book.hardcopyPrice =
                    v === '' || v == null ? null : Number(v);
                return;
            }
            if (key === 'price') {
                book.price = Number(req.body.price) || 0;
                return;
            }
            book[key] = req.body[key];
        });

        if (book.type === 'ebook') {
            book.stock = undefined;
            book.deliveryFee = undefined;
        } else {
            book.fileUrl = undefined;
            book.hardcopyPrice = null;
        }

        // Re-opening a rejected book as draft
        if (book.listingStatus === 'rejected') {
            book.listingStatus = 'draft';
            book.rejectionReason = '';
        }

        await book.save();
        await syncStorefrontBookPriceToOfferGroup(book);
        res.json(book);
    } catch (err) {
        console.error('instructor patch book:', err);
        res.status(500).json({
            message: err.message || 'Server error',
            error: err.message,
        });
    }
});

// ── Delete (owner — any status) ───────────────────────────────────────────────
router.delete('/:id', auth, requireApprovedCreator, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        if (!canEdit(book, req.user._id)) return res.status(403).json({ message: 'Access denied' });

        if (book.offerGroupId) {
            const group = await BookOfferGroup.findById(book.offerGroupId);
            if (group) {
                const bookId = String(book._id);
                const isStorefront = String(group.storefrontBookId || '') === bookId;
                const allIds = collectBookIdsFromOptions(group.options);

                if (isStorefront) {
                    const siblingIds = allIds.filter((id) => id !== bookId);
                    if (siblingIds.length) {
                        await Book.deleteMany({
                            _id: { $in: siblingIds },
                            createdBy: req.user._id,
                            isPlanDeliverable: true,
                        });
                        await Book.updateMany(
                            { _id: { $in: siblingIds } },
                            { $set: { offerGroupId: null } }
                        );
                    }
                    await BookOfferGroup.findByIdAndDelete(group._id);
                } else {
                    let changed = false;
                    for (const opt of group.options || []) {
                        const before = (opt.bookIds || []).length;
                        opt.bookIds = (opt.bookIds || []).filter((id) => String(id) !== bookId);
                        if (opt.bookIds.length !== before) changed = true;
                        opt.planBooks = (opt.planBooks || []).filter(
                            (pb) => String(pb.bookId) !== bookId
                        );
                    }
                    if (changed) await group.save();
                }
            }
        }

        await Book.findByIdAndDelete(req.params.id);
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ── Submit for admin review ───────────────────────────────────────────────────
router.post('/:id/submit', auth, requireApprovedCreator, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        if (!canEdit(book, req.user._id)) return res.status(403).json({ message: 'Access denied' });

        if (!book.title || !book.description || !book.author) {
            return res.status(400).json({
                message: 'Please complete title, author and description before submitting'
            });
        }
        if (!['draft', 'rejected'].includes(book.listingStatus)) {
            return res.status(400).json({ message: 'Book cannot be submitted from its current status' });
        }

        book.listingStatus = 'pending_review';
        book.rejectionReason = '';
        await book.save();

        res.json({ message: 'Book submitted for admin review', book });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
