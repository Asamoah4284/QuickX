const express = require('express');
const router = express.Router();
const Advertisement = require('../models/Advertisement');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Get all active advertisements (public)
router.get('/api/advertisements', async (req, res) => {
    try {
        const advertisements = await Advertisement.find({ isActive: true })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(advertisements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin routes
// Get all advertisements (admin only)
router.get('/api/admin/advertisements', adminAuth, async (req, res) => {
    try {
        const advertisements = await Advertisement.find().sort({ createdAt: -1 });
        res.json(advertisements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new advertisement (admin only)
router.post('/api/admin/advertisements', adminAuth, async (req, res) => {
    try {
        // Check if there are already 10 active advertisements
        if (req.body.isActive) {
            const activeAds = await Advertisement.countDocuments({ isActive: true });
            if (activeAds >= 10) {
                return res.status(400).json({ message: 'Maximum number of active advertisements reached (10)' });
            }
        }

        const advertisement = new Advertisement({
            title: req.body.title,
            content: req.body.content,
            imageUrl: req.body.imageUrl,
            link: req.body.link,
            isActive: req.body.isActive
        });

        const newAdvertisement = await advertisement.save();
        res.status(201).json(newAdvertisement);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update advertisement (admin only)
router.patch('/api/admin/advertisements/:id', adminAuth, async (req, res) => {
    try {
        // If trying to set as active, check the limit
        if (req.body.isActive) {
            const activeAds = await Advertisement.countDocuments({ 
                isActive: true,
                _id: { $ne: req.params.id }
            });
            if (activeAds >= 10) {
                return res.status(400).json({ message: 'Maximum number of active advertisements reached (3)' });
            }
        }

        const advertisement = await Advertisement.findById(req.params.id);
        if (!advertisement) {
            return res.status(404).json({ message: 'Advertisement not found' });
        }

        Object.keys(req.body).forEach(key => {
            advertisement[key] = req.body[key];
        });

        const updatedAdvertisement = await advertisement.save();
        res.json(updatedAdvertisement);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete advertisement (admin only)
router.delete('/api/admin/advertisements/:id', adminAuth, async (req, res) => {
    try {
        const advertisement = await Advertisement.findById(req.params.id);
        if (!advertisement) {
            return res.status(404).json({ message: 'Advertisement not found' });
        }

        await advertisement.remove();
        res.json({ message: 'Advertisement deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 