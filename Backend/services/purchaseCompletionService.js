const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Book = require('../models/Book');
const Program = require('../models/Program');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const {
    validateOfferPaymentAmount,
    validateBookCartPayment,
} = require('../utils/bookOfferHelpers');
const { grantCourseAccess } = require('./coursePurchaseService');
const { createEnrollmentFromPayment } = require('./programEnrollmentService');

async function creditReferralCommission({ buyerId, itemId, amount, checkoutCode }) {
    const checkout = String(checkoutCode || '').trim().toUpperCase();
    let referringUser = null;

    if (checkout) {
        referringUser = await User.findOne({ referralCode: checkout });
        if (referringUser && referringUser._id.toString() === String(buyerId)) {
            throw new Error('Cannot use own referral code');
        }
    } else {
        const buyer = await User.findById(buyerId).select('referredBy');
        if (buyer?.referredBy) {
            referringUser = await User.findById(buyer.referredBy);
        }
    }

    if (!referringUser || referringUser._id.toString() === String(buyerId)) {
        return { commissionAmount: 0, finalAmount: Number(amount), referringUserId: null };
    }

    const commissionAmount = Number((Number(amount) * 0.05).toFixed(2));
    const finalAmount = Number((Number(amount) - commissionAmount).toFixed(2));

    try {
        await User.findByIdAndUpdate(
            referringUser._id,
            {
                $inc: { referralEarnings: commissionAmount },
                $push: {
                    referralHistory: {
                        referredUser: buyerId,
                        courseId: itemId,
                        amount: commissionAmount,
                        date: new Date(),
                    },
                },
            },
            { new: true }
        );
    } catch (err) {
        console.error('Referral credit failed:', err);
        return { commissionAmount: 0, finalAmount: Number(amount), referringUserId: null };
    }

    return {
        commissionAmount,
        finalAmount,
        referringUserId: referringUser._id,
    };
}

async function validatePurchaseIntent(body, userId) {
    const itemType = body.itemType;
    const itemId = body.itemId;
    const amount = Number(body.amount);
    const items = body.items;

    if (!itemType || !Number.isFinite(amount) || amount < 0.01) {
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
        if (Math.abs(Number(book.price) - amount) > 0.01) {
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

    if (itemType === 'program') {
        const program = await Program.findById(itemId);
        if (!program || !program.isActive) throw new Error('Program not found or inactive');
        if (Math.abs(Number(program.price) - amount) > 0.02) {
            throw new Error('Invalid amount. Price mismatch.');
        }
        return { itemType, itemId, amount, purchaseItem: program };
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

    if (itemType === 'wallet_topup') {
        if (amount < 1) throw new Error('Minimum top-up is ₵1');
        return { itemType, itemId: userId, amount, purchaseItem: null };
    }

    throw new Error('Unsupported purchase type');
}

async function buildPendingPaymentRecord(body, userId) {
    const validated = await validatePurchaseIntent(body, userId);
    const referral = ['course', 'book', 'book_cart', 'book_offer'].includes(validated.itemType)
        ? await creditReferralCommission({
              buyerId: userId,
              itemId: validated.itemId,
              amount: validated.amount,
              checkoutCode: body.referralCode,
          })
        : { commissionAmount: 0, finalAmount: validated.amount, referringUserId: null };

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
            originalAmount: validated.amount,
            finalAmount: referral.finalAmount,
            commissionAmount: referral.commissionAmount,
            referringUserId: referral.referringUserId,
            transactionId: body.transactionId,
            paymentMethod: body.paymentMethod || 'moolre',
            momoNumber: body.momoNumber,
            shippingAddress: body.shippingAddress,
            referralCode: body.referralCode || '',
            status: 'pending',
            createdAt: new Date(),
        },
    };
}

async function fulfillCompletedPayment(payment) {
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

    if (itemType === 'program' && itemId) {
        await createEnrollmentFromPayment({
            userId,
            programId: itemId,
            transactionId: payment.transactionId,
            paymentId: payment._id,
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

    if (itemType === 'wallet_topup') {
        const user = await User.findById(userId);
        const nextBalance = Number((Number(user.walletBalance || 0) + Number(payment.originalAmount)).toFixed(2));
        user.walletBalance = nextBalance;
        await user.save();
        await WalletTransaction.create({
            userId,
            type: 'deposit',
            amount: Number(payment.originalAmount),
            balanceAfter: nextBalance,
            label: 'Wallet top-up',
            reference: payment.transactionId,
            status: 'completed',
        });
        return { courseAccess, walletBalance: nextBalance };
    }

    return { courseAccess };
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
    validatePurchaseIntent,
    buildPendingPaymentRecord,
    fulfillCompletedPayment,
    completePendingPaymentByTransactionId,
};
