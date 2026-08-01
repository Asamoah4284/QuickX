const express = require('express');
const axios = require('axios');
const router = express.Router();
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Book = require('../models/Book');
const auth = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');
const User = require('../models/User');
const Program = require('../models/Program');
const { body, validationResult } = require('express-validator');
const { createEnrollmentFromPayment } = require('../services/programEnrollmentService');
const { getExpectedCreatorSubscriptionCharge } = require('../constants/creatorSubscriptionPlans');
const {
    validateOfferPaymentAmount,
    validateBookCartPayment,
} = require('../utils/bookOfferHelpers');
const {
    grantCourseAccess,
    repairCourseAccessFromPayments,
} = require('../services/coursePurchaseService');

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const CARD_LIKE_METHODS = ['card', 'paystack', 'direct'];

async function verifyPaystackTransaction(transactionId) {
    if (!paystackSecretKey || !/^sk_(test|live)_/.test(paystackSecretKey)) {
        console.warn('PAYSTACK_SECRET_KEY missing or invalid — skipping Paystack verification');
        return true;
    }
    const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(transactionId)}`,
        {
            headers: {
                Authorization: `Bearer ${paystackSecretKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        }
    );
    return Boolean(response.data?.status && response.data?.data?.status === 'success');
}

/** Same trust model as POST /initialize: client succeeded via Paystack; verify only when secret key is valid. */
async function verifyPaystackIfConfigured(transactionId) {
    if (!paystackSecretKey || !/^sk_(test|live)_/.test(paystackSecretKey)) {
        return true;
    }
    try {
        return await verifyPaystackTransaction(transactionId);
    } catch (err) {
        const status = err.response?.status;
        console.warn('Paystack verify skipped after error:', status || err.message);
        if (process.env.NODE_ENV === 'production' && status === 401) {
            return false;
        }
        return true;
    }
}

// Validation middleware for payment initialization
const validatePayment = [
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0')
        .toFloat(),
    body('itemType')
        .isIn(['course', 'book', 'book_cart', 'book_offer'])
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

const validateCreatorSubscriptionPayment = [
    body('instructorId').isMongoId().withMessage('Invalid instructor ID'),
    body('planId')
        .isIn(['basic', 'premium', 'premium_plus', 'diamond', '1m', '2m', '3m', '1y'])
        .withMessage('Invalid subscription plan'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0')
        .toFloat(),
    body('transactionId')
        .notEmpty()
        .trim()
        .withMessage('Transaction ID is required'),
    body('paymentMethod')
        .isIn(['MTN', 'Vodafone', 'AirtelTigo', 'momo', 'paystack', 'card', 'direct'])
        .withMessage('Invalid payment method'),
    body('momoNumber')
        .matches(/^0\d{9}$/)
        .withMessage('Invalid mobile money number format'),
    body('shippingAddress')
        .isObject()
        .withMessage('Shipping address must be an object'),
    body('shippingAddress.email')
        .isEmail()
        .withMessage('Valid email is required'),
    body('shippingAddress.phone')
        .matches(/^0\d{9}$/)
        .withMessage('Valid phone number is required in shipping address'),
    body('currency')
        .equals('GHS')
        .withMessage('Currency must be GHS'),
];

const validateProgramPayment = [
    body('programId').isMongoId().withMessage('Invalid program ID'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0')
        .toFloat(),
    body('transactionId')
        .notEmpty()
        .trim()
        .withMessage('Transaction ID is required'),
    body('paymentMethod')
        .isIn(['MTN', 'Vodafone', 'AirtelTigo', 'momo', 'paystack', 'card', 'direct'])
        .withMessage('Invalid payment method'),
    body('momoNumber')
        .matches(/^0\d{9}$/)
        .withMessage('Invalid mobile money number format'),
    body('shippingAddress')
        .isObject()
        .withMessage('Shipping address must be an object'),
    body('shippingAddress.email')
        .isEmail()
        .withMessage('Valid email is required'),
    body('shippingAddress.phone')
        .matches(/^0\d{9}$/)
        .withMessage('Valid phone number is required in shipping address'),
    body('currency')
        .equals('GHS')
        .withMessage('Currency must be GHS')
];

/** Subscriber payment to a creator (instructor) — records payment; itemId is the instructor user id */
router.post(
    '/initialize-creator-subscription',
    auth,
    validateCreatorSubscriptionPayment,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { instructorId, planId, amount, transactionId, paymentMethod, momoNumber, shippingAddress } =
                req.body;

            if (req.user._id.toString() === String(instructorId)) {
                return res.status(400).json({ message: 'Cannot subscribe to your own profile' });
            }

            const instructor = await User.findById(instructorId).select('_id role fullName');
            if (!instructor) {
                return res.status(404).json({ message: 'Instructor not found' });
            }
            if (instructor.role !== 'tutor') {
                return res.status(400).json({ message: 'This user is not a creator' });
            }

            const quote = await getExpectedCreatorSubscriptionCharge(
                instructor._id,
                planId,
                req.user._id
            );
            if (quote == null || quote.amount == null) {
                return res.status(400).json({ message: 'Unknown plan' });
            }

            const finalAmount = Number(amount);
            if (Math.abs(Number(quote.amount) - finalAmount) > 0.02) {
                return res.status(400).json({
                    message: 'Invalid amount. Price mismatch.',
                    expected: quote.amount,
                    received: finalAmount,
                    listPrice: quote.listPrice,
                    credit: quote.credit,
                    isUpgrade: quote.isUpgrade,
                });
            }

            const paymentRecord = {
                userId: req.user._id,
                itemType: 'creator_subscription',
                itemId: instructor._id,
                subscriptionPlanId: planId,
                originalAmount: finalAmount,
                finalAmount: finalAmount,
                commissionAmount: 0,
                referringUserId: null,
                transactionId,
                paymentMethod,
                momoNumber,
                shippingAddress,
                referralCode: '',
                status: 'completed',
                createdAt: new Date(),
            };

            const payment = new Payment(paymentRecord);
            await payment.save();

            const {
                createOrExtendFromPayment,
                enrollStudentInTutorPublishedCourses,
            } = require('../services/tutorSubscriptionService');
            const subscription = await createOrExtendFromPayment({
                studentId: req.user._id,
                tutorId: instructor._id,
                planId,
                paymentId: payment._id,
                transactionId,
            });

            await enrollStudentInTutorPublishedCourses(req.user._id, instructor._id);

            res.json({
                success: true,
                message: 'Creator subscription payment recorded',
                payment: {
                    ...paymentRecord,
                    instructor: {
                        id: instructor._id,
                        fullName: instructor.fullName,
                    },
                },
                subscription: {
                    id: subscription._id,
                    planId: subscription.planId,
                    startsAt: subscription.startsAt,
                    endsAt: subscription.endsAt,
                    status: subscription.status,
                },
            });
        } catch (error) {
            console.error('initialize-creator-subscription error:', error);
            res.status(500).json({
                message: 'Failed to process creator subscription payment',
                error: error.message,
            });
        }
    }
);

/** Program enrollment payment (creator program SKU) — completes enrollment after Paystack success */
router.post('/initialize-program', auth, validateProgramPayment, handleValidationErrors, async (req, res) => {
    try {
        const { programId, amount, transactionId, paymentMethod, momoNumber, shippingAddress } = req.body;

        const program = await Program.findById(programId);
        if (!program || !program.isActive) {
            return res.status(404).json({ message: 'Program not found or inactive' });
        }

        const finalAmount = Number(amount);
        if (Math.abs(program.price - finalAmount) > 0.02) {
            return res.status(400).json({
                message: 'Invalid amount. Price mismatch.',
                expected: program.price,
                received: finalAmount
            });
        }

        const paymentRecord = {
            userId: req.user._id,
            itemType: 'program',
            itemId: program._id,
            originalAmount: finalAmount,
            finalAmount: finalAmount,
            commissionAmount: 0,
            referringUserId: null,
            transactionId,
            paymentMethod,
            momoNumber,
            shippingAddress,
            referralCode: '',
            status: 'completed',
            createdAt: new Date()
        };

        const payment = new Payment(paymentRecord);
        await payment.save();

        await createEnrollmentFromPayment({
            userId: req.user._id,
            programId: program._id,
            transactionId,
            paymentId: payment._id
        });

        res.json({
            success: true,
            message: 'Program enrollment completed',
            payment: {
                ...paymentRecord,
                program: {
                    id: program._id,
                    name: program.name,
                    slug: program.slug,
                    courseType: program.courseType
                }
            }
        });
    } catch (error) {
        console.error('initialize-program error:', error);
        res.status(500).json({
            message: 'Failed to process program payment',
            error: error.message
        });
    }
});

// Initialize payment and process referral
router.post('/initialize', auth, validatePayment, handleValidationErrors, async (req, res) => {
    try {
        console.log('Received payment initialization request:', {
            body: req.body,
            user: req.user._id
        });

        const { 
            itemType, 
            itemId, 
            amount, 
            transactionId, 
            referralCode,
            paymentMethod,
            momoNumber,
            shippingAddress,
            currency,
            items
        } = req.body;

        // Idempotent: same Paystack reference already completed — re-grant access if needed
        const existingByTxn = await Payment.findOne({ transactionId, status: 'completed' });
        if (existingByTxn) {
            if (
                existingByTxn.itemType === 'course' &&
                existingByTxn.itemId &&
                String(existingByTxn.userId) === String(req.user._id)
            ) {
                await grantCourseAccess({
                    userId: req.user._id,
                    courseId: existingByTxn.itemId,
                    amount: existingByTxn.finalAmount ?? existingByTxn.originalAmount,
                    transactionId: existingByTxn.transactionId,
                    paymentMethod: existingByTxn.paymentMethod || paymentMethod,
                });
            }
            return res.json({
                success: true,
                message: 'Payment already recorded',
                alreadyRecorded: true,
                courseAccessGranted: existingByTxn.itemType === 'course',
            });
        }

        // Validate the purchase item exists and verify price
        let purchaseItem;
        let finalAmount = Number(amount); // Original amount
        let commissionAmount = 0;
        let referringUserId = null;

        if (itemType === 'course') {
            purchaseItem = await Course.findById(itemId);
            if (!purchaseItem) {
                return res.status(404).json({ message: 'Course not found' });
            }
            // Allow amount ≤ list price (coupons reduce price on the client; full verification would need coupon API).
            if (finalAmount > Number(purchaseItem.price) + 0.02 || finalAmount < 0.01) {
                return res.status(400).json({
                    message: 'Invalid amount for this course.',
                    max: purchaseItem.price,
                    received: finalAmount
                });
            }
        } else if (itemType === 'book') {
            purchaseItem = await Book.findById(itemId);
            if (!purchaseItem) {
                return res.status(404).json({ message: 'Book not found' });
            }
            
            // Verify the amount matches the book price (with small tolerance for floating point)
            const priceDiff = Math.abs(purchaseItem.price - finalAmount);
            if (priceDiff > 0.01) {
                return res.status(400).json({ 
                    message: 'Invalid amount. Price mismatch detected.',
                    expected: purchaseItem.price,
                    received: finalAmount,
                    difference: priceDiff
                });
            }
        } else if (itemType === 'book_cart') {
            const cartValidation = await validateBookCartPayment(items, finalAmount);
            if (!cartValidation.ok) {
                return res.status(400).json({
                    message: cartValidation.message,
                    expected: cartValidation.expected,
                    received: cartValidation.received,
                    difference: cartValidation.difference,
                });
            }
            purchaseItem = cartValidation.books;
            req._bookCartUniqueIds = cartValidation.uniqueIds;
        } else if (itemType === 'book_offer') {
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

        // Process referral if code provided
        if (referralCode) {
            const referringUser = await User.findOne({ referralCode });
            
            if (referringUser) {
                // Prevent self-referral
                if (referringUser._id.toString() === req.user._id.toString()) {
                    return res.status(400).json({ message: 'Cannot use own referral code' });
                }

                // Calculate commission (10% of original amount)
                commissionAmount = Number((amount * 0.10).toFixed(2));
                // Calculate final amount after commission
                finalAmount = Number((amount - commissionAmount).toFixed(2));
                referringUserId = referringUser._id;

                try {
                    await User.findByIdAndUpdate(
                        referringUser._id,
                        {
                            $inc: { referralEarnings: commissionAmount },
                            $push: {
                                referralHistory: {
                                    referredUser: req.user._id,
                                    courseId: itemId,
                                    amount: commissionAmount,
                                    date: new Date()
                                }
                            }
                        },
                        { new: true }
                    );
                    console.log(`Referral commission of ${commissionAmount} credited to user ${referringUser._id}`);
                } catch (referralErr) {
                    console.error('Referral credit failed (payment will still complete):', referralErr);
                    commissionAmount = 0;
                    finalAmount = Number(amount);
                    referringUserId = null;
                }
            }
        }

        // Create payment record with commission details
        const offerBookIds =
            itemType === 'book_offer' && Array.isArray(purchaseItem)
                ? purchaseItem.map((b) => b._id)
                : [];

        const paymentRecord = {
            userId: req.user._id,
            itemType,
            itemId: itemType === 'book_cart' ? null : itemId,
            offerOptionId: itemType === 'book_offer' ? req.body.offerOptionId : null,
            cartItemIds:
                itemType === 'book_cart'
                    ? req._bookCartUniqueIds || [...new Set((Array.isArray(items) ? items : []).map(String))]
                    : itemType === 'book_offer'
                      ? offerBookIds
                      : [],
            originalAmount: Number(amount),
            finalAmount: finalAmount,
            commissionAmount: commissionAmount,
            referringUserId: referringUserId,
            transactionId,
            paymentMethod,
            momoNumber,
            shippingAddress,
            referralCode: referralCode || '',
            status: 'completed',
            createdAt: new Date()
        };

        // Save payment record to database
        const payment = new Payment(paymentRecord);
        await payment.save();

        if (itemType === 'book' || itemType === 'book_cart' || itemType === 'book_offer') {
            const buyer = await User.findById(req.user._id);
            if (buyer?.purchasedBooks) {
                const addBookId = (bookId) => {
                    if (!bookId) return;
                    const exists = buyer.purchasedBooks.some((b) => String(b) === String(bookId));
                    if (!exists) buyer.purchasedBooks.push(bookId);
                };
                if (itemType === 'book') {
                    addBookId(itemId);
                } else if (itemType === 'book_offer') {
                    offerBookIds.forEach(addBookId);
                } else {
                    const ids = Array.isArray(items) ? items : [];
                    ids.forEach(addBookId);
                }
                await buyer.save();
            }
        }

        // Courses: grant Purchase + Enrollment in the same request (do not rely on a second frontend call)
        let courseAccess = null;
        if (itemType === 'course' && itemId) {
            courseAccess = await grantCourseAccess({
                userId: req.user._id,
                courseId: itemId,
                amount: Number(amount),
                transactionId,
                paymentMethod: paymentMethod || 'paystack',
            });
        }

        console.log('Payment record:', {
            ...paymentRecord,
            breakdown: {
                original: amount,
                commission: commissionAmount,
                final: finalAmount
            }
        });

        res.json({ 
            success: true, 
            message: 'Payment initialized successfully',
            courseAccessGranted: Boolean(courseAccess),
            courseAccess,
            payment: {
                ...paymentRecord,
                breakdown: {
                    originalAmount: amount,
                    commissionAmount: commissionAmount,
                    finalAmount: finalAmount
                }
            }
        });
    } catch (error) {
        console.error('Payment initialization error:', error);
        res.status(500).json({ 
            message: 'Failed to process payment', 
            error: error.message 
        });
    }
});

/** Guest ebook checkout (no account) — books only */
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

        const paystackOk = await verifyPaystackIfConfigured(transactionId);
        if (!paystackOk) {
            return res.status(400).json({ message: 'Payment was not successful' });
        }

        let purchaseItem;
        const finalAmount = Number(amount);

        if (itemType === 'book') {
            purchaseItem = await Book.findById(itemId);
            if (!purchaseItem) {
                return res.status(404).json({ message: 'Book not found' });
            }
            if (purchaseItem.type !== 'ebook') {
                return res.status(400).json({ message: 'Guest checkout is only for digital ebooks' });
            }
            const priceDiff = Math.abs(purchaseItem.price - finalAmount);
            if (priceDiff > 0.01) {
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

// Verify payment status
router.get('/verify/:paymentId', auth, async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.paymentId);
        
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Here you would check the payment status with your payment provider
        // For this example, we'll just return the current status
        res.json({
            status: payment.status,
            transactionId: payment.transactionId
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Webhook for payment provider callbacks
router.post('/webhook', async (req, res) => {
    try {
        // Verify webhook signature/authenticity
        
        const { paymentId, status, transactionId } = req.body;
        
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        payment.status = status;
        payment.transactionId = transactionId;
        await payment.save();

        // If payment is completed, update user's purchases or program enrollment
        if (status === 'completed') {
            if (payment.itemType === 'program') {
                await createEnrollmentFromPayment({
                    userId: payment.userId,
                    programId: payment.itemId,
                    transactionId: transactionId || payment.transactionId,
                    paymentId: payment._id
                });
            } else if (payment.userId) {
                const user = await User.findById(payment.userId);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                if (payment.itemType === 'course' && payment.itemId) {
                    await grantCourseAccess({
                        userId: user._id,
                        courseId: payment.itemId,
                        amount: payment.finalAmount ?? payment.originalAmount,
                        transactionId: payment.transactionId,
                        paymentMethod: payment.paymentMethod || 'paystack',
                    });
                } else if (payment.itemType === 'book' && user.purchasedBooks && Array.isArray(user.purchasedBooks)) {
                    user.purchasedBooks.push(payment.itemId);
                } else if (
                    (payment.itemType === 'book_cart' || payment.itemType === 'book_offer') &&
                    user.purchasedBooks &&
                    Array.isArray(user.purchasedBooks)
                ) {
                    const ids = Array.isArray(payment.cartItemIds) ? payment.cartItemIds : [];
                    for (const id of ids) {
                        if (!user.purchasedBooks.some((b) => String(b) === String(id))) {
                            user.purchasedBooks.push(id);
                        }
                    }
                }

                await user.save();
            }
        }

        res.json({ message: 'Webhook processed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/payments/repair-course-access
// @desc    Grant missing Purchase/Enrollment for completed course Payments
// @access  Private
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
        res.status(500).json({
            message: 'Could not repair course access',
            error: error.message,
        });
    }
});

// @route   POST /api/payments/verify
// @desc    Verify a Paystack payment for a single module
// @access  Public
router.post('/verify', paymentController.verifyPayment);

// @route   POST /api/payments/verify-bundle
// @desc    Verify a Paystack payment for a bundle purchase
// @access  Public
router.post('/verify-bundle', paymentController.verifyBundlePayment);

module.exports = router;