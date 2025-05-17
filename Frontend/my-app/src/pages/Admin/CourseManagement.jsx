import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    FiBook,
    FiUsers,
    FiFileText,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiEye,
    FiDownload,
    FiUpload,
    FiVideo,
    FiFile,
    FiImage,
    FiChevronRight,
    FiBarChart2,
    FiClock,
    FiDollarSign,
    FiCheckCircle,
    FiXCircle
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL;
// Mock data for testing
const mockCourses = [
    {
        _id: '1',
        title: 'Forex Trading for Beginners',
        level: 'beginner',
        price: 299,
        enrolledStudents: 25,
        isPublished: true,
        thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        modules: [
            {
                _id: 'm1',
                title: 'Introduction to Forex',
                description: 'Learn the basics of forex trading',
                content: []
            }
        ]
    },
    {
        _id: '2',
        title: 'Technical Analysis Mastery',
        level: 'intermediate',
        price: 399,
        enrolledStudents: 18,
        isPublished: true,
        thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
        modules: [
            {
                _id: 'm2',
                title: 'Chart Patterns',
                description: 'Master technical analysis patterns',
                content: []
            }
        ]
    }
];

const CourseManagement = () => {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('courses');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedModule, setSelectedModule] = useState(null);
    const [uploadType, setUploadType] = useState('video');

    const handleDeleteCourse = async (courseId) => {
        try {
            const token = localStorage.getItem('adminToken');
            await axios.delete(`${API_URL}/api/admin/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Refresh the courses list after deletion
            fetchCourses();
            setError('');
        } catch (err) {
            console.error('Error deleting course:', err);
            setError('Failed to delete course. Please try again later.');
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/api/admin/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Transform the courses to include full thumbnail URLs
            const coursesWithFullUrls = response.data.map(course => ({
                ...course,
                thumbnail: course.thumbnail ? `${API_URL}${course.thumbnail}` : null
            }));
            setCourses(Array.isArray(coursesWithFullUrls) ? coursesWithFullUrls : []);
            setError('');
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Failed to fetch courses. Please try again later.');
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCourseSelect = async (courseId) => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/courses/${courseId}`);
            setSelectedCourse(response.data);
            
            const studentsResponse = await axios.get(`${API_URL}/api/admin/courses/${courseId}/students`);
            setStudents(studentsResponse.data);
        } catch (err) {
            setError('Failed to fetch course details');
        }
    };

    const handleContentUpload = async (courseId, moduleId, file, type) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('moduleId', moduleId);
            formData.append('type', type);
            
            await axios.post(`${API_URL}/api/admin/courses/${courseId}/content`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            handleCourseSelect(courseId);
            setShowUploadModal(false);
        } catch (err) {
            setError('Failed to upload content');
        }
    };

    const handleDeleteContent = async (courseId, contentId) => {
        try {
            await axios.delete(`${API_URL}/api/admin/courses/${courseId}/content/${contentId}`);
            handleCourseSelect(courseId);
        } catch (err) {
            setError('Failed to delete content');
        }
    };

    const handleUpdateProgress = async (courseId, studentId, progress) => {
        try {
            await axios.put(`${API_URL}/api/admin/courses/${courseId}/students/${studentId}/progress`, {
                progress
            });
            handleCourseSelect(courseId);
        } catch (err) {
            setError('Failed to update progress');
        }
    };

    const UploadModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Upload Content</h3>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setUploadType('video')}
                            className={`flex-1 p-3 rounded-lg border ${
                                uploadType === 'video' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                        >
                            <FiVideo className="mx-auto mb-2" />
                            Video
                        </button>
                        <button
                            onClick={() => setUploadType('document')}
                            className={`flex-1 p-3 rounded-lg border ${
                                uploadType === 'document' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                        >
                            <FiFile className="mx-auto mb-2" />
                            Document
                        </button>
                        <button
                            onClick={() => setUploadType('image')}
                            className={`flex-1 p-3 rounded-lg border ${
                                uploadType === 'image' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                        >
                            <FiImage className="mx-auto mb-2" />
                            Image
                        </button>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                    <input
                        type="file"
                        accept={uploadType === 'video' ? 'video/*' : uploadType === 'image' ? 'image/*' : '.pdf,.doc,.docx'}
                        className="w-full p-2 border rounded-lg"
                        onChange={(e) => {
                            if (e.target.files[0]) {
                                handleContentUpload(selectedCourse._id, selectedModule._id, e.target.files[0], uploadType);
                            }
                        }}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setShowUploadModal(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
                        <p className="text-gray-600 mt-1">Manage your courses, students, and content</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-lg">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="border-b border-gray-200">
                            <nav className="flex -mb-px">
                                <button
                                    onClick={() => setActiveTab('courses')}
                                    className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                        activeTab === 'courses'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <FiBook />
                                    Courses
                                </button>
                                <button
                                    onClick={() => setActiveTab('students')}
                                    className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                        activeTab === 'students'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <FiUsers />
                                    Students
                                </button>
                                <button
                                    onClick={() => setActiveTab('content')}
                                    className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                        activeTab === 'content'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <FiFileText />
                                    Content
                                </button>
                            </nav>
                        </div>

                        <div className="p-6">
                            {activeTab === 'courses' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Array.isArray(courses) && courses.map(course => (
                                        <div
                                            key={course._id}
                                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                                        >
                                            <div className="relative h-48">
                                                <img
                                                    src={course.thumbnail || 'https://via.placeholder.com/300x200?text=No+Image'}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute top-2 right-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        course.isPublished
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {course.isPublished ? 'Published' : 'Draft'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                                    <div className="flex items-center gap-1">
                                                        <FiBarChart2 />
                                                        {course.level}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <FiUsers />
                                                        {course.enrolledStudents} students
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <FiDollarSign />
                                                        ${course.price}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs mb-4">
                                                    <span className={`px-2 py-1 rounded-full ${
                                                        course.courseType === 'crypto'
                                                            ? 'bg-purple-100 text-purple-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {course.courseType === 'crypto' ? 'Crypto' : 'Forex'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleCourseSelect(course._id)}
                                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700"
                                                    >
                                                        <FiEye />
                                                        View
                                                    </button>
                                                    <Link
                                                        to={`/admin/courses/edit/${course._id}`}
                                                        className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-yellow-700"
                                                    >
                                                        <FiEdit2 />
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteCourse(course._id)}
                                                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700"
                                                    >
                                                        <FiTrash2 />
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'students' && selectedCourse && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-semibold">
                                            Students in {selectedCourse.title}
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Search students..."
                                                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                                                Export
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Student
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Enrollment Date
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Progress
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {students.map((student) => (
                                                    <tr key={student._id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {student.name}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {student.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(student.enrolledAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                                        style={{ width: `${student.progress}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-sm text-gray-600">
                                                                    {student.progress}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span
                                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                    student.status === 'active'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : student.status === 'completed'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-red-100 text-red-800'
                                                                }`}
                                                            >
                                                                {student.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <button
                                                                onClick={() =>
                                                                    handleUpdateProgress(
                                                                        selectedCourse._id,
                                                                        student._id,
                                                                        student.progress + 10
                                                                    )
                                                                }
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                Update Progress
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'content' && selectedCourse && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-semibold">
                                            Course Content for {selectedCourse.title}
                                        </h2>
                                        <button
                                            onClick={() => {
                                                setSelectedModule(selectedCourse.modules[0]);
                                                setShowUploadModal(true);
                                            }}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                        >
                                            <FiPlus />
                                            Add Content
                                        </button>
                                    </div>
                                    <div className="space-y-6">
                                        {selectedCourse.modules.map((module) => (
                                            <div key={module._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                <div className="p-4 border-b border-gray-200">
                                                    <h3 className="text-lg font-medium">{module.title}</h3>
                                                    <p className="text-gray-600 text-sm">{module.description}</p>
                                                </div>
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {module.content.map((item) => (
                                                            <div
                                                                key={item._id}
                                                                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                                            >
                                                                <div className="flex items-center gap-3 mb-3">
                                                                    {item.type === 'video' ? (
                                                                        <FiVideo className="text-blue-600 text-xl" />
                                                                    ) : item.type === 'document' ? (
                                                                        <FiFile className="text-gray-600 text-xl" />
                                                                    ) : (
                                                                        <FiImage className="text-green-600 text-xl" />
                                                                    )}
                                                                    <div>
                                                                        <h4 className="font-medium">{item.title}</h4>
                                                                        <p className="text-sm text-gray-500">
                                                                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end gap-2">
                                                                    <button className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50">
                                                                        <FiDownload />
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteContent(
                                                                                selectedCourse._id,
                                                                                item._id
                                                                            )
                                                                        }
                                                                        className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                                                                    >
                                                                        <FiTrash2 />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {showUploadModal && <UploadModal />}
        </div>
    );
};

export default CourseManagement; 