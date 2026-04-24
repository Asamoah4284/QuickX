const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const requireApprovedCreator = require('../middleware/requireApprovedCreator');

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
            deliveryFee, watermarkTemplate, category
        } = req.body;

        if (!title || !author || !description || !type) {
            return res.status(400).json({
                message: 'title, author, description and type are required'
            });
        }
        if (type === 'ebook' && !fileUrl) {
            return res.status(400).json({ message: 'fileUrl is required for ebooks' });
        }

        const book = new Book({
            title: String(title).trim(),
            author: String(author).trim(),
            description: String(description).trim(),
            type,
            price: Number(price) || 0,
            category: category || 'general',
            fileUrl: type === 'ebook' ? String(fileUrl || '').trim() : undefined,
            stock: type === 'hardcopy' ? (parseInt(stock) || 0) : undefined,
            thumbnail: String(thumbnail || '').trim() || undefined,
            isbn: String(isbn || '').trim() || undefined,
            deliveryFee: type === 'hardcopy' ? (parseFloat(deliveryFee) || 0) : undefined,
            watermarkTemplate: String(watermarkTemplate || '').trim() || undefined,
            // workflow
            createdBy: req.user._id,
            source: 'instructor',
            listingStatus: 'draft',
            rejectionReason: ''
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
            'deliveryFee', 'watermarkTemplate', 'category'
        ];
        allowed.forEach((key) => {
            if (req.body[key] !== undefined) book[key] = req.body[key];
        });

        // Re-opening a rejected book as draft
        if (book.listingStatus === 'rejected') {
            book.listingStatus = 'draft';
            book.rejectionReason = '';
        }

        await book.save();
        res.json(book);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ── Delete (draft / rejected only) ───────────────────────────────────────────
router.delete('/:id', auth, requireApprovedCreator, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ message: 'Book not found' });
        if (!canEdit(book, req.user._id)) return res.status(403).json({ message: 'Access denied' });
        if (!['draft', 'rejected'].includes(book.listingStatus)) {
            return res.status(400).json({ message: 'Only draft or rejected books can be deleted' });
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
