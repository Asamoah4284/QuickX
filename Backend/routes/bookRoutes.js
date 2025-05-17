const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all books (public)
router.get('/', async (req, res) => {
    try {
        const { type, search } = req.query;
        let query = {};
        
        if (type) {
            query.type = type;
        }
        
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const books = await Book.find(query)
            .select('title author price type stock thumbnail description reviews fileUrl'); // Include fileUrl for downloads
            
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single book details (public preview)
router.get('/:id/preview', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
            .select('title author price type stock thumbnail description reviews fileUrl'); // Include fileUrl for downloads
            
        if (!book) {
            return res.status(404).json({ message: 'Book not found' });
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