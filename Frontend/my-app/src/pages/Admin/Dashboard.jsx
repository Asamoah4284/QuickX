import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    FiHome, FiUsers, FiBook, FiVideo, FiSettings, 
    FiLogOut, FiBarChart2, FiUpload, FiEdit2, 
    FiTrash2, FiPlus, FiTrendingUp, FiDollarSign,
    FiX, FiBookOpen, FiTag
} from 'react-icons/fi';
import CourseModal from './CourseModal';
import BookModal from './BookModal';
import CourseManagement from './CourseManagement';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const API_URL = import.meta.env.VITE_API_URL;
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

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [courses, setCourses] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [analytics, setAnalytics] = useState({
        totalUsers: 0,
        totalCourses: 0,
        totalRevenue: 0,
        activeUsers: 0,
        userGrowth: [],
        revenueData: [],
        courseEnrollment: [],
        userActivity: []
    });
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
    const [coupons, setCoupons] = useState([]);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        discount: '',
        validUntil: '',
        maxUses: '',
        isActive: true
    });
    const navigate = useNavigate();

    // Chart data
    const userGrowthData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'User Growth',
                data: [150, 280, 450, 620, 850, 1400],
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                tension: 0.5,
                fill: true,
                borderWidth: 3,
                pointBackgroundColor: 'white',
                pointBorderColor: 'rgb(99, 102, 241)',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBorderWidth: 3,
                pointHoverBackgroundColor: 'white',
                pointHoverBorderColor: 'rgb(99, 102, 241)',
                animation: {
                    y: {
                        duration: 2000,
                        from: 0
                    },
                    x: {
                        duration: 1500
                    }
                }
            }
        ]
    };

    const revenueData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Revenue',
                data: [5000, 8000, 12000, 15000, 18000, 22000],
                backgroundColor: 'rgba(99, 102, 241, 0.5)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 1
            }
        ]
    };

    const courseEnrollmentData = {
        labels: ['Beginner', 'Intermediate', 'Advanced'],
        datasets: [
            {
                data: [300, 200, 100],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(99, 102, 241)',
                    'rgb(139, 92, 246)'
                ],
                borderWidth: 1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
        },
        scales: {
            y: {
                beginAtZero: true
            }
        },
        animation: {
            duration: 2000,
            easing: 'easeInOutQuart',
            delay: (context) => {
                return context.dataIndex * 100;
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
        },
        animation: {
            animateScale: true,
            animateRotate: true,
            duration: 2000,
            easing: 'easeInOutQuart',
            delay: (context) => {
                return context.dataIndex * 300;
            }
        },
        cutout: '70%',
        radius: '90%'
    };

    useEffect(() => {
        fetchCourses();
        fetchBooks();
        fetchCoupons();
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

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
        navigate('/admin/login');
    };

    const handleAddCourse = () => {
        setSelectedCourse(null);
        setShowModal(true);
    };

    const handleEditCourse = (course) => {
        setSelectedCourse(course);
        setShowModal(true);
    };

    const handleDeleteCourse = async (courseId) => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                const token = localStorage.getItem('adminToken');
                await axios.delete(`${API_URL}/api/admin/courses/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCourses(courses.filter(course => course._id !== courseId));
            } catch (err) {
                console.error('Error deleting course:', err);
                setCourses(courses.filter(course => course._id !== courseId));
            }
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
                                free: lesson.free || false,
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
                
                // Set active tab to courses to show the courses list
                setActiveTab('courses');
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
            
            // First, get the secure URL from our server
            const { data: { url } } = await axios.get(`${API_URL}/s3Url`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(url);

            if (!url) {
                throw new Error('Failed to get upload URL');
            }

            // Upload the file directly to S3 using the secure URL
            await axios.put(url, file, {
                headers: {
                    'Content-Type': file.type
                }
            });
         

            // Extract the file URL from the S3 URL
            const fileUrl = url.split('?')[0];

            // Update the form data with the file URL
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
                setError('Failed to upload thumbnail. Please try again.');
            }
        }
    };

    const handleContentUpload = async (e, moduleIndex, sectionIndex, lessonIndex) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const token = localStorage.getItem('adminToken');
            
            // First, get the secure URL from our server
            const { data: { url } } = await axios.get(`${API_URL}/s3VideoUrl`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!url) {
                throw new Error('Failed to get upload URL');
            }

            // Upload the file directly to S3 using the secure URL
            await axios.put(url, file, {
                headers: {
                    'Content-Type': file.type
                }
            });

            // Extract the file URL from the S3 URL
            const fileUrl = url.split('?')[0];
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
                setError('Failed to upload content. Please try again.');
            }
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

    const handleDeleteBook = async (bookId) => {
        if (window.confirm('Are you sure you want to delete this book?')) {
            try {
                const token = localStorage.getItem('adminToken');
                await axios.delete(`${API_URL}/api/admin/books/${bookId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBooks(books.filter(book => book._id !== bookId));
            } catch (err) {
                console.error('Error deleting book:', err);
                setError('Failed to delete book. Please try again.');
            }
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
            
            // Format the coupon data
            const formattedCoupon = {
                code: newCoupon.code.toUpperCase(),
                discount: Number(newCoupon.discount),
                validUntil: new Date(newCoupon.validUntil).toISOString(),
                maxUses: Number(newCoupon.maxUses),
                isActive: true
            };

            // Validate the data
            if (!formattedCoupon.code || !formattedCoupon.discount || !formattedCoupon.validUntil || !formattedCoupon.maxUses) {
                setError('Please fill in all fields');
                return;
            }

            if (formattedCoupon.discount < 0 || formattedCoupon.discount > 100) {
                setError('Discount must be between 0 and 100');
                return;
            }

            if (formattedCoupon.maxUses < 1) {
                setError('Maximum uses must be at least 1');
                return;
            }

            const response = await axios.post(`${API_URL}/api/admin/coupons`, formattedCoupon, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setCoupons([...coupons, response.data]);
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
            setError(error.response?.data?.message || 'Failed to create coupon');
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

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Users</p>
                                        <p className="text-xl font-bold">{analytics.totalUsers || ''}</p>
                                    </div>
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <FiUsers className="text-blue-600 text-lg" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center text-green-500 text-sm">
                                    <FiTrendingUp className="mr-1" />
                                    <span>+12% from last month</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Courses</p>
                                        <p className="text-xl font-bold">{courses.length || '15'}</p>
                                    </div>
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <FiBook className="text-green-600 text-lg" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center text-green-500 text-sm">
                                    <FiTrendingUp className="mr-1" />
                                    <span>+3 new courses</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Total Revenue</p>
                                        <p className="text-xl font-bold">${analytics.totalRevenue || '0'}</p>
                                    </div>
                                    <div className="bg-purple-100 p-2 rounded-full">
                                        <FiDollarSign className="text-purple-600 text-lg" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center text-green-500 text-sm">
                                    <FiTrendingUp className="mr-1" />
                                    <span>+8% from last month</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">Active Users</p>
                                        <p className="text-xl font-bold">{analytics.totalUsers || '4'}</p>
                                    </div>
                                    <div className="bg-yellow-100 p-2 rounded-full">
                                        <FiBarChart2 className="text-yellow-600 text-lg" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center text-green-500 text-sm">
                                    <FiTrendingUp className="mr-1" />
                                    <span>+5% from last week</span>
                                </div>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="text-lg font-semibold mb-4">User Growth</h3>
                                <div className="h-64">
                                    <Line data={userGrowthData} options={chartOptions} />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="text-lg font-semibold mb-4">Revenue Overview</h3>
                                <div className="h-64">
                                    <Bar data={revenueData} options={chartOptions} />
                                </div>
                            </div>
                        </div>

                        {/* Course Analytics */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="text-lg font-semibold mb-4">Course Enrollment</h3>
                                <div className="h-64">
                                    <Doughnut data={courseEnrollmentData} options={doughnutOptions} />
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-sm p-4 lg:col-span-2">
                                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                                <div className="space-y-4">
                                    {[1, 2, 3, 4].map((item) => (
                                        <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                                    <FiUsers className="text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">New user enrolled</p>
                                                    <p className="text-sm text-gray-500">2 hours ago</p>
                                                </div>
                                            </div>
                                            <span className="text-green-500 text-sm">Completed</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'courses':
                if (showAddCourse) {
                    return (
                        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
                            <div className="flex justify-between items-center mb-4 lg:mb-6">
                                <h2 className="text-lg lg:text-xl font-bold">Add New Course</h2>
                                <button
                                    onClick={() => setShowAddCourse(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                >
                                    <FiX className="text-xl" />
                                </button>
                            </div>
                            <form className="space-y-4 lg:space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Course Title
                                        </label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter course title"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Subtitle
                                        </label>
                                        <input
                                            type="text"
                                            name="subtitle"
                                            value={formData.subtitle}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter course subtitle"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleFormChange}
                                        className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows="4"
                                        placeholder="Enter course description"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Instructor
                                        </label>
                                        <input
                                            type="text"
                                            name="instructor"
                                            value={formData.instructor}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter instructor name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Instructor Title
                                        </label>
                                        <input
                                            type="text"
                                            name="instructorTitle"
                                            value={formData.instructorTitle}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter instructor title"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Level
                                        </label>
                                        <select
                                            name="level"
                                            value={formData.level}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Course Type
                                        </label>
                                        <select
                                            name="courseType"
                                            value={formData.courseType}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border-2 border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                                        >
                                            <option value="forex">Forex</option>
                                            <option value="crypto">Crypto</option>
                                        </select>
                                        <p className="mt-1 text-xs text-blue-600">Select whether this is a Forex or Crypto course</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Price
                                        </label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={formData.price}
                                            onChange={handleFormChange}
                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter course price"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Thumbnail
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                        className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="space-y-4 lg:space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base lg:text-lg font-semibold">Course Modules</h3>
                                        <button
                                            type="button"
                                            onClick={addModule}
                                            className="flex items-center px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            <FiPlus className="mr-1 lg:mr-2" />
                                            Add Module
                                        </button>
                                    </div>

                                    {formData.modules.map((module, moduleIndex) => (
                                        <div key={module.id} className="border rounded-lg p-3 lg:p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Module Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={module.title}
                                                        onChange={(e) => handleModuleChange(moduleIndex, 'title', e.target.value)}
                                                        className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Enter module title"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Module Price
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={module.price}
                                                        onChange={(e) => handleModuleChange(moduleIndex, 'price', e.target.value)}
                                                        className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Enter module price"
                                                    />
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Module Description
                                                </label>
                                                <textarea
                                                    value={module.description}
                                                    onChange={(e) => handleModuleChange(moduleIndex, 'description', e.target.value)}
                                                    className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                                        className="flex items-center px-3 lg:px-4 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                                    >
                                                        <FiPlus className="mr-1 lg:mr-2" />
                                                        Add Section
                                                    </button>
                                                </div>

                                                {module.sections.map((section, sectionIndex) => (
                                                    <div key={section.id} className="border rounded-lg p-3 lg:p-4 bg-gray-50">
                                                        <div className="mb-4">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Section Title
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={section.title}
                                                                onChange={(e) => handleSectionChange(moduleIndex, sectionIndex, 'title', e.target.value)}
                                                                className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                placeholder="Enter section title"
                                                            />
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center">
                                                                <h5 className="text-sm font-medium">Lessons</h5>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addLesson(moduleIndex, sectionIndex)}
                                                                    className="flex items-center px-3 lg:px-4 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                                                >
                                                                    <FiPlus className="mr-1 lg:mr-2" />
                                                                    Add Lesson
                                                                </button>
                                                            </div>

                                                            {section.lessons.map((lesson, lessonIndex) => (
                                                                <div key={lesson.id} className="border rounded-lg p-3 lg:p-4 bg-white">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                                Lesson Title
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={lesson.title}
                                                                                onChange={(e) => handleLessonChange(moduleIndex, sectionIndex, lessonIndex, 'title', e.target.value)}
                                                                                className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                                placeholder="Enter lesson title"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                                Duration
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={lesson.duration}
                                                                                onChange={(e) => handleLessonChange(moduleIndex, sectionIndex, lessonIndex, 'duration', e.target.value)}
                                                                                className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                                placeholder="e.g., 30 min"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-4">
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Lesson Type
                                                                        </label>
                                                                        <select
                                                                            value={lesson.type}
                                                                            onChange={(e) => handleLessonChange(moduleIndex, sectionIndex, lessonIndex, 'type', e.target.value)}
                                                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                            />
                                                                            <span className="ml-2 text-sm text-gray-700">Free Preview</span>
                                                                        </label>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                            Content
                                                                        </label>
                                                                        <input
                                                                            type="file"
                                                                            accept=".pdf,.mp4,.doc,.docx"
                                                                            onChange={(e) => handleContentUpload(e, moduleIndex, sectionIndex, lessonIndex)}
                                                                            className="w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        onClick={handleFormSubmit}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
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
                            <button
                                onClick={() => setShowAddCourse(true)}
                                className="flex items-center px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm w-full sm:w-auto"
                            >
                                <FiPlus className="mr-1 lg:mr-2" />
                                Add New Course
                            </button>
                        </div>
                        <CourseManagement />
                    </div>
                );
            case 'books':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <h2 className="text-xl font-bold">Books Management</h2>
                            <button
                                onClick={handleAddBook}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm w-full sm:w-auto mt-3 sm:mt-0"
                            >
                                <FiPlus className="mr-2" />
                                Add New Book
                            </button>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Cover
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Title
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Author
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Price
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {books.map((book) => (
                                            <tr key={book._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <img 
                                                        src={book.thumbnail} 
                                                        alt={book.title} 
                                                        className="h-16 w-12 object-cover rounded"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{book.title}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">{book.author}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500">${book.price}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => handleEditBook(book)}
                                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                                    >
                                                        <FiEdit2 className="inline mr-1" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBook(book._id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <FiTrash2 className="inline mr-1" />
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
            case 'upload':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Upload Course Content</h2>
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Upload Course Content</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Drag and drop files here, or click to select files
                                </p>
                                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
                                    Select Files
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Settings</h2>
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Platform Name</label>
                                    <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email Notifications</label>
                                    <div className="mt-2">
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                            <span className="ml-2">Enable email notifications</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Maintenance Mode</label>
                                    <div className="mt-2">
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
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
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-semibold mb-4">Coupon Management</h2>
                            
                            {/* Add New Coupon Form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <input
                                    type="text"
                                    placeholder="Coupon Code"
                                    className="border rounded-lg px-4 py-2"
                                    value={newCoupon.code}
                                    onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value})}
                                />
                                <input
                                    type="number"
                                    placeholder="Discount Amount"
                                    className="border rounded-lg px-4 py-2"
                                    value={newCoupon.discount}
                                    onChange={(e) => setNewCoupon({...newCoupon, discount: e.target.value})}
                                />
                                <input
                                    type="date"
                                    className="border rounded-lg px-4 py-2"
                                    value={newCoupon.validUntil}
                                    onChange={(e) => setNewCoupon({...newCoupon, validUntil: e.target.value})}
                                />
                                <input
                                    type="number"
                                    placeholder="Max Uses"
                                    className="border rounded-lg px-4 py-2"
                                    value={newCoupon.maxUses}
                                    onChange={(e) => setNewCoupon({...newCoupon, maxUses: e.target.value})}
                                />
                                <button
                                    onClick={handleAddCoupon}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Add Coupon
                                </button>
                            </div>

                            {/* Coupons List */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {coupons.map((coupon) => (
                                            <tr key={coupon.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">{coupon.code}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{coupon.discount}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{new Date(coupon.validUntil).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{coupon.uses}/{coupon.maxUses}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {coupon.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                                        className="text-red-600 hover:text-red-900"
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
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-100">
            {/* Mobile Header with Hamburger Menu */}
            <div className="lg:hidden flex items-center justify-between p-4 bg-white shadow-sm">
                <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 relative z-50"
                >
                    {isSidebarOpen ? (
                        <FiX className="text-gray-600 text-2xl" />
                    ) : (
                        <svg
                            className="w-6 h-6 text-gray-600"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Sidebar */}
            <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative inset-0 z-40 lg:z-auto w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}>
                <div className="p-4 lg:p-6">
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-800 hidden lg:block">Admin Panel</h1>
                </div>
                <nav className="mt-4 lg:mt-6">
                    <div className="px-2 lg:px-4 space-y-1 lg:space-y-2">
                        <button
                            onClick={() => {
                                setActiveTab('dashboard');
                                setIsSidebarOpen(false);
                            }}
                            className={`flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium rounded-lg ${
                                activeTab === 'dashboard'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <FiHome className="mr-2 lg:mr-3" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('courses');
                                setIsSidebarOpen(false);
                            }}
                            className={`flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium rounded-lg ${
                                activeTab === 'courses'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <FiBook className="mr-2 lg:mr-3" />
                            Courses
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('books');
                                setIsSidebarOpen(false);
                            }}
                            className={`flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium rounded-lg ${
                                activeTab === 'books'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <FiBookOpen className="mr-2 lg:mr-3" />
                            Books
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('upload');
                                setIsSidebarOpen(false);
                            }}
                            className={`flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium rounded-lg ${
                                activeTab === 'upload'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <FiVideo className="mr-2 lg:mr-3" />
                            Upload Content
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('settings');
                                setIsSidebarOpen(false);
                            }}
                            className={`flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium rounded-lg ${
                                activeTab === 'settings'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <FiSettings className="mr-2 lg:mr-3" />
                            Settings
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('coupons');
                                setIsSidebarOpen(false);
                            }}
                            className={`flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium rounded-lg ${
                                activeTab === 'coupons'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <FiTag className="mr-2 lg:mr-3" />
                            Coupons
                        </button>
                    </div>
                </nav>
                <div className="p-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <FiLogOut className="mr-2 lg:mr-3" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-4 lg:p-6">
                    {error && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {renderContent()}
                </div>
            </div>

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
        </div>
    );
};

export default AdminDashboard;