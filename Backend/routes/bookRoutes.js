const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const BookOfferGroup = require('../models/BookOfferGroup');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
    serializePublicOfferGroup,
    ensureOfferGroupPlanBooksEmbeds,
    enrichPublicBookListingPrices,
} = require('../utils/bookOfferHelpers');

// Get all books (public)
router.get('/', async (req, res) => {
    try {
        const { type, search, author, exclude } = req.query;
        let query = {};
        
        if (type) {
            query.type = type;
        }
        
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        if (author) {
            const escaped = String(author).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.author = { $regex: `^${escaped}$`, $options: 'i' };
        }

        if (exclude) {
            query._id = { $ne: exclude };
        }

        const books = await Book.find({
            ...query,
            isPlanDeliverable: { $ne: true },
            $or: [
                { source: { $ne: 'instructor' } },
                { listingStatus: 'published' },
            ],
        })
            .select('title author price hardcopyPrice type stock thumbnail description reviews whatYoullLearn afterReadingOutcomes testimonials offerGroupId');

        const payload = await enrichPublicBookListingPrices(books);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Purchase plans (singles + bundles) for a book page
router.get('/:id/offers', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).select('offerGroupId type');
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }
        if (!book.offerGroupId) {
            return res.json({ offerGroup: null });
        }

        let group = await BookOfferGroup.findById(book.offerGroupId);
        if (!group || group.listingStatus !== 'published') {
            return res.json({ offerGroup: null });
        }

        group = await ensureOfferGroupPlanBooksEmbeds(group);

        const allIds = [];
        for (const opt of group.options || []) {
            for (const id of opt.bookIds || []) {
                allIds.push(id);
            }
        }

        const books = await Book.find({ _id: { $in: allIds } }).select(
            'title author price thumbnail type fileUrl whatYoullLearn listingStatus'
        );
        const booksById = new Map(books.map((b) => [String(b._id), b]));

        const payload = serializePublicOfferGroup(group, booksById);
        if (!payload.options.length) {
            return res.json({ offerGroup: null });
        }

        res.json({ offerGroup: payload });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single book details (public preview)
router.get('/:id/preview', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).select(
            'title author price hardcopyPrice type stock thumbnail description reviews whatYoullLearn afterReadingOutcomes testimonials isPlanDeliverable offerGroupId'
        );

        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        if (book.isPlanDeliverable) {
            const group = await BookOfferGroup.findOne({
                'options.bookIds': book._id,
            }).select('storefrontBookId');
            if (group?.storefrontBookId) {
                return res.json({ redirectTo: String(group.storefrontBookId) });
            }
        }

        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get full book content (authenticated & purchased users only)
router.get('/:id/content', auth, async (req, res) => {
    try {
        const user = req.user;
        const book = await Book.findById(req.params.id);
            
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // Check if user has purchased the book
        const hasPurchased = user.purchasedBooks.includes(book._id);
        if (!hasPurchased) {
            return res.status(403).json({ message: 'Access denied. Please purchase this book.' });
        }
        
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Purchase book (authenticated)
router.post('/:id/purchase', auth, async (req, res) => {
    try {
        const { shippingAddress } = req.body;
        const user = req.user;
        const book = await Book.findById(req.params.id);
        
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // For hardcopy books, require shipping address
        if (book.type === 'hardcopy' && !shippingAddress) {
            return res.status(400).json({ 
                message: 'Shipping address is required for hardcopy books' 
            });
        }

        // Check stock for hardcopy books
        if (book.type === 'hardcopy' && book.stock < 1) {
            return res.status(400).json({ message: 'Book is out of stock' });
        }

        // Add to user's purchased books
        if (!user.purchasedBooks.includes(book._id)) {
            user.purchasedBooks.push(book._id);
            await user.save();

            // Update stock for hardcopy books
            if (book.type === 'hardcopy') {
                book.stock -= 1;
                await book.save();
            }
        }
        
        res.json({ message: 'Book purchased successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;