const Purchase = require('../models/Purchase');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Course = require('../models/Course');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const Payment = require('../models/Payment');
const PlatformSetting = require('../models/PlatformSetting');

function resolveCourseTutorId(course) {
  if (!course) return null;
  const instructor = course.instructor;
  if (instructor && typeof instructor === 'object' && instructor._id) return instructor._id;
  return instructor || null;
}

async function buildTransactionRecord({ course, userId, amount, paymentReference = '' }) {
  const settings = await PlatformSetting.findOne().sort({ createdAt: -1 });
  const commissionRate = Number(settings?.commissionRate || 15);
  const gross = Number(amount || 0);
  const platformCommission =
    course.source === 'user' ? Number(((gross * commissionRate) / 100).toFixed(2)) : 0;
  const tutorEarning = Number((gross - platformCommission).toFixed(2));

  return {
    studentId: userId,
    tutorId: resolveCourseTutorId(course),
    courseId: course._id,
    amount: gross,
    platformCommission,
    tutorEarning: course.source === 'user' ? tutorEarning : 0,
    status: 'completed',
    paymentReference,
  };
}

/**
 * Idempotently grant course access after a successful payment.
 * Creates Purchase + Enrollment + User.purchasedCourses (+ forex books / ledger when needed).
 */
async function grantCourseAccess({
  userId,
  courseId,
  amount,
  transactionId,
  paymentMethod = 'paystack',
}) {
  if (!userId || !courseId) {
    throw new Error('userId and courseId are required');
  }

  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }

  let purchase = await Purchase.findOne({
    userId,
    courseId: course._id,
    status: 'completed',
  });

  let createdPurchase = false;
  if (!purchase) {
    try {
      purchase = await Purchase.create({
        userId,
        courseId: course._id,
        amount: Number(amount) || Number(course.price) || 0,
        status: 'completed',
        paymentMethod: paymentMethod || 'paystack',
        transactionId: transactionId || '',
      });
      createdPurchase = true;
    } catch (err) {
      // Race on unique (userId, courseId)
      if (err?.code === 11000) {
        purchase = await Purchase.findOne({
          userId,
          courseId: course._id,
          status: 'completed',
        });
      } else {
        throw err;
      }
    }
  } else if (transactionId && !purchase.transactionId) {
    purchase.transactionId = transactionId;
    await purchase.save().catch(() => {});
  }

  if (createdPurchase) {
    try {
      course.totalStudents = Number(course.totalStudents || 0) + 1;
      await course.save();
    } catch (courseErr) {
      console.error('grantCourseAccess: student count update failed:', courseErr.message);
    }
  }

  await Enrollment.findOneAndUpdate(
    { studentId: userId, courseId: course._id },
    {
      $setOnInsert: {
        studentId: userId,
        courseId: course._id,
        enrolledAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  await User.findByIdAndUpdate(userId, {
    $addToSet: { purchasedCourses: course._id },
  });

  if (course.courseType === 'forex') {
    try {
      const forexBooks = await Book.find({ category: 'forex', type: 'ebook' }).select('_id');
      if (forexBooks.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $addToSet: { purchasedBooks: { $each: forexBooks.map((b) => b._id) } },
        });
      }
    } catch (forexErr) {
      console.error('grantCourseAccess: forex books failed:', forexErr.message);
    }
  }

  if (transactionId) {
    const existingTxn = await Transaction.findOne({
      studentId: userId,
      courseId: course._id,
      paymentReference: transactionId,
    });
    if (!existingTxn) {
      try {
        const transactionRecord = await buildTransactionRecord({
          course,
          userId,
          amount: Number(amount) || Number(course.price) || 0,
          paymentReference: transactionId,
        });
        await Transaction.create(transactionRecord);
      } catch (txnErr) {
        console.error('grantCourseAccess: transaction ledger failed:', txnErr.message);
      }
    }
  }

  return {
    courseId: course._id,
    purchaseId: purchase?._id,
    createdPurchase,
  };
}

/**
 * Find completed course Payments that never got Purchase/Enrollment and grant access.
 * Returns number of courses repaired.
 */
async function repairCourseAccessFromPayments(userId) {
  if (!userId) return { repaired: 0, courseIds: [] };

  const payments = await Payment.find({
    userId,
    itemType: 'course',
    status: 'completed',
    itemId: { $ne: null },
  }).select('itemId finalAmount originalAmount transactionId paymentMethod');

  if (!payments.length) return { repaired: 0, courseIds: [] };

  const courseIds = [...new Set(payments.map((p) => String(p.itemId)))];
  const existing = await Purchase.find({
    userId,
    courseId: { $in: courseIds },
    status: 'completed',
  }).select('courseId');

  const owned = new Set(existing.map((p) => String(p.courseId)));
  const repairedIds = [];

  for (const payment of payments) {
    const cid = String(payment.itemId);
    if (owned.has(cid)) continue;
    try {
      await grantCourseAccess({
        userId,
        courseId: payment.itemId,
        amount: payment.finalAmount ?? payment.originalAmount,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod || 'paystack',
      });
      owned.add(cid);
      repairedIds.push(cid);
    } catch (err) {
      console.error(`repairCourseAccessFromPayments failed for ${cid}:`, err.message);
    }
  }

  return { repaired: repairedIds.length, courseIds: repairedIds };
}

module.exports = {
  grantCourseAccess,
  repairCourseAccessFromPayments,
};
