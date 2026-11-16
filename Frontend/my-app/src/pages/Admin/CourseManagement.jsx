import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import {
    FiBook,
    FiUsers,
    FiFileText,
    FiPlus,
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

/** Admin API may return relative paths or full S3/CloudFront URLs, never double-prefix API_URL. */
function resolveCourseThumbnailUrl(thumbnail) {
  if (!thumbnail) return null;
  const raw = thumbnail.startsWith('http') ? thumbnail : `${API_URL}${thumbnail}`;
  return publicAssetUrl(raw);
}

// Mock data for testing

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

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/api/admin/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const coursesWithFullUrls = response.data.map((course) => ({
              ...course,
              thumbnail: resolveCourseThumbnailUrl(course.thumbnail),
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
        } catch {
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
        } catch {
            setError('Failed to upload content');
        }
    };

    const handleDeleteContent = async (courseId, contentId) => {
        try {
            await axios.delete(`${API_URL}/api/admin/courses/${courseId}/content/${contentId}`);
            handleCourseSelect(courseId);
        } catch {
            setError('Failed to delete content');
        }
    };

    const handleUpdateProgress = async (courseId, studentId, progress) => {
        try {
            await axios.put(`${API_URL}/api/admin/courses/${courseId}/students/${studentId}/progress`, {
                progress
            });
            handleCourseSelect(courseId);
        } catch {
            setError('Failed to update progress');
        }
    };

    const UploadModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-ink-850 rounded-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Upload Content</h3>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-fg-muted mb-2">Content Type</label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setUploadType('video')}
                            className={`flex-1 p-3 rounded-lg border ${
                                uploadType === 'video' ? 'border-brand-500 bg-brand-500/10' : 'border-line'
                            }`}
                        >
                            <FiVideo className="mx-auto mb-2" />
                            Video
                        </button>
                        <button
                            onClick={() => setUploadType('document')}
                            className={`flex-1 p-3 rounded-lg border ${
                                uploadType === 'document' ? 'border-brand-500 bg-brand-500/10' : 'border-line'
                            }`}
                        >
                            <FiFile className="mx-auto mb-2" />
                            Document
                        </button>
                        <button
                            onClick={() => setUploadType('image')}
                            className={`flex-1 p-3 rounded-lg border ${
                                uploadType === 'image' ? 'border-brand-500 bg-brand-500/10' : 'border-line'
                            }`}
                        >
                            <FiImage className="mx-auto mb-2" />
                            Image
                        </button>
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-fg-muted mb-2">File</label>
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
                        className="px-4 py-2 text-fg-muted hover:text-fg"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-ink-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-fg">Course Management</h1>
                        <p className="text-fg-muted mt-1">Manage your courses, students, and content</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-warn/10 border-l-4 border-warn text-warn p-4 mb-6 rounded-lg">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
                    </div>
                ) : (
                    <div className="bg-ink-850 rounded-xl shadow-lg overflow-hidden">
                        <div className="border-b border-line">
                            <nav className="flex -mb-px">
                                <button
                                    onClick={() => setActiveTab('courses')}
                                    className={`py-4 px-6 border-b-2 font-medium text-sm flex items-center gap-2 ${
                                        activeTab === 'courses'
                                            ? 'border-brand-500 text-brand-400'
                                            : 'border-transparent text-fg-subtle hover:text-fg-muted hover:border-line'
                                    }`}
                                >
                                    <FiBook />
                                    Courses
                                </button>
                            </nav>
                        </div>

                        <div className="p-6">
                            {activeTab === 'courses' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Array.isArray(courses) && courses.map(course => (
                                        <div
                                            key={course._id}
                                            className="bg-ink-850 rounded-xl border border-line overflow-hidden"
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
                                                            ? 'bg-up/10 text-up'
                                                            : 'bg-warn/10 text-warn'
                                                    }`}>
                                                        {course.isPublished ? 'Published' : 'Draft'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                                                <div className="flex items-center gap-4 text-sm text-fg-muted mb-4">
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
                                                            ? 'bg-brand-500/10 text-brand-300'
                                                            : 'bg-brand-500/10 text-brand-300'
                                                    }`}>
                                                        {course.courseType === 'crypto' ? 'Crypto' : 'Forex'}
                                                    </span>
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
                                                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                            <button className="bg-brand-600 text-white px-4 py-2 rounded-lg">
                                                Export
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-line">
                                            <thead className="bg-ink-900">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                        Student
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                        Enrollment Date
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                        Progress
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-fg-subtle uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-ink-850 divide-y divide-line">
                                                {students.map((student) => (
                                                    <tr key={student._id} className="hover:bg-ink-900">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="h-10 w-10 rounded-full bg-ink-700 flex items-center justify-center text-fg-muted font-medium">
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-medium text-fg">
                                                                        {student.name}
                                                                    </div>
                                                                    <div className="text-sm text-fg-subtle">
                                                                        {student.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-fg-subtle">
                                                            {new Date(student.enrolledAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-32 bg-ink-700 rounded-full h-2">
                                                                    <div
                                                                        className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                                                                        style={{ width: `${student.progress}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-sm text-fg-muted">
                                                                    {student.progress}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span
                                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                    student.status === 'active'
                                                                        ? 'bg-up/10 text-up'
                                                                        : student.status === 'completed'
                                                                        ? 'bg-brand-500/10 text-brand-300'
                                                                        : 'bg-down/10 text-down'
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
                                                                className="text-brand-400 hover:text-brand-300"
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
                                            className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700"
                                        >
                                            <FiPlus />
                                            Add Content
                                        </button>
                                    </div>
                                    <div className="space-y-6">
                                        {selectedCourse.modules.map((module) => (
                                            <div key={module._id} className="bg-ink-850 rounded-xl border border-line overflow-hidden">
                                                <div className="p-4 border-b border-line">
                                                    <h3 className="text-lg font-medium">{module.title}</h3>
                                                    <p className="text-fg-muted text-sm">{module.description}</p>
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
                                                                        <FiVideo className="text-brand-400 text-xl" />
                                                                    ) : item.type === 'document' ? (
                                                                        <FiFile className="text-fg-muted text-xl" />
                                                                    ) : (
                                                                        <FiImage className="text-up text-xl" />
                                                                    )}
                                                                    <div>
                                                                        <h4 className="font-medium">{item.title}</h4>
                                                                        <p className="text-sm text-fg-subtle">
                                                                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end gap-2">
                                                                    <button className="text-brand-400 hover:text-brand-300 p-2 rounded-lg hover:bg-brand-500/10">
                                                                        <FiDownload />
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteContent(
                                                                                selectedCourse._id,
                                                                                item._id
                                                                            )
                                                                        }
                                                                        className="text-down hover:text-down p-2 rounded-lg hover:bg-down/10"
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