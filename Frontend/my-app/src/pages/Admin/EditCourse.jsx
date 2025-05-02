import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    FiSave,
    FiX,
    FiBook,
    FiDollarSign,
    FiBarChart2,
    FiImage,
    FiPlus,
    FiTrash2
} from 'react-icons/fi';

const EditCourse = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [course, setCourse] = useState({
        title: '',
        description: '',
        shortDescription: '',
        thumbnail: '',
        price: 0,
        level: 'beginner',
        tags: [],
        modules: []
    });

    useEffect(() => {
        fetchCourse();
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`http://localhost:5000/api/admin/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourse(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching course:', err);
            setError('Failed to fetch course details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            await axios.put(`http://localhost:5000/api/admin/courses/${courseId}`, course, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/admin/courses');
        } catch (err) {
            setError('Failed to update course');
        }
    };

    const handleModuleChange = (index, field, value) => {
        const updatedModules = [...course.modules];
        updatedModules[index] = { ...updatedModules[index], [field]: value };
        setCourse({ ...course, modules: updatedModules });
    };

    const addModule = () => {
        setCourse({
            ...course,
            modules: [
                ...course.modules,
                {
                    title: '',
                    description: '',
                    sections: []
                }
            ]
        });
    };

    const removeModule = (index) => {
        const updatedModules = course.modules.filter((_, i) => i !== index);
        setCourse({ ...course, modules: updatedModules });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
                    <button
                        onClick={() => navigate('/admin/courses')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        <FiX />
                        Cancel
                    </button>
                </div>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Course Title
                                </label>
                                <input
                                    type="text"
                                    value={course.title}
                                    onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Short Description
                                </label>
                                <input
                                    type="text"
                                    value={course.shortDescription}
                                    onChange={(e) => setCourse({ ...course, shortDescription: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Description
                                </label>
                                <textarea
                                    value={course.description}
                                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Price
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiDollarSign className="text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            value={course.price}
                                            onChange={(e) => setCourse({ ...course, price: parseFloat(e.target.value) })}
                                            className="w-full pl-8 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Level
                                    </label>
                                    <select
                                        value={course.level}
                                        onChange={(e) => setCourse({ ...course, level: e.target.value })}
                                        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Thumbnail URL
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FiImage className="text-gray-400" />
                                    </div>
                                    <input
                                        type="url"
                                        value={course.thumbnail}
                                        onChange={(e) => setCourse({ ...course, thumbnail: e.target.value })}
                                        className="w-full pl-8 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Course Modules</h2>
                            <button
                                type="button"
                                onClick={addModule}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <FiPlus />
                                Add Module
                            </button>
                        </div>

                        <div className="space-y-6">
                            {course.modules.map((module, index) => (
                                <div key={index} className="border rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-medium">Module {index + 1}</h3>
                                        <button
                                            type="button"
                                            onClick={() => removeModule(index)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Module Title
                                            </label>
                                            <input
                                                type="text"
                                                value={module.title}
                                                onChange={(e) => handleModuleChange(index, 'title', e.target.value)}
                                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Module Description
                                            </label>
                                            <textarea
                                                value={module.description}
                                                onChange={(e) => handleModuleChange(index, 'description', e.target.value)}
                                                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <FiSave />
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCourse; 