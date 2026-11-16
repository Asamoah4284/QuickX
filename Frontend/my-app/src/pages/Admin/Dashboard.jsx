import React, { useState, useEffect } from 'react';
import MoneyInput, { MoneyUnit } from '../../ui/MoneyInput';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
    FiUsers, FiBook, FiVideo, FiSettings, 
    FiBarChart2, FiUpload, FiEdit2, 
    FiTrash2, FiPlus, FiTrendingUp, FiDollarSign,
    FiX, FiBookOpen, FiTag, FiStar, FiImage, FiAlertTriangle,
    FiEye, FiEyeOff
} from 'react-icons/fi';
import CourseModal from './CourseModal';
import BookModal from './BookModal';
import CourseManagement from './CourseManagement';
import { uploadFileToS3 } from '../../utils/uploadToS3';
import { formatCurrency } from '../../utils/currencyStore';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// Mock data for testing
const mockCourses = [
    {
        _id: '1',
        title: 'Forex Trading for Beginners',
        level: 'beginner',
        price: 299,
        description: 'Learn the basics of forex trading from scratch',
        students: 2453,
        rating: 4.8
    },
    {
        _id: '2',
        title: 'Technical Analysis Mastery',
        level: 'intermediate',
        price: 399,
        description: 'Master technical analysis and chart patterns',
        students: 1876,
        rating: 4.9
    },
    {
        _id: '3',
        title: 'Advanced Trading Strategies',
        level: 'advanced',
        price: 499,
        description: 'Advanced trading techniques and risk management',
        students: 1254,
        rating: 4.7
    }
];

const TAB_BY_PATH = {
    '/admin/books': 'books',
    '/admin/courses': 'courses',
    '/admin/settings': 'settings',
    '/admin/coupons': 'coupons',
    '/admin/withdrawals': 'withdrawals',
};

const AdminDashboard = () => {
    const location = useLocation();
    const activeTab = TAB_BY_PATH[location.pathname] || 'courses';
    const [courses, setCourses] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        instructor: '',
        instructorTitle: '',
        level: 'beginner',
        price: 0,
        thumbnail: null,
        courseType: 'forex',
        modules: [{
            id: 'module-1',
            title: '',
            description: '',
            price: 0,
            level: 'beginner',
            sections: [{
                id: 'section-1',
                title: '',
                lessons: [{
                    id: 'lesson-1-1',
                    title: '',
                    duration: '',
                    type: 'video',
                    free: false
                }]
            }]
        }]
    });
    const [showBookModal, setShowBookModal] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [bookStatusFilter, setBookStatusFilter] = useState('all');
    const [coupons, setCoupons] = useState([]);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discount: '',
        validUntil: '',
        maxUses: '',
        isActive: true
    });
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [withdrawalError, setWithdrawalError] = useState('');
    const [withdrawalSuccess, setWithdrawalSuccess] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [showDeleteBookModal, setShowDeleteBookModal] = useState(false);
    const [bookToDelete, setBookToDelete] = useState(null);
    const navigate = useNavigate();

    // Chart data





    useEffect(() => {
        fetchCourses();
        fetchBooks();
        fetchCoupons();
        fetchWithdrawalRequests();
    }, []);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/api/admin/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(Array.isArray(response.data) ? response.data : []);
            setError('');
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Using mock data for demonstration');
            setCourses(mockCourses);
        } finally {
            setLoading(false);
        }
    };

    const fetchBooks = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/api/admin/books`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Error fetching books:', err);
            // Mock data for books if the API fails
            setBooks([
                {
                    _id: '1',
                    title: 'The Complete Guide to Forex Trading',
                    author: 'John Smith',
                    description: 'A comprehensive guide to forex trading strategies',
                    price: 49.99,
                    coverImage: 'https://via.placeholder.com/150',
                    published: '2022-01-15'
                },
                {
                    _id: '2',
                    title: 'Technical Analysis Fundamentals',
                    author: 'Sarah Johnson',
                    description: 'Learn the basics of chart analysis and patterns',
                    price: 39.99,
                    coverImage: 'https://via.placeholder.com/150',
                    published: '2021-11-10'
                },
                {
                    _id: '3',
                    title: 'Risk Management for Traders',
                    author: 'Michael Brown',
                    description: 'Essential risk management techniques for all traders',
                    price: 44.99,
                    coverImage: 'https://via.placeholder.com/150',
                    published: '2022-03-22'
                }
            ]);
        }
    };

    const fetchCoupons = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/api/admin/coupons`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCoupons(response.data);
        } catch (error) {
            console.error('Error fetching coupons:', error);
            setError('Failed to fetch coupons');
        }
    };

    const fetchWithdrawalRequests = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                setWithdrawalError('Authentication token not found');
                return;
            }

            const response = await axios.get(`${API_URL}/api/admin/withdrawals`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data) {
                setWithdrawalRequests(response.data);
                setWithdrawalError('');
            }
        } catch (error) {
            console.error('Error fetching withdrawal requests:', error);
            setWithdrawalError(error.response?.data?.message || 'Failed to fetch withdrawal requests');
            setWithdrawalRequests([]);
        }
    };




    const confirmDeleteCourse = async () => {
        if (!courseToDelete) return;

        try {
            const response = await axios.delete(`${API_URL}/api/courses/admin/${courseToDelete}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.data.success) {
                // Remove the course from the local state
                setCourses(courses.filter(course => course._id !== courseToDelete));
                alert('Course deleted successfully');
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            alert(error.response?.data?.message || 'Failed to delete course');
        } finally {
            setShowDeleteModal(false);
            setCourseToDelete(null);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedCourse(null);
    };

    const handleModalSave = () => {
        setShowModal(false);
        setSelectedCourse(null);
        fetchCourses();
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleModuleChange = (moduleIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.map((module, index) => 
                index === moduleIndex ? { ...module, [field]: value } : module
            )
        }));
    };

    const handleSectionChange = (moduleIndex, sectionIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.map((module, mIndex) => 
                mIndex === moduleIndex ? {
                    ...module,
                    sections: module.sections.map((section, sIndex) => 
                        sIndex === sectionIndex ? { ...section, [field]: value } : section
                    )
                } : module
            )
        }));
    };

    const handleLessonChange = (moduleIndex, sectionIndex, lessonIndex, field, value) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.map((module, mIndex) => 
                mIndex === moduleIndex ? {
                    ...module,
                    sections: module.sections.map((section, sIndex) => 
                        sIndex === sectionIndex ? {
                            ...section,
                            lessons: section.lessons.map((lesson, lIndex) => 
                                lIndex === lessonIndex ? { ...lesson, [field]: value } : lesson
                            )
                        } : section
                    )
                } : module
            )
        }));
    };

    const addModule = () => {
        setFormData(prev => ({
            ...prev,
            modules: [...prev.modules, {
                id: `module-${prev.modules.length + 1}`,
                title: '',
                description: '',
                price: 0,
                level: 'beginner',
                sections: [{
                    id: 'section-1',
                    title: '',
                    lessons: [{
                        id: 'lesson-1-1',
                        title: '',
                        duration: '',
                        type: 'video',
                        free: false
                    }]
                }]
            }]
        }));
    };

    const addSection = (moduleIndex) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.map((module, index) => 
                index === moduleIndex ? {
                    ...module,
                    sections: [...module.sections, {
                        id: `section-${module.sections.length + 1}`,
                        title: '',
                        lessons: [{
                            id: `lesson-${module.sections.length + 1}-1`,
                            title: '',
                            duration: '',
                            type: 'video',
                            free: false
                        }]
                    }]
                } : module
            )
        }));
    };

    const addLesson = (moduleIndex, sectionIndex) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.map((module, mIndex) => 
                mIndex === moduleIndex ? {
                    ...module,
                    sections: module.sections.map((section, sIndex) => 
                        sIndex === sectionIndex ? {
                            ...section,
                            lessons: [...section.lessons, {
                                id: `lesson-${sIndex + 1}-${section.lessons.length + 1}`,
                                title: '',
                                duration: '',
                                type: 'video',
                                free: false
                            }]
                        } : section
                    )
                } : module
            )
        }));
    };

    const handleSaveCourse = async () => {
        try {
            const token = localStorage.getItem('adminToken');

            // Create course data object
            const courseData = {
                title: formData.title || '',
                description: formData.description || '',
                shortDescription: formData.subtitle || '',
                price: Number(formData.price) || 0,
                level: formData.level || 'beginner',
                courseType: formData.courseType || 'forex',  // Make sure courseType is set correctly
                instructor: '67f7c520a1ecc76450e4061c',
                instructorModel: 'Admin',
                modules: formData.modules.map((module, moduleIndex) => ({
                    title: module.title || '',
                    description: module.description || '',
                    price: Number(module.price) || 0,
                    level: module.level || 'beginner',
                    order: moduleIndex + 1,
                    sections: module.sections.map((section, sectionIndex) => ({
                        title: section.title || '',
                        description: section.description || '',
                        order: sectionIndex + 1,
                        lessons: section.lessons.map((lesson, lessonIndex) => {
                            // Log each lesson's videoUrl before sending
                            console.log(`Lesson ${lessonIndex} videoUrl:`, lesson.videoUrl);
                            return {
                                title: lesson.title || '',
                                type: lesson.type || 'video',
                                duration: lesson.duration || '0min',
                                videoUrl: lesson.videoUrl || '', // Ensure videoUrl is included
                                isPreview: Boolean(lesson.free),
                                order: lessonIndex + 1
                            };
                        })
                    }))
                })),
                tags: [],
                thumbnail: formData.thumbnail || '' // AWS thumbnail URL
            };

            // Log the complete course data before sending
            console.log('Sending course data:', JSON.stringify(courseData, null, 2));

            const response = await axios.post(`${API_URL}/api/admin/courses`, courseData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data) {
                // Reset form data
                setFormData({
                    title: '',
                    subtitle: '',
                    description: '',
                    instructor: '',
                    instructorTitle: '',
                    level: 'beginner',
                    price: '',
                    thumbnail: '',
                    courseType: 'forex',
                    modules: [{
                        id: 'module-1',
                        title: '',
                        description: '',
                        price: 0,
                        level: 'beginner',
                        sections: [{
                            id: 'section-1',
                            title: '',
                            lessons: [{
                                id: 'lesson-1-1',
                                title: '',
                                duration: '',
                                type: 'video',
                                free: false
                            }]
                        }]
                    }]
                });
                
                // Close the modal and fetch updated courses
                setShowModal(false);
                setShowAddCourse(false); // Close the add course screen
                fetchCourses();
                
                navigate('/admin/courses');
            }
        } catch (error) {
            console.error('Error saving course:', error);
            setError('Failed to save course. Please try again.');
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleSaveCourse();
    };

    const handleThumbnailUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                setError('Please login first');
                return;
            }

            const fileUrl = await uploadFileToS3({ file, token, type: 'image' });

            setFormData(prev => ({
                ...prev,
                thumbnail: fileUrl
            }));
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            if (error.response) {
                setError(`Upload failed: ${error.response.data.message || 'Server error'}`);
            } else if (error.request) {
                setError('Could not connect to server. Please check if the server is running.');
            } else {
                setError(error.message || 'Failed to upload thumbnail. Please try again.');
            }
        }
    };

    const handleContentUpload = async (e, moduleIndex, sectionIndex, lessonIndex) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                setError('Please login first');
                return;
            }

            const fileUrl = await uploadFileToS3({ file, token, type: 'video' });
            console.log('Uploaded video URL:', fileUrl);

            // Update the form data with the file URL
            const updatedModules = [...formData.modules];
            updatedModules[moduleIndex].sections[sectionIndex].lessons[lessonIndex].videoUrl = fileUrl;
            
            // Log the updated lesson data
            console.log('Updated lesson data:', updatedModules[moduleIndex].sections[sectionIndex].lessons[lessonIndex]);
            
            setFormData(prev => ({
                ...prev,
                modules: updatedModules
            }));

            // Verify the videoUrl was set correctly
            console.log('Form data after update:', formData.modules[moduleIndex].sections[sectionIndex].lessons[lessonIndex]);
        } catch (error) {
            console.error('Error uploading content:', error);
            if (error.response) {
                setError(`Upload failed: ${error.response.data.message || 'Server error'}`);
            } else if (error.request) {
                setError('Could not connect to server. Please check if the server is running.');
            } else {
                setError(error.message || 'Failed to upload content. Please try again.');
            }
        }
    };




    const handleToggleBookStatus = async (book) => {
        try {
            const currentStatus = book.listingStatus || 'published';
            const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
            const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken') || localStorage.getItem('token');
            await axios.patch(
                `${API_URL}/api/admin/books/${book._id}/status`,
                { status: nextStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBooks(prev => prev.map(b => b._id === book._id ? { ...b, listingStatus: nextStatus } : b));
        } catch (err) {
            console.error('Error toggling book status:', err);
            alert(err.response?.data?.message || 'Failed to update book status');
        }
    };

    const handleAddBook = () => {
        setSelectedBook(null);
        setShowBookModal(true);
    };

    const handleEditBook = (book) => {
        setSelectedBook(book);
        setShowBookModal(true);
    };

    const handleDeleteBookRequest = (bookId) => {
        setBookToDelete(bookId);
        setShowDeleteBookModal(true);
    };

    const confirmDeleteBook = async () => {
        if (!bookToDelete) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`${API_URL}/api/admin/books/${bookToDelete}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBooks(books.filter(book => book._id !== bookToDelete));
        } catch (err) {
            console.error('Error deleting book:', err);
            setError('Failed to delete book. Please try again.');
        } finally {
            setShowDeleteBookModal(false);
            setBookToDelete(null);
        }
    };

    const handleBookModalClose = () => {
        setShowBookModal(false);
        setSelectedBook(null);
    };

    const handleBookModalSave = () => {
        setShowBookModal(false);
        setSelectedBook(null);
        fetchBooks();
    };

    const handleAddCoupon = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const code = String(newCoupon.code || '').trim().toUpperCase();
            const discount = Number(newCoupon.discount);
            const maxUses = Number(newCoupon.maxUses);
            const validUntilRaw = String(newCoupon.validUntil || '').trim();

            // Validate before formatting, empty date used to throw and show a generic failure
            if (!code) {
                setError('Enter a coupon code');
                return;
            }
            if (!Number.isFinite(discount) || newCoupon.discount === '') {
                setError('Enter a discount percentage');
                return;
            }
            if (discount < 0 || discount > 100) {
                setError('Discount must be between 0 and 100');
                return;
            }
            if (!validUntilRaw) {
                setError('Pick a Valid Until date');
                return;
            }
            const validUntilDate = new Date(validUntilRaw);
            if (Number.isNaN(validUntilDate.getTime())) {
                setError('Valid Until date is invalid');
                return;
            }
            if (!Number.isFinite(maxUses) || newCoupon.maxUses === '' || maxUses < 1) {
                setError('Max uses must be at least 1');
                return;
            }

            const formattedCoupon = {
                code,
                discount,
                validUntil: validUntilDate.toISOString(),
                maxUses,
                isActive: true
            };

            const response = await axios.post(`${API_URL}/api/admin/coupons`, formattedCoupon, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setCoupons([response.data, ...coupons]);
            setNewCoupon({
                code: '',
                discount: '',
                validUntil: '',
                maxUses: '',
                isActive: true
            });
            setError('');
        } catch (error) {
            console.error('Error creating coupon:', error);
            const data = error.response?.data;
            setError(
                data?.message ||
                data?.error ||
                (Array.isArray(data?.errors) ? data.errors.map((e) => e.msg || e.message).join(' ') : '') ||
                'Failed to create coupon'
            );
        }
    };

    const handleDeleteCoupon = async (couponId) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`${API_URL}/api/admin/coupons/${couponId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCoupons(coupons.filter(coupon => coupon._id !== couponId));
        } catch (error) {
            console.error('Error deleting coupon:', error);
            setError('Failed to delete coupon');
        }
    };



    const handleApproveWithdrawal = async (requestId) => {
        // Only mark as paid after the money has actually been sent on mobile money.
        const note = window.prompt(
            'Only continue if you have already sent the money on mobile money.\n\nOptional: paste the MoMo transaction ID so the member can see it.',
            ''
        );
        if (note === null) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`${API_URL}/api/admin/withdrawals/${requestId}/approve`, { remarks: note.trim() ? `MoMo transaction ID: ${note.trim()}` : '' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWithdrawalSuccess('Withdrawal approved successfully');
            fetchWithdrawalRequests(); // Refresh the list
            setTimeout(() => setWithdrawalSuccess(''), 3000);
        } catch (error) {
            setWithdrawalError(error.response?.data?.message || 'Failed to approve withdrawal');
            setTimeout(() => setWithdrawalError(''), 3000);
        }
    };

    const handleRejectWithdrawal = async (requestId) => {
        const reason = window.prompt('Why are you rejecting this? The member will see this, and the money goes back to their balance.', '');
        if (reason === null) return;
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`${API_URL}/api/admin/withdrawals/${requestId}/reject`, { remarks: reason.trim() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWithdrawalSuccess('Withdrawal rejected successfully');
            fetchWithdrawalRequests(); // Refresh the list
            setTimeout(() => setWithdrawalSuccess(''), 3000);
        } catch (error) {
            setWithdrawalError(error.response?.data?.message || 'Failed to reject withdrawal');
            setTimeout(() => setWithdrawalError(''), 3000);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'books':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-fg">Books Management</h2>
                                <p className="text-xs text-fg-subtle mt-1">
                                    Manage store publications, set live status, and monitor inventory.
                                </p>
                            </div>
                            <button
                                onClick={handleAddBook}
                                className="flex items-center px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 text-sm font-semibold shadow-sm transition"
                            >
                                <FiPlus className="mr-2" />
                                Add New Book
                            </button>
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
                            {[
                                { key: 'all', label: 'All Books', count: books.length },
                                {
                                    key: 'live',
                                    label: 'Live (Published)',
                                    count: books.filter(b => (b.listingStatus || 'published') === 'published').length,
                                    badgeColor: 'bg-up/10 text-up'
                                },
                                {
                                    key: 'draft',
                                    label: 'Drafts (Hidden)',
                                    count: books.filter(b => b.listingStatus === 'draft').length,
                                    badgeColor: 'bg-ink-800 text-fg-muted'
                                },
                                {
                                    key: 'review',
                                    label: 'In Review',
                                    count: books.filter(b => b.listingStatus === 'pending_review').length,
                                    badgeColor: 'bg-warn/10 text-warn'
                                }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setBookStatusFilter(tab.key)}
                                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        bookStatusFilter === tab.key
                                            ? 'bg-brand-600 text-white shadow-sm'
                                            : 'bg-ink-800 text-fg-muted hover:bg-ink-700'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                        bookStatusFilter === tab.key
                                            ? 'bg-white/20 text-white'
                                            : tab.badgeColor || 'bg-ink-700 text-fg-muted'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                        
                        <div className="bg-ink-850 rounded-xl shadow-sm border border-line overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-line">
                                    <thead className="bg-ink-900">
                                        <tr>
                                            <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-fg-subtle uppercase tracking-wider">
                                                Cover
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-fg-subtle uppercase tracking-wider">
                                                Title &amp; Type
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-fg-subtle uppercase tracking-wider">
                                                Author
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-fg-subtle uppercase tracking-wider">
                                                Price
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-fg-subtle uppercase tracking-wider">
                                                Store Status
                                            </th>
                                            <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-fg-subtle uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-ink-850 divide-y divide-line">
                                        {books
                                            .filter(book => {
                                                const st = book.listingStatus || 'published';
                                                if (bookStatusFilter === 'live') return st === 'published';
                                                if (bookStatusFilter === 'draft') return st === 'draft';
                                                if (bookStatusFilter === 'review') return st === 'pending_review';
                                                return true;
                                            })
                                            .map((book) => {
                                                const status = book.listingStatus || 'published';
                                                const isLive = status === 'published';
                                                const cover = book.thumbnail ? publicAssetUrl(book.thumbnail) : '/images/bk-1.jpg';

                                                return (
                                                    <tr key={book._id} className="hover:bg-ink-900/80 transition-colors">
                                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                                            <div className="h-16 w-12 rounded-lg overflow-hidden bg-ink-800 border border-line flex items-center justify-center shadow-xs">
                                                                <img 
                                                                    src={cover} 
                                                                    alt={book.title} 
                                                                    className="h-full w-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '/images/bk-1.jpg';
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3.5">
                                                            <div className="text-sm font-semibold text-fg line-clamp-1">{book.title}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[11px] font-medium text-fg-subtle capitalize">
                                                                    {book.type === 'hardcopy' ? 'Physical Copy' : 'Digital E-Book'}
                                                                </span>
                                                                {book.galleryImages?.length > 0 ? (
                                                                    <span className="text-[10px] text-brand-400 bg-brand-500/10 px-1.5 py-0.2 rounded font-semibold">
                                                                        +{book.galleryImages.length} gallery
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                                            <div className="text-sm text-fg-muted font-medium">{book.author}</div>
                                                        </td>
                                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                                            <div className="text-sm font-bold text-fg">
                                                                {formatCurrency(book.price)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                                            {isLive ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-up/10 text-up ring-1 ring-up">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    Live
                                                                </span>
                                                            ) : status === 'draft' ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-ink-800 text-fg-muted ring-1 ring-line">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-ink-600" />
                                                                    Draft (Hidden)
                                                                </span>
                                                            ) : status === 'pending_review' ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-warn/10 text-warn ring-1 ring-warn">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                                    In Review
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-down/10 text-down ring-1 ring-down">
                                                                    Rejected
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-medium space-x-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleBookStatus(book)}
                                                                title={isLive ? 'Unpublish and hide from store' : 'Publish and make live on store'}
                                                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold transition ${
                                                                    isLive
                                                                        ? 'border-line text-fg-muted hover:bg-ink-800'
                                                                        : 'border-up text-up hover:bg-up/10'
                                                                }`}
                                                            >
                                                                {isLive ? (
                                                                    <>
                                                                        <FiEyeOff className="text-fg-subtle" />
                                                                        Hide
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FiEye className="text-up" />
                                                                        Make Live
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditBook(book)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-400/30 text-brand-300 hover:bg-brand-500/10 font-semibold transition"
                                                            >
                                                                <FiEdit2 />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteBookRequest(book._id)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-down/30 text-down hover:bg-down/10 font-semibold transition"
                                                            >
                                                                <FiTrash2 />
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'courses':
                if (showAddCourse) {
                    return (
                        <div className="bg-ink-850 rounded-xl shadow-sm p-4 lg:p-6">
                            <div className="flex justify-between items-center mb-4 lg:mb-6">
                                <h2 className="text-lg lg:text-xl font-bold">Add New Course</h2>
                                <button
                                    onClick={() => setShowAddCourse(false)}
                                    className="p-2 rounded-lg hover:bg-ink-800 text-fg-subtle hover:text-fg-muted"
                                >
                                    <FiX className="text-xl" />
                                </button>
                            </div>
                            <form className="space-y-4 lg:space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-fg-muted mb-1">
                                            Course Title
                                        </label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="Enter course title"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-fg-muted mb-1">
                                            Subtitle
                                        </label>
                                        <input
                                            type="text"
                                            name="subtitle"
                                            value={formData.subtitle}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="Enter course subtitle"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-fg-muted mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleFormChange}
                                        className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        rows="4"
                                        placeholder="Enter course description"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-fg-muted mb-1">
                                            Instructor
                                        </label>
                                        <input
                                            type="text"
                                            name="instructor"
                                            value={formData.instructor}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="Enter instructor name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-fg-muted mb-1">
                                            Instructor Title
                                        </label>
                                        <input
                                            type="text"
                                            name="instructorTitle"
                                            value={formData.instructorTitle}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="Enter instructor title"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-fg-muted mb-1">
                                            Level
                                        </label>
                                        <select
                                            name="level"
                                            value={formData.level}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-fg-muted mb-1">
                                            Price (<MoneyUnit />)
                                        </label>
                                        <MoneyInput
                                            plain
                                            name="price"
                                            value={formData.price}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="Enter course price"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-fg-muted mb-1">
                                        Thumbnail
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                        className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    />
                                </div>

                                <div className="space-y-4 lg:space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base lg:text-lg font-semibold">Course Modules</h3>
                                        <button
                                            type="button"
                                            onClick={addModule}
                                            className="flex items-center px-3 lg:px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                                        >
                                            <FiPlus className="mr-1 lg:mr-2" />
                                            Add Module
                                        </button>
                                    </div>

                                    {formData.modules.map((module, moduleIndex) => (
                                        <div key={module.id} className="border rounded-lg p-3 lg:p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-fg-muted mb-1">
                                                        Module Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={module.title}
                                                        onChange={(e) => handleModuleChange(moduleIndex, 'title', e.target.value)}
                                                        className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                        placeholder="Enter module title"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-fg-muted mb-1">
                                                        Module price (<MoneyUnit />)
                                                    </label>
                                                    <MoneyInput
                                                        plain
                                                        value={module.price}
                                                        onChange={(e) => handleModuleChange(moduleIndex, 'price', e.target.value)}
                                                        className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                        placeholder="Enter module price"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-fg-muted mb-1">
                                                    Module Description
                                                </label>
                                                <textarea
                                                    value={module.description}
                                                    onChange={(e) => handleModuleChange(moduleIndex, 'description', e.target.value)}
                                                    className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                    rows="2"
                                                    placeholder="Enter module description"
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-md font-medium">Sections</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => addSection(moduleIndex)}
                                                        className="flex items-center px-3 lg:px-4 py-1 bg-ink-800 text-fg-muted rounded-lg hover:bg-ink-700"
                                                    >
                                                        <FiPlus className="mr-1 lg:mr-2" />
                                                        Add Section
                                                    </button>
                                                </div>

                                                {module.sections.map((section, sectionIndex) => (
                                                    <div key={section.id} className="border rounded-lg p-3 lg:p-4 bg-ink-900">
                                                        <div className="mb-4">
                                                            <label className="block text-sm font-medium text-fg-muted mb-1">
                                                                Section Title
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={section.title}
                                                                onChange={(e) => handleSectionChange(moduleIndex, sectionIndex, 'title', e.target.value)}
                                                                className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                                placeholder="Enter section title"
                                                            />
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center">
                                                                <h5 className="text-sm font-medium">Lessons</h5>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addLesson(moduleIndex, sectionIndex)}
                                                                    className="flex items-center px-3 lg:px-4 py-1 bg-ink-800 text-fg-muted rounded-lg hover:bg-ink-700"
                                                                >
                                                                    <FiPlus className="mr-1 lg:mr-2" />
                                                                    Add Lesson
                                                                </button>
                                                            </div>

                                                            {section.lessons.map((lesson, lessonIndex) => (
                                                                <div key={lesson.id} className="border rounded-lg p-3 lg:p-4 bg-ink-850">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-fg-muted mb-1">
                                                                                Lesson Title
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={lesson.title}
                                                                                onChange={(e) => handleLessonChange(moduleIndex, sectionIndex, lessonIndex, 'title', e.target.value)}
                                                                                className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                                                placeholder="Enter lesson title"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-fg-muted mb-1">
                                                                                Duration
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={lesson.duration}
                                                                                onChange={(e) => handleLessonChange(moduleIndex, sectionIndex, lessonIndex, 'duration', e.target.value)}
                                                                                className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                                                placeholder="e.g., 30 min"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-4">
                                                                        <label className="block text-sm font-medium text-fg-muted mb-1">
                                                                            Lesson Type
                                                                        </label>
                                                                        <select
                                                                            value={lesson.type}
                                                                            onChange={(e) => handleLessonChange(moduleIndex, sectionIndex, lessonIndex, 'type', e.target.value)}
                                                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                                        >
                                                                            <option value="video">Video</option>
                                                                            <option value="workshop">Workshop</option>
                                                                            <option value="quiz">Quiz</option>
                                                                            <option value="ebook">E-Book</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="mt-4">
                                                                        <label className="flex items-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={lesson.free}
                                                                                onChange={(e) => handleLessonChange(moduleIndex, sectionIndex, lessonIndex, 'free', e.target.checked)}
                                                                                className="rounded border-line text-brand-400 focus:ring-brand-500"
                                                                            />
                                                                            <span className="ml-2 text-sm text-fg-muted">Free Preview</span>
                                                                        </label>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-fg-muted mb-1">
                                                                            Content
                                                                        </label>
                                                                        <input
                                                                            type="file"
                                                                            accept=".pdf,.mp4,.doc,.docx"
                                                                            onChange={(e) => handleContentUpload(e, moduleIndex, sectionIndex, lessonIndex)}
                                                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddCourse(false)}
                                        className="px-4 py-2 border rounded-lg hover:bg-ink-900 w-full sm:w-auto"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        onClick={handleFormSubmit}
                                        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 w-full sm:w-auto"
                                    >
                                        Save Course
                                    </button>
                                </div>
                            </form>
                        </div>
                    );
                }
                return (
                    <div className="space-y-4 lg:space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <h2 className="text-lg lg:text-xl font-bold mb-2 sm:mb-0">Course Management</h2>
                        </div>
                        <CourseManagement />
                    </div>
                );
            case 'settings':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Settings</h2>
                        <div className="bg-ink-850 rounded-xl shadow-sm p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-fg-muted">Platform Name</label>
                                    <input type="text" className="mt-1 block w-full rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-fg-muted">Email Notifications</label>
                                    <div className="mt-2">
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" className="rounded border-line text-brand-400 shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                                            <span className="ml-2">Enable email notifications</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-fg-muted">Maintenance Mode</label>
                                    <div className="mt-2">
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" className="rounded border-line text-brand-400 shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                                            <span className="ml-2">Enable maintenance mode</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'coupons':
                return (
                    <div className="space-y-6">
                        <div className="bg-ink-850 rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-semibold mb-4">Coupon Management</h2>
                            
                            {/* Add New Coupon Form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-fg-muted">Coupon code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. ELMAX"
                                        className="w-full border rounded-lg px-4 py-2"
                                        value={newCoupon.code}
                                        onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-fg-muted">Discount %</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 30"
                                        min={0}
                                        max={100}
                                        className="w-full border rounded-lg px-4 py-2"
                                        value={newCoupon.discount}
                                        onChange={(e) => setNewCoupon({...newCoupon, discount: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-fg-muted">Valid until</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg px-4 py-2"
                                        value={newCoupon.validUntil}
                                        onChange={(e) => setNewCoupon({...newCoupon, validUntil: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-fg-muted">Max uses</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 20"
                                        min={1}
                                        className="w-full border rounded-lg px-4 py-2"
                                        value={newCoupon.maxUses}
                                        onChange={(e) => setNewCoupon({...newCoupon, maxUses: e.target.value})}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={handleAddCoupon}
                                        className="w-full bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
                                    >
                                        Add Coupon
                                    </button>
                                </div>
                            </div>

                            {/* Coupons List */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-ink-900">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">Discount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">Valid Until</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">Uses</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-ink-850 divide-y divide-line">
                                        {coupons.map((coupon) => (
                                            <tr key={coupon._id || coupon.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{coupon.code}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{coupon.discount}%</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{new Date(coupon.validUntil).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{coupon.uses}/{coupon.maxUses}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        coupon.isActive ? 'bg-up/10 text-up' : 'bg-down/10 text-down'
                                                    }`}>
                                                        {coupon.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleDeleteCoupon(coupon._id || coupon.id)}
                                                        className="text-down hover:text-down"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case 'withdrawals':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Withdrawal Requests</h2>
                        
                        {withdrawalSuccess && (
                            <div className="bg-up/10 border border-up/30 text-up px-4 py-3 rounded">
                                {withdrawalSuccess}
                            </div>
                        )}
                        
                        {withdrawalError && (
                            <div className="bg-down/10 border border-down/30 text-down px-4 py-3 rounded">
                                {withdrawalError}
                            </div>
                        )}

                        <div className="bg-ink-850 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                {withdrawalRequests.length > 0 ? (
                                    <table className="min-w-full divide-y divide-line">
                                        <thead className="bg-ink-900">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                    User
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                    Amount
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                    MoMo Number
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                    Network
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-ink-850 divide-y divide-line">
                                            {withdrawalRequests.map((request) => (
                                                <tr key={request._id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-fg">{request.user?.fullName || 'N/A'}</div>
                                                        <div className="text-sm text-fg-subtle">{request.user?.email || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-fg">GH₵{request.amount}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-fg">{request.momoNumber}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-fg">{request.network}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            request.status === 'pending' ? 'bg-warn/10 text-warn' :
                                                            request.status === 'completed' ? 'bg-up/10 text-up' :
                                                            'bg-down/10 text-down'
                                                        }`}>
                                                            {request.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-fg">
                                                            {new Date(request.requestedAt).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-sm text-fg-subtle">
                                                            {new Date(request.requestedAt).toLocaleTimeString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        {request.status === 'pending' && (
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleApproveWithdrawal(request._id)}
                                                                    className="text-up hover:text-up bg-up/10 px-3 py-1 rounded-md"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectWithdrawal(request._id)}
                                                                    className="text-down hover:text-down bg-down/10 px-3 py-1 rounded-md"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="text-fg-subtle">No withdrawal requests found</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const DeleteConfirmationModal = () => {
        if (!showDeleteModal) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-ink-850 rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="flex items-center justify-center mb-4">
                        <FiAlertTriangle className="text-down text-4xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-fg text-center mb-2">
                        Delete Course
                    </h3>
                    <p className="text-fg-muted text-center mb-6">
                        Are you sure you want to delete this course? This action cannot be undone and all course content will be permanently removed.
                    </p>
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => {
                                setShowDeleteModal(false);
                                setCourseToDelete(null);
                            }}
                            className="px-4 py-2 text-fg-muted hover:text-fg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteCourse}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium focus:outline-none focus:ring-2 focus:ring-down focus:ring-offset-2"
                        >
                            Delete Course
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const DeleteBookConfirmationModal = () => {
        if (!showDeleteBookModal) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-ink-850 rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="flex items-center justify-center mb-4">
                        <FiAlertTriangle className="text-down text-4xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-fg text-center mb-2">
                        Delete Book
                    </h3>
                    <p className="text-fg-muted text-center mb-6">
                        Are you sure you want to delete this book? This action cannot be undone and all book data will be permanently removed.
                    </p>
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => {
                                setShowDeleteBookModal(false);
                                setBookToDelete(null);
                            }}
                            className="px-4 py-2 text-fg-muted hover:text-fg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteBook}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium focus:outline-none focus:ring-2 focus:ring-down focus:ring-offset-2"
                        >
                            Delete Book
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500" />
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className="mb-4 bg-warn/10 border border-warn/30 text-warn px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {renderContent()}

            {showModal && (
                <CourseModal
                    course={selectedCourse}
                    onClose={handleModalClose}
                    onSave={handleModalSave}
                />
            )}

            {showBookModal && (
                <BookModal
                    book={selectedBook}
                    onClose={handleBookModalClose}
                    onSave={handleBookModalSave}
                />
            )}

            <DeleteConfirmationModal />
            <DeleteBookConfirmationModal />
        </>
    );
};

export default AdminDashboard;