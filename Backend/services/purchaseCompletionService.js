const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Book = require('../models/Book');
const User = require('../models/User');
const {
    validateOfferPaymentAmount,
    validateBookCartPayment,
} = require('../utils/bookOfferHelpers');
const { grantCourseAccess } = require('./coursePurchaseService');

async function validatePurchaseIntent(body, userId) {
    const itemType = body.itemType;
    const itemId = body.itemId;
    const amount = Number(body.amount);
    const items = body.items;

    if (!itemType || (itemType !== 'product' && (!Number.isFinite(amount) || amount < 0.01))) {
        throw new Error('Invalid purchase details');
    }

    if (itemType === 'course') {
        const course = await Course.findById(itemId);
        if (!course) throw new Error('Course not found');
        if (amount > Number(course.price) + 0.02 || amount < 0.01) {
            throw new Error('Invalid amount for this course');
        }
        return { itemType, itemId, amount, purchaseItem: course };
    }

    if (itemType === 'book') {
        const book = await Book.findById(itemId);
        if (!book) throw new Error('Book not found');
        const { bookPriceMatches } = require('../utils/bookPricing');
        const isMatch = bookPriceMatches(book, amount, body.shippingAddress?.deliveryType);

        if (!isMatch) {
            throw new Error('Invalid amount. Price mismatch detected.');
        }
        return { itemType, itemId, amount, purchaseItem: book };
    }

    if (itemType === 'book_cart') {
        const cartValidation = await validateBookCartPayment(items, amount);
        if (!cartValidation.ok) throw new Error(cartValidation.message || 'Invalid cart');
        return {
            itemType,
            itemId: null,
            amount,
            purchaseItem: cartValidation.books,
            cartItemIds: cartValidation.uniqueIds,
        };
    }

    if (itemType === 'book_offer') {
        const validation = await validateOfferPaymentAmount(itemId, body.offerOptionId, amount);
        if (!validation.ok) throw new Error(validation.message || 'Invalid offer');
        return {
            itemType,
            itemId,
            amount,
            purchaseItem: validation.books,
            offerOptionId: body.offerOptionId,
            offerBookIds: validation.books.map((b) => b._id),
        };
    }

    if (itemType === 'creator_subscription') {
        const instructor = await User.findById(itemId).select('_id role fullName');
        if (!instructor) throw new Error('Instructor not found');
        if (instructor.role !== 'tutor') throw new Error('This user is not a creator');
        if (String(instructor._id) === String(userId)) {
            throw new Error('Cannot subscribe to your own profile');
        }
        const { getExpectedCreatorSubscriptionCharge } = require('../constants/creatorSubscriptionPlans');
        const quote = await getExpectedCreatorSubscriptionCharge(
            instructor._id,
            body.planId,
            userId
        );
        if (quote == null || quote.amount == null) throw new Error('Unknown plan');
        if (Math.abs(Number(quote.amount) - amount) > 0.02) {
            throw new Error('Invalid amount. Price mismatch.');
        }
        return {
            itemType,
            itemId,
            amount,
            purchaseItem: instructor,
            planId: body.planId,
        };
    }

    if (itemType === 'product') {
        // The server sets the price; the amount sent by the client is ignored.
        const { quoteProduct } = require('./productService');
        const quote = await quoteProduct(itemId || body.productKey, body.couponCode);
        if (quote.amount < 0.01) throw new Error('This coupon covers the full price. Use Redeem instead.');
        return {
            itemType,
            itemId: quote.product._id,
            amount: quote.amount,
            purchaseItem: quote.product,
            productKey: quote.product.key,
            couponCode: quote.couponCode,
        };
    }

    if (itemType === 'wallet_topup') {
        if (amount < 1) throw new Error('Minimum top-up is ₵1');
        return { itemType, itemId: userId, amount, purchaseItem: null };
    }

    throw new Error('Unsupported purchase type');
}

async function buildPendingPaymentRecord(body, userId) {
    const validated = await validatePurchaseIntent(body, userId);

    // Commission is paid when the payment completes (see fulfillCompletedPayment), not here.
    const checkoutCode = String(body.referralCode || '').trim().toUpperCase();
    if (checkoutCode) {
        const codeOwner = await User.findOne({ referralCode: checkoutCode }).select('_id');
        if (codeOwner && String(codeOwner._id) === String(userId)) {
            throw new Error('Cannot use own referral code');
        }
    }

    const offerBookIds = validated.offerBookIds || [];
    const cartItemIds =
        validated.cartItemIds ||
        (validated.itemType === 'book_cart'
            ? [...new Set((Array.isArray(body.items) ? body.items : []).map(String))]
            : validated.itemType === 'book_offer'
              ? offerBookIds
              : []);

    return {
        validated,
        paymentRecord: {
            userId,
            itemType: validated.itemType,
            itemId: validated.itemType === 'book_cart' ? null : validated.itemId,
            offerOptionId: validated.offerOptionId || null,
            cartItemIds,
            subscriptionPlanId: validated.planId || '',
            productKey: validated.productKey || '',
            couponCode: validated.couponCode || '',
            // Moolre charges originalAmount; for products this is the server-quoted price.
            originalAmount: validated.amount,
            finalAmount: validated.amount,
            commissionAmount: 0,
            referringUserId: null,
            transactionId: body.transactionId,
            paymentMethod: body.paymentMethod || 'moolre',
            momoNumber: body.momoNumber,
            shippingAddress: body.shippingAddress,
            referralCode: checkoutCode,
            status: 'pending',
            createdAt: new Date(),
        },
    };
}

/** Count the sale, and take one printed copy out of stock when it is being delivered. */
async function recordBookSale(payment) {
    const ids = payment.itemType === 'book' ? [payment.itemId] : payment.cartItemIds || [];
    if (!ids.length) return;
    try {
        await Book.updateMany({ _id: { $in: ids } }, { $inc: { salesCount: 1 } });
        if (payment.shippingAddress?.deliveryType) {
            await Book.updateMany({ _id: { $in: ids }, stock: { $gt: 0 } }, { $inc: { stock: -1 } });
        }
    } catch (err) {
        console.error('book sale counters:', err.message);
    }
}

async function grantPurchasedItems(payment) {
    const userId = payment.userId;
    const itemType = payment.itemType;
    const itemId = payment.itemId;

    if (itemType === 'book' || itemType === 'book_cart' || itemType === 'book_offer') {
        const buyer = await User.findById(userId);
        if (buyer?.purchasedBooks) {
            const addBookId = (bookId) => {
                if (!bookId) return;
                const exists = buyer.purchasedBooks.some((b) => String(b) === String(bookId));
                if (!exists) buyer.purchasedBooks.push(bookId);
            };
            if (itemType === 'book') {
                addBookId(itemId);
            } else if (itemType === 'book_offer') {
                (payment.cartItemIds || []).forEach(addBookId);
            } else {
                (payment.cartItemIds || []).forEach(addBookId);
            }
            await buyer.save();
        }
        await recordBookSale(payment);
    }

    let courseAccess = null;
    if (itemType === 'course' && itemId) {
        courseAccess = await grantCourseAccess({
            userId,
            courseId: itemId,
            amount: payment.originalAmount,
            transactionId: payment.transactionId,
            paymentMethod: payment.paymentMethod || 'moolre',
        });
    }

    if (itemType === 'creator_subscription' && itemId) {
        const {
            createOrExtendFromPayment,
            enrollStudentInTutorPublishedCourses,
        } = require('./tutorSubscriptionService');
        const subscription = await createOrExtendFromPayment({
            studentId: userId,
            tutorId: itemId,
            planId: payment.subscriptionPlanId,
            paymentId: payment._id,
            transactionId: payment.transactionId,
        });
        await enrollStudentInTutorPublishedCourses(userId, itemId);
        return { courseAccess, subscription };
    }

    if (itemType === 'product' && itemId) {
        const { grantFromProductPayment } = require('./entitlementService');
        const { consumeCouponForPayment } = require('./productService');
        const entitlements = await grantFromProductPayment(payment);
        await consumeCouponForPayment(payment);
        return { courseAccess, entitlements };
    }

    if (itemType === 'wallet_topup') {
        const walletService = require('./walletService');
        const claimed = await Payment.updateOne(
            { _id: payment._id, walletCredited: { $ne: true } },
            { $set: { walletCredited: true } }
        );
        if (claimed.modifiedCount) {
            const walletBalance = await walletService.creditWallet(userId, payment.originalAmount, {
                type: 'deposit',
                label: 'Wallet top-up',
                reference: payment.transactionId,
            });
            return { courseAccess, walletBalance };
        }
        const user = await User.findById(userId).select('walletBalance').lean();
        return { courseAccess, walletBalance: Number(user?.walletBalance || 0) };
    }

    return { courseAccess };
}

/** Give the buyer what they paid for and settle referral commission. Safe to call repeatedly. */
async function fulfillCompletedPayment(payment) {
    const result = await grantPurchasedItems(payment);
    try {
        const { creditReferralForPayment } = require('./walletService');
        await creditReferralForPayment(payment);
    } catch (err) {
        console.error('Referral credit failed (purchase is unaffected):', err.message);
    }
    return result;
}

async function completePendingPaymentByTransactionId(transactionId, userId) {
    const payment = await Payment.findOne({ transactionId, userId });
    if (!payment) throw new Error('Payment not found');
    if (payment.status === 'completed') {
        const fulfillment = await fulfillCompletedPayment(payment);
        return { payment, alreadyCompleted: true, ...fulfillment };
    }
    if (payment.status === 'failed') throw new Error('Payment failed');

    payment.status = 'completed';
    await payment.save();
    const fulfillment = await fulfillCompletedPayment(payment);
    return { payment, alreadyCompleted: false, ...fulfillment };
}

module.exports = {
    recordBookSale,
    validatePurchaseIntent,
    buildPendingPaymentRecord,
    fulfillCompletedPayment,
    completePendingPaymentByTransactionId,
};
