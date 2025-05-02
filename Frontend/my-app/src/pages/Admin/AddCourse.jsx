import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload, FiPlus, FiX, FiSave, FiEye } from 'react-icons/fi';
import axios from 'axios';


const API_URL = import.meta.env.VITE_API_URL;

const AddCourse = () => {
    const navigate = useNavigate();
    const { courseId } = useParams();
    const isEditMode = !!courseId;
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        shortDescription: '',
        thumbnail: null,
        level: 'beginner',
        price: 0,
        tags: [],
        startDate: '',
        endDate: '',
        modules: []
    });
    const [newTag, setNewTag] = useState('');
    const [newModule, setNewModule] = useState({ 
        title: '', 
        description: '',
        sections: []
    });
    const [newSection, setNewSection] = useState({
        title: '',
        description: '',
        lessons: []
    });
    const [newLesson, setNewLesson] = useState({
        title: '',
        type: 'video',
        duration: '',
        description: '',
        free: false,
        videoFile: null
    });
    const [selectedModuleIndex, setSelectedModuleIndex] = useState(null);
    const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (isEditMode) {
            fetchCourse();
        }
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            setInitialLoading(true);
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('No admin token found');
            }

            const response = await axios.get(
                `${API_URL}/api/admin/courses/${courseId}`,
                {
                    headers: { Authorization: `Bearer ${adminToken}` }
                }
            );

            const course = response.data;
            
            // Transform the course data to match our form structure
            setFormData({
                title: course.title || '',
                description: course.description || '',
                shortDescription: course.shortDescription || '',
                thumbnail: course.thumbnail || null,
                level: course.level || 'beginner',
                price: course.price || 0,
                tags: course.tags || [],
                startDate: course.startDate || '',
                endDate: course.endDate || '',
                modules: course.modules || []
            });
            
            setError('');
        } catch (err) {
            console.error('Error fetching course:', err);
            setError('Failed to fetch course details');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTagAdd = () => {
        if (newTag && !formData.tags.includes(newTag)) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag]
            }));
            setNewTag('');
        }
    };

    const handleTagRemove = (tag) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tag)
        }));
    };

    const handleModuleAdd = () => {
        if (newModule.title) {
            const moduleToAdd = {
                ...newModule,
                id: Date.now(),
                sections: []  // Initialize with empty sections array
            };
            
            setFormData(prev => ({
                ...prev,
                modules: [...prev.modules, moduleToAdd]
            }));
            setNewModule({ title: '', description: '', sections: [] });
        }
    };

    const handleModuleRemove = (id) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.filter(m => m.id !== id)
        }));
    };

    const handleSectionAdd = (moduleIndex) => {
        if (newSection.title) {
            const updatedModules = [...formData.modules];
            updatedModules[moduleIndex].sections = [
                ...updatedModules[moduleIndex].sections,
                {
                    ...newSection,
                    id: Date.now()
                }
            ];
            
            setFormData(prev => ({
                ...prev,
                modules: updatedModules
            }));
            setNewSection({ title: '', description: '', lessons: [] });
            setSelectedModuleIndex(null); // Reset after adding
        }
    };

    const handleSectionRemove = (moduleIndex, sectionId) => {
        const updatedModules = [...formData.modules];
        updatedModules[moduleIndex].sections = updatedModules[moduleIndex].sections.filter(
            s => s.id !== sectionId
        );
        
        setFormData(prev => ({
            ...prev,
            modules: updatedModules
        }));
    };

    const handleVideoFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log('Video file selected:', {
                name: file.name,
                type: file.type,
                size: file.size
            });
            
            // Check if the file is a video
            if (!file.type.startsWith('video/')) {
                setError('Please select a valid video file.');
                return;
            }
            
            // Check file size (limit to 100MB)
            if (file.size > 100 * 1024 * 1024) {
                setError('Video file size should be less than 100MB.');
                return;
            }
            
            setNewLesson(prev => ({
                ...prev,
                videoFile: file
            }));
        }
    };

    const handleLessonAdd = async (moduleIndex, sectionIndex) => {
        if (newLesson.title) {
            // If it's a video lesson and there's a video file, upload it first
            if (newLesson.type === 'video' && newLesson.videoFile) {
                try {
                    setLoading(true);
                    setUploadProgress(0);
                    
                    // Create FormData for video upload
                    const videoFormData = new FormData();
                    videoFormData.append('video', newLesson.videoFile);
                    videoFormData.append('title', newLesson.title);
                    videoFormData.append('description', newLesson.description || '');
                    videoFormData.append('duration', newLesson.duration || '0min');
                    videoFormData.append('free', newLesson.free);
                    
                    // Get admin token
                    const adminToken = localStorage.getItem('adminToken');
                    if (!adminToken) {
                        throw new Error('No admin token found');
                    }
                    
                    // Upload video to S3
                    const response = await axios.post(
                        `${API_URL}/api/videos/upload`,
                        videoFormData,
                        {
                            headers: {
                                'Authorization': `Bearer ${adminToken}`,
                                'Content-Type': 'multipart/form-data'
                            },
                            onUploadProgress: (progressEvent) => {
                                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                setUploadProgress(percentCompleted);
                            }
                        }
                    );
                    
                    // Add the lesson with the S3 URL
                    const updatedModules = [...formData.modules];
                    updatedModules[moduleIndex].sections[sectionIndex].lessons = [
                        ...updatedModules[moduleIndex].sections[sectionIndex].lessons,
                        {
                            ...newLesson,
                            id: Date.now(),
                            videoUrl: response.data.url,
                            videoKey: response.data.key,
                            duration: response.data.duration || '0min'
                        }
                    ];
                    
                    setFormData(prev => ({
                        ...prev,
                        modules: updatedModules
                    }));
                    
                    // Reset the new lesson form
                    setNewLesson({
                        title: '',
                        type: 'video',
                        duration: '',
                        description: '',
                        free: false,
                        videoFile: null
                    });
                    
                    setUploadProgress(0);
                } catch (error) {
                    console.error('Error uploading video:', error);
                    setError('Failed to upload video. Please try again.');
                } finally {
                    setLoading(false);
                }
            } else {
                // For non-video lessons or lessons without a video file
                const updatedModules = [...formData.modules];
                updatedModules[moduleIndex].sections[sectionIndex].lessons = [
                    ...updatedModules[moduleIndex].sections[sectionIndex].lessons,
                    {
                        ...newLesson,
                        id: Date.now(),
                        videoUrl: '',
                        videoKey: '',
                        duration: newLesson.duration || '0min'
                    }
                ];
                
                setFormData(prev => ({
                    ...prev,
                    modules: updatedModules
                }));
                
                // Reset the new lesson form
                setNewLesson({
                    title: '',
                    type: 'video',
                    duration: '',
                    description: '',
                    free: false,
                    videoFile: null
                });
            }
        }
    };

    const handleLessonRemove = async (moduleIndex, sectionIndex, lessonId) => {
        try {
            const lesson = formData.modules[moduleIndex].sections[sectionIndex].lessons.find(
                l => l.id === lessonId
            );

            // If it's a video lesson with a videoKey, delete from S3
            if (lesson.type === 'video' && lesson.videoKey) {
                const adminToken = localStorage.getItem('adminToken');
                if (!adminToken) {
                    throw new Error('No admin token found');
                }

                await axios.delete(
                    `${API_URL}/api/videos/${lesson.videoKey}`,
                    {
                        headers: { Authorization: `Bearer ${adminToken}` }
                    }
                );
            }

            // Remove the lesson from the course data
            const updatedModules = [...formData.modules];
            updatedModules[moduleIndex].sections[sectionIndex].lessons = 
                updatedModules[moduleIndex].sections[sectionIndex].lessons.filter(
                    l => l.id !== lessonId
                );
            
            setFormData(prev => ({
                ...prev,
                modules: updatedModules
            }));
        } catch (error) {
            console.error('Error removing lesson:', error);
            setError('Failed to remove lesson. Please try again.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // First, upload all videos
            const processedModules = await Promise.all(formData.modules.map(async (module, moduleIndex) => {
                const processedSections = await Promise.all(module.sections.map(async (section, sectionIndex) => {
                    const processedLessons = await Promise.all(section.lessons.map(async (lesson, lessonIndex) => {
                        if (lesson.type === 'video' && lesson.videoFile) {
                            try {
                                const videoFormData = new FormData();
                                videoFormData.append('video', lesson.videoFile);
                                videoFormData.append('title', lesson.title);
                                videoFormData.append('description', lesson.description || '');
                                videoFormData.append('duration', lesson.duration || '0min');
                                videoFormData.append('free', lesson.free);

                                const adminToken = localStorage.getItem('adminToken');
                                const response = await axios.post(
                                    'http://localhost:5000/api/videos/upload',
                                    videoFormData,
                                    {
                                        headers: {
                                            'Authorization': `Bearer ${adminToken}`,
                                            'Content-Type': 'multipart/form-data'
                                        }
                                    }
                                );

                                return {
                                    ...lesson,
                                    videoUrl: response.data.url,
                                    videoKey: response.data.key,
                                    duration: response.data.duration || lesson.duration || '0min',
                                    order: lessonIndex + 1
                                };
                            } catch (error) {
                                console.error('Error uploading video:', error);
                                throw new Error(`Failed to upload video for lesson: ${lesson.title}`);
                            }
                        }
                        return {
                            ...lesson,
                            order: lessonIndex + 1
                        };
                    }));

                    return {
                        ...section,
                        order: sectionIndex + 1,
                        lessons: processedLessons
                    };
                }));

                return {
                    ...module,
                    order: moduleIndex + 1,
                    sections: processedSections
                };
            }));

            // Now create the course with the processed modules
            const courseData = {
                ...formData,
                modules: processedModules,
                tags: formData.tags || [],
                instructor: formData.instructor || '',
                instructorModel: formData.instructorModel || 'Admin'
            };

            // Create FormData for course creation
            const courseFormData = new FormData();
            courseFormData.append('title', courseData.title);
            courseFormData.append('description', courseData.description);
            courseFormData.append('shortDescription', courseData.shortDescription);
            courseFormData.append('price', courseData.price);
            courseFormData.append('level', courseData.level);
            courseFormData.append('tags', JSON.stringify(courseData.tags));
            courseFormData.append('instructor', courseData.instructor);
            courseFormData.append('instructorModel', courseData.instructorModel);
            courseFormData.append('modules', JSON.stringify(courseData.modules));
            
            if (formData.thumbnail) {
                courseFormData.append('thumbnail', formData.thumbnail);
            }

            const adminToken = localStorage.getItem('adminToken');
            const response = await axios.post(
                'http://localhost:5000/api/admin/courses',
                courseFormData,
                {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            console.log('Course created successfully:', response.data);
            navigate('/admin/dashboard');
        } catch (error) {
            console.error('Error creating course:', error);
            setError(error.response?.data?.message || error.message || 'Failed to create course');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Course' : 'Add New Course'}</h1>
                <div className="flex gap-3">
                    <button
                        type="submit"
                        form="courseForm"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Course' : 'Create Course')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}

            <form id="courseForm" onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Course Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Short Description</label>
                            <textarea
                                name="shortDescription"
                                value={formData.shortDescription}
                                onChange={handleChange}
                                rows="2"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Thumbnail Image</label>
                                <div className="mt-1 flex items-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.files[0] }))}
                                        className="hidden"
                                        id="thumbnail"
                                    />
                                    <label
                                        htmlFor="thumbnail"
                                        className="cursor-pointer flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <FiUpload className="mr-2" />
                                        Upload Image
                                    </label>
                                    {formData.thumbnail && (
                                        <span className="ml-3 text-sm text-gray-500">
                                            {formData.thumbnail instanceof File ? formData.thumbnail.name : 'Current image'}
                                        </span>
                                    )}
                                </div>
                            </div>



                    </div>
                </div>

                {/* Course Details */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Course Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Skill Level</label>
                            <select
                                name="level"
                                value={formData.level}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Price</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                min="0"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Start Date (Optional)</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Tags */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Tags</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {formData.tags.map(tag => (
                            <span
                                key={tag}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleTagRemove(tag)}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                    <FiX size={16} />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add new tag"
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={handleTagAdd}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Add
                        </button>
                    </div>
                </div>

                {/* Modules */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Course Modules</h2>
                    <div className="space-y-6">
                        {formData.modules.map((module, moduleIndex) => (
                            <div
                                key={module.id}
                                className="border border-gray-200 rounded-lg overflow-hidden"
                            >
                                <div className="flex items-start justify-between p-4 bg-gray-50">
                                <div>
                                        <h3 className="font-medium">Module {moduleIndex + 1}: {module.title}</h3>
                                    <p className="text-sm text-gray-600">{module.description}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleModuleRemove(module.id)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <FiX size={20} />
                                </button>
                                </div>

                                {/* Sections within this module */}
                                <div className="p-4 space-y-4">
                                    <h4 className="font-medium text-sm text-gray-700">Sections</h4>
                                    
                                    {module.sections.map((section, sectionIndex) => (
                                        <div key={section.id} className="pl-4 border-l-2 border-gray-200">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h5 className="font-medium">Section {sectionIndex + 1}: {section.title}</h5>
                                                    <p className="text-xs text-gray-600">{section.description}</p>
                                                </div>
                                                <div className="flex">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedModuleIndex(moduleIndex);
                                                            setSelectedSectionIndex(sectionIndex);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 mr-2"
                                                    >
                                                        <FiPlus size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSectionRemove(moduleIndex, section.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <FiX size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Lessons within this section */}
                                            <div className="pl-4 space-y-2 mb-3">
                                                {section.lessons.map((lesson, lessonIndex) => (
                                                    <div key={lesson.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                                                        <div>
                                                            <span className="font-medium">{lessonIndex + 1}. {lesson.title}</span>
                                                            <span className="ml-2 text-xs text-gray-500">({lesson.type})</span>
                                                            {lesson.free && <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Free</span>}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLessonRemove(moduleIndex, sectionIndex, lesson.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add lesson form (conditionally rendered) */}
                                            {selectedModuleIndex === moduleIndex && 
                                             selectedSectionIndex === sectionIndex && (
                                                <div className="bg-blue-50 p-3 rounded-lg mb-3">
                                                    <h6 className="font-medium text-sm mb-2">Add New Lesson</h6>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                                        <input
                                                            type="text"
                                                            value={newLesson.title}
                                                            onChange={(e) => setNewLesson(prev => ({ ...prev, title: e.target.value }))}
                                                            placeholder="Lesson title"
                                                            className="rounded-md text-sm border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                        />
                                                        <select
                                                            value={newLesson.type}
                                                            onChange={(e) => setNewLesson(prev => ({ ...prev, type: e.target.value }))}
                                                            className="rounded-md text-sm border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                        >
                                                            <option value="video">Video</option>
                                                            <option value="ebook">E-Book</option>
                                                            <option value="quiz">Quiz</option>
                                                            <option value="workshop">Workshop</option>
                                                        </select>
                                                    </div>
                                                    
                                                    {/* Video file upload field - only show if type is video */}
                                                    {newLesson.type === 'video' && (
                                                        <div className="mb-2">
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Video File</label>
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="file"
                                                                    accept="video/*"
                                                                    onChange={handleVideoFileChange}
                                                                    className="hidden"
                                                                    id="videoFile"
                                                                />
                                                                <label
                                                                    htmlFor="videoFile"
                                                                    className="cursor-pointer flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                                >
                                                                    <FiUpload className="mr-1" />
                                                                    {newLesson.videoFile ? newLesson.videoFile.name : 'Select Video'}
                                                                </label>
                                                            </div>
                                                            {uploadProgress > 0 && uploadProgress < 100 && (
                                                                <div className="mt-1 w-full bg-gray-200 rounded-full h-2.5">
                                                                    <div 
                                                                        className="bg-blue-600 h-2.5 rounded-full" 
                                                                        style={{ width: `${uploadProgress}%` }}
                                                                    ></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                                        <input
                                                            type="text"
                                                            value={newLesson.duration}
                                                            onChange={(e) => setNewLesson(prev => ({ ...prev, duration: e.target.value }))}
                                                            placeholder="Duration (e.g. 10:30)"
                                                            className="rounded-md text-sm border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                        />
                                                        <div className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                id="lessonFree"
                                                                checked={newLesson.free}
                                                                onChange={(e) => setNewLesson(prev => ({ ...prev, free: e.target.checked }))}
                                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 mr-2"
                                                            />
                                                            <label htmlFor="lessonFree" className="text-sm">Free Preview</label>
                                                        </div>
                                                    </div>
                                                    <textarea
                                                        value={newLesson.description}
                                                        onChange={(e) => setNewLesson(prev => ({ ...prev, description: e.target.value }))}
                                                        placeholder="Lesson description"
                                                        rows="2"
                                                        className="w-full rounded-md text-sm border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-2"
                                                    ></textarea>
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedSectionIndex(null)}
                                                            className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleLessonAdd(moduleIndex, sectionIndex)}
                                                            disabled={loading || (newLesson.type === 'video' && !newLesson.videoFile)}
                                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                        >
                                                            {loading ? 'Uploading...' : 'Add Lesson'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add section form */}
                                    {selectedModuleIndex === moduleIndex && selectedSectionIndex === null && (
                                        <div className="border-l-2 border-blue-200 pl-4 mb-3">
                                            <div className="bg-blue-50 p-3 rounded-lg">
                                                <h5 className="font-medium text-sm mb-2">Add New Section</h5>
                                                <input
                                                    type="text"
                                                    value={newSection.title}
                                                    onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                                                    placeholder="Section title"
                                                    className="w-full rounded-md text-sm border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-2"
                                                />
                                                <textarea
                                                    value={newSection.description}
                                                    onChange={(e) => setNewSection(prev => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Section description"
                                                    rows="2"
                                                    className="w-full rounded-md text-sm border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-2"
                                                ></textarea>
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedModuleIndex(null)}
                                                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSectionAdd(moduleIndex)}
                                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                    >
                                                        Add Section
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedModuleIndex(moduleIndex);
                                            setSelectedSectionIndex(null);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                                    >
                                        <FiPlus size={16} className="mr-1" />
                                        Add Section
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add new module */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newModule.title}
                                onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Module title"
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            <input
                                type="text"
                                value={newModule.description}
                                onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Module description"
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            <button
                                type="button"
                                onClick={handleModuleAdd}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Add Module
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/courses')}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Course' : 'Create Course')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddCourse; 