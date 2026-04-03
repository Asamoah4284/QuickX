require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Course = require('../models/Course');
const Review = require('../models/Review');
const Enrollment = require('../models/Enrollment');
const Transaction = require('../models/Transaction');
const PlatformSetting = require('../models/PlatformSetting');

async function run() {
    await mongoose.connect(process.env.MONGO_URI);

    const password = await bcrypt.hash('QuickXDemo@123', 12);

    const tutor = await User.findOneAndUpdate(
        { email: 'creator-demo@quickx.com' },
        {
            fullName: 'Quick X Demo Tutor',
            email: 'creator-demo@quickx.com',
            password,
            role: 'tutor',
            creatorStatus: 'approved',
            country: 'Ghana',
            phone: '0240000000',
            creatorHeadline: 'Professional trading educator',
            creatorBio: 'Demo creator profile for onboarding and dashboard QA.',
            expertise: ['Forex', 'Risk management'],
            languagesSpoken: ['English']
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await TutorProfile.findOneAndUpdate(
        { userId: tutor._id },
        {
            headline: 'Professional trading educator',
            bio: 'Demo creator profile for onboarding and dashboard QA.',
            expertise: ['Forex', 'Risk management'],
            experienceYears: 6,
            languages: ['English'],
            teachingCategories: ['Forex'],
            preferredCourseLanguage: 'English',
            teachesFreeCourses: true,
            teachesPaidCourses: true,
            applicationStatus: 'approved',
            verificationStatus: 'verified'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await PlatformSetting.findOneAndUpdate(
        {},
        {
            commissionRate: 15,
            courseAutoApproval: false,
            creatorAutoApproval: false
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const course = await Course.findOneAndUpdate(
        { title: 'Creator Demo Course', createdBy: tutor._id },
        {
            title: 'Creator Demo Course',
            subtitle: 'A complete example for the creator upload workflow',
            description: 'This seeded course demonstrates the new creator dashboard, review queue, and student course experience.',
            shortDescription: 'Seeded course for QA and demos.',
            category: 'Trading',
            subcategory: 'Forex',
            courseType: 'forex',
            level: 'beginner',
            language: 'English',
            pricingType: 'paid',
            price: 199,
            certificateEnabled: true,
            learningOutcomes: ['Read charts with confidence', 'Build a repeatable trading routine'],
            requirements: ['Basic computer literacy'],
            targetAudience: ['Beginner traders'],
            skillsGained: ['Technical analysis', 'Risk management'],
            modules: [
                {
                    title: 'Getting started',
                    description: 'Warm-up content',
                    price: 0,
                    level: 'beginner',
                    order: 1,
                    sections: [
                        {
                            title: 'Welcome',
                            description: '',
                            order: 1,
                            lessons: [
                                {
                                    title: 'Course introduction',
                                    type: 'video',
                                    lessonType: 'video',
                                    duration: '12',
                                    description: 'Meet your tutor and learn the roadmap.',
                                    order: 1,
                                    isPreview: true,
                                    isLocked: false
                                }
                            ]
                        }
                    ]
                }
            ],
            instructor: tutor._id,
            instructorModel: 'User',
            createdBy: tutor._id,
            source: 'user',
            listingStatus: 'published',
            isPublished: true,
            totalRevenue: 1500,
            averageRating: 4.8,
            totalStudents: 18
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const student = await User.findOneAndUpdate(
        { email: 'student-demo@quickx.com' },
        {
            fullName: 'Quick X Demo Student',
            email: 'student-demo@quickx.com',
            password,
            role: 'student',
            creatorStatus: 'not_applied'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Enrollment.findOneAndUpdate(
        { studentId: student._id, courseId: course._id },
        {
            progressPercent: 65,
            completedLessonIds: ['0-0-0'],
            enrolledAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Review.findOneAndUpdate(
        { studentId: student._id, courseId: course._id },
        {
            rating: 5,
            comment: 'Excellent onboarding-quality demo course.'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Transaction.findOneAndUpdate(
        { studentId: student._id, courseId: course._id },
        {
            tutorId: tutor._id,
            amount: 199,
            platformCommission: 29.85,
            tutorEarning: 169.15,
            status: 'completed',
            paymentReference: 'DEMO-TXN-001'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Creator demo data seeded successfully.');
    await mongoose.disconnect();
}

run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});
