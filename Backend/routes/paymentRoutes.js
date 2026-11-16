const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const {
    validateOfferPaymentAmount,
    validateBookCartPayment,
} = require('../utils/bookOfferHelpers');
const { repairCourseAccessFromPayments } = require('../services/coursePurchaseService');
const { validatePurchaseIntent, fulfillCompletedPayment } = require('../services/purchaseCompletionService');
const paystack = require('../services/paystackService');

/**
 * Every route here that grants something first confirms the payment with
 * Paystack (reference + amount). The browser is never trusted to say "paid".
 */

const CARD_LIKE_METHODS = ['card', 'paystack', 'direct'];

function verificationStatus(verified) {
    return verified.code === 'NOT_CONFIGURED' || verified.code === 'UNAVAILABLE' ? 503 : 402;
}

// Validation middleware for payment initialization
const validatePayment = [
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0')
        .toFloat(),
    body('itemType')
        .isIn(['book', 'book_cart', 'book_offer'])
        .withMessage('Invalid item type'),
    // itemId is required for single-item purchases only
    body('itemId')
        .if(body('itemType').isIn(['course', 'book', 'book_offer']))
        .isMongoId()
        .withMessage('Invalid item ID'),
    body('offerOptionId')
        .if(body('itemType').equals('book_offer'))
        .isMongoId()
        .withMessage('Invalid offer option ID'),
    // For cart purchases, validate items[] ids
    body('items')
        .if(body('itemType').equals('book_cart'))
        .isArray({ min: 1 })
        .withMessage('items must be a non-empty array'),
    body('items.*')
        .if(body('itemType').equals('book_cart'))
        .isMongoId()
        .withMessage('Invalid book id in items'),
    body('transactionId')
        .notEmpty()
        .trim()
        .withMessage('Transaction ID is required'),
    body('paymentMethod')
        .isIn(['MTN', 'Vodafone', 'AirtelTigo', 'momo', 'paystack', 'card', 'direct'])
        .withMessage('Invalid payment method'),
    // MoMo number required only for mobile-money methods (card payments often have no phone)
    body('momoNumber')
        .if((value, { req }) => !CARD_LIKE_METHODS.includes(String(req.body.paymentMethod || '')))
        .matches(/^0\d{9}$/)
        .withMessage('Invalid mobile money number format. Must start with 0 and be 10 digits'),
    body('momoNumber')
        .if((value, { req }) => CARD_LIKE_METHODS.includes(String(req.body.paymentMethod || '')))
        .optional({ nullable: true, checkFalsy: true }),
    body('referralCode')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('referralCode').notEmpty())
        .isAlphanumeric()
        .isLength({ min: 6, max: 6 })
        .withMessage('Invalid referral code format'),
    body('shippingAddress')
        .isObject()
        .withMessage('Shipping address must be an object'),
    body('shippingAddress.email')
        .isEmail()
        .withMessage('Valid email is required in shipping address'),
    body('shippingAddress.phone')
        .if((value, { req }) => !CARD_LIKE_METHODS.includes(String(req.body.paymentMethod || '')))
        .matches(/^0\d{9}$/)
        .withMessage('Valid phone number is required in shipping address'),
    body('shippingAddress.phone')
        .if((value, { req }) => CARD_LIKE_METHODS.includes(String(req.body.paymentMethod || '')))
        .optional({ nullable: true, checkFalsy: true }),
    body('currency')
        .equals('GHS')
        .withMessage('Currency must be GHS')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    if (req.body.referralCode === '') {
        delete req.body.referralCode;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', {
            body: req.body,
            errors: errors.array()
        });
        return res.status(400).json({ 
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    next();
};


const RETIRED_MESSAGE =
    'This is no longer sold on its own. Choose a plan on the pricing page to get access.';

/** Single-course, subscription-tier and creator-program checkouts were replaced by plans. */
router.post('/initialize-creator-subscription', auth, (req, res) => {
    res.status(410).json({ message: RETIRED_MESSAGE, code: 'USE_PLANS' });
});
router.post('/initialize-program', auth, (req, res) => {
    res.status(410).json({ message: RETIRED_MESSAGE, code: 'USE_PLANS' });
});

/**
 * Record a book purchase paid through Paystack (signed-in buyers).
 * The Paystack reference is confirmed, and the amount checked against the
 * book price, before the books are added to the account.
 */
router.post(
    '/initialize',
    auth,
    (req, res, next) => {
        if (req.body?.itemType === 'course') {
            return res.status(410).json({ message: RETIRED_MESSAGE, code: 'USE_PLANS' });
        }
        next();
    },
    validatePayment,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { transactionId, paymentMethod, momoNumber, shippingAddress } = req.body;

            // The same reference again: re-deliver to its owner, refuse anyone else.
            const existing = await Payment.findOne({ transactionId });
            if (existing) {
                if (String(existing.userId) !== String(req.user._id) || existing.status !== 'completed') {
                    return res.status(409).json({ message: 'This payment reference has already been used' });
                }
                const result = await fulfillCompletedPayment(existing);
                return res.json({
                    success: true,
                    message: 'Payment already recorded',
                    alreadyRecorded: true,
                    courseAccessGranted: Boolean(result.courseAccess),
                });
            }

            let validated;
            try {
                validated = await validatePurchaseIntent(req.body, req.user._id);
            } catch (err) {
                return res.status(400).json({ message: err.message });
            }

            const referralCode = String(req.body.referralCode || '').trim().toUpperCase();
            if (referralCode && referralCode === String(req.user.referralCode || '').toUpperCase()) {
                return res.status(400).json({ message: 'Cannot use own referral code' });
            }

            const verified = await paystack.verifyPayment(transactionId, validated.amount);
            if (!verified.ok) {
                return res.status(verificationStatus(verified)).json({ message: verified.message, code: verified.code });
            }

            const offerBookIds = validated.offerBookIds || [];
            const payment = await Payment.create({
                userId: req.user._id,
                itemType: validated.itemType,
                itemId: validated.itemType === 'book_cart' ? null : validated.itemId,
                offerOptionId: validated.offerOptionId || null,
                cartItemIds: validated.cartItemIds || offerBookIds,
                originalAmount: validated.amount,
                finalAmount: validated.amount,
                commissionAmount: 0,
                referringUserId: null,
                transactionId,
                paymentMethod,
                momoNumber,
                shippingAddress,
                referralCode,
                status: 'completed',
            });

            await fulfillCompletedPayment(payment);

            res.json({
                success: true,
                message: 'Payment recorded',
                courseAccessGranted: false,
                payment: {
                    transactionId: payment.transactionId,
                    itemType: payment.itemType,
                    amount: payment.finalAmount,
                    status: payment.status,
                },
            });
        } catch (error) {
            console.error('Payment initialization error:', error);
            res.status(500).json({ message: 'Failed to process payment' });
        }
    }
);

/** Guest ebook checkout (no account), books only */
router.post('/initialize-guest', validatePayment, handleValidationErrors, async (req, res) => {
    try {
        const {
            itemType,
            itemId,
            amount,
            transactionId,
            paymentMethod,
            momoNumber,
            shippingAddress,
            items,
        } = req.body;

        if (!['book', 'book_cart', 'book_offer'].includes(itemType)) {
            return res.status(400).json({ message: 'Guest checkout is only available for ebook purchases' });
        }

        const guestEmail = String(shippingAddress?.email || '').trim().toLowerCase();
        if (!guestEmail) {
            return res.status(400).json({ message: 'Email is required for guest checkout' });
        }

        const existing = await Payment.findOne({ transactionId, status: 'completed' });
        if (existing) {
            return res.json({
                success: true,
                message: 'Payment already recorded',
                payment: { transactionId: existing.transactionId, itemType: existing.itemType },
            });
        }

        if (await Payment.exists({ transactionId })) {
            return res.status(409).json({ message: 'This payment reference has already been used' });
        }

        const verified = await paystack.verifyPayment(transactionId, amount);
        if (!verified.ok) {
            return res.status(verificationStatus(verified)).json({ message: verified.message, code: verified.code });
        }

        let purchaseItem;
        const finalAmount = Number(amount);

        if (itemType === 'book') {
            purchaseItem = await Book.findById(itemId);
            if (!purchaseItem) {
                return res.status(404).json({ message: 'Book not found' });
            }
            const { bookPriceMatches } = require('../utils/bookPricing');
            const deliveryType = req.body.shippingAddress?.deliveryType;
            if (purchaseItem.type !== 'ebook' && !deliveryType) {
                return res.status(400).json({ message: 'Add a delivery address to order a printed copy' });
            }
            if (!bookPriceMatches(purchaseItem, finalAmount, deliveryType)) {
                return res.status(400).json({
                    message: 'Invalid amount. Price mismatch detected.',
                    expected: purchaseItem.price,
                    received: finalAmount,
                });
            }
        } else if (itemType === 'book_cart') {
            const cartValidation = await validateBookCartPayment(items, finalAmount, {
                requireEbook: true,
            });
            if (!cartValidation.ok) {
                return res.status(cartValidation.message.includes('not found') ? 404 : 400).json({
                    message: cartValidation.message,
                    expected: cartValidation.expected,
                    received: cartValidation.received,
                });
            }
            purchaseItem = cartValidation.books;
            req._bookCartUniqueIds = cartValidation.uniqueIds;
        } else {
            const { offerOptionId } = req.body;
            const validation = await validateOfferPaymentAmount(
                itemId,
                offerOptionId,
                finalAmount
            );
            if (!validation.ok) {
                return res.status(400).json({
                    message: validation.message,
                    expected: validation.expected,
                    received: validation.received,
                });
            }
            purchaseItem = validation.books;
        }

        const guestCartIds =
            itemType === 'book'
                ? []
                : Array.isArray(purchaseItem)
                  ? purchaseItem.map((b) => b._id)
                  : [];

        const paymentRecord = {
            guestEmail,
            itemType,
            itemId: itemType === 'book_cart' ? null : itemId,
            offerOptionId: itemType === 'book_offer' ? req.body.offerOptionId : null,
            cartItemIds:
                itemType === 'book_cart'
                    ? req._bookCartUniqueIds || [...new Set((Array.isArray(items) ? items : []).map(String))]
                    : itemType === 'book_offer'
                      ? guestCartIds
                      : [],
            originalAmount: finalAmount,
            finalAmount,
            commissionAmount: 0,
            transactionId,
            paymentMethod,
            momoNumber,
            shippingAddress,
            referralCode: '',
            status: 'completed',
            createdAt: new Date(),
        };

        const payment = await Payment.create(paymentRecord);
        await require('../services/purchaseCompletionService').recordBookSale(payment);

        res.json({
            success: true,
            message: 'Guest payment recorded',
            payment: {
                transactionId: payment.transactionId,
                itemType: payment.itemType,
                guestEmail: payment.guestEmail,
            },
        });
    } catch (error) {
        console.error('initialize-guest error:', error);
        res.status(500).json({ message: 'Failed to process guest payment', error: error.message });
    }
});

/** Retrieve download links for a completed guest ebook purchase */
router.get('/guest-download/:transactionId', async (req, res) => {
    try {
        const transactionId = String(req.params.transactionId || '').trim();
        const email = String(req.query.email || '').trim().toLowerCase();

        if (!transactionId) {
            return res.status(400).json({ message: 'Payment reference is required' });
        }

        const payment = await Payment.findOne({
            transactionId,
            status: 'completed',
            itemType: { $in: ['book', 'book_cart', 'book_offer'] },
        });

        if (!payment) {
            return res.status(404).json({ message: 'Purchase not found or payment incomplete' });
        }

        const paymentEmail = String(payment.guestEmail || payment.shippingAddress?.email || '')
            .trim()
            .toLowerCase();
        if (paymentEmail && email && paymentEmail !== email) {
            return res.status(403).json({ message: 'Email does not match this purchase' });
        }

        let bookIds = [];
        if (payment.itemType === 'book' && payment.itemId) {
            bookIds = [payment.itemId];
        } else if (payment.itemType === 'book_cart' || payment.itemType === 'book_offer') {
            bookIds = Array.isArray(payment.cartItemIds) ? payment.cartItemIds : [];
        }

        if (!bookIds.length) {
            return res.status(404).json({ message: 'No books found for this purchase' });
        }

        const { resolveDownloadThumbnails } = require('../utils/bookOfferHelpers');

        const books = await Book.find({ _id: { $in: bookIds } }).select(
            'title author thumbnail fileUrl type offerGroupId'
        );

        const downloadable = await resolveDownloadThumbnails(
            books.filter((b) => b.type === 'ebook' && b.fileUrl),
            {
                offerGroupId:
                    payment.itemType === 'book_offer' ? payment.itemId : null,
                offerOptionId: payment.offerOptionId || null,
            }
        );

        if (!downloadable.length) {
            return res.status(404).json({
                message: 'Download file is not available yet. Please contact support.',
            });
        }

        res.json({
            success: true,
            transactionId: payment.transactionId,
            email: paymentEmail || email,
            books: downloadable,
        });
    } catch (error) {
        console.error('guest-download error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/** Status of one of the signed-in user's own payments. */
router.get('/verify/:paymentId', auth, async (req, res) => {
    try {
        const payment = await Payment.findOne({ _id: req.params.paymentId, userId: req.user._id });
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json({ status: payment.status, transactionId: payment.transactionId });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

/** Restore course access for course payments that completed before plans replaced them. */
router.post('/repair-course-access', auth, async (req, res) => {
    try {
        const result = await repairCourseAccessFromPayments(req.user._id);
        res.json({
            success: true,
            message:
                result.repaired > 0
                    ? `Restored access to ${result.repaired} course(s).`
                    : 'No missing course access found.',
            ...result,
        });
    } catch (error) {
        console.error('repair-course-access error:', error);
        res.status(500).json({ message: 'Could not repair course access' });
    }
});

module.exports = router;
