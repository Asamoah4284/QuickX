const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Get all coupons (admin only)
router.get('/admin/coupons', adminAuth, async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching coupons', error: error.message });
    }
});

// Create new coupon (admin only)
router.post('/admin/coupons', adminAuth, async (req, res) => {
    try {
        const { code, discount, validUntil, maxUses } = req.body;

        // Check if coupon code already exists
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

        const coupon = new Coupon({
            code: code.toUpperCase(),
            discount,
            validUntil,
            maxUses,
            isActive: true
        });

        await coupon.save();
        res.status(201).json(coupon);
    } catch (error) {
        res.status(500).json({ message: 'Error creating coupon', error: error.message });
    }
});

// Delete coupon (admin only)
router.delete('/admin/coupons/:id', adminAuth, async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }
        res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting coupon', error: error.message });
    }
});

// Validate coupon (public)
router.post('/validate-coupon', async (req, res) => {
    try {
        const { code, price } = req.body;
        
        // First, find and validate the coupon in the database
        const coupon = await Coupon.findOne({ 
            code: code.toUpperCase(),
            isActive: true
        });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        // Check if coupon is expired
        if (new Date(coupon.validUntil) < new Date()) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        // Check if coupon has reached maximum uses
        if (coupon.uses >= coupon.maxUses) {
            return res.status(400).json({ message: 'Coupon has reached maximum uses' });
        }

        res.json({
            valid: true,
            discount: coupon.discount,
            couponId: coupon._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Error validating coupon', error: error.message });
    }
});

// Apply coupon (authenticated users)
router.post('/apply-coupon', auth, async (req, res) => {
    try {
        const { couponId } = req.body;
        
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Increment uses count
        coupon.uses += 1;
        
        // If max uses reached, deactivate coupon
        if (coupon.uses >= coupon.maxUses) {
            coupon.isActive = false;
        }

        await coupon.save();
        res.json({ message: 'Coupon applied successfully', discount: coupon.discount });
    } catch (error) {
        res.status(500).json({ message: 'Error applying coupon', error: error.message });
    }
});

module.exports = router; 