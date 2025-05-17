import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CourseForm from './CourseForm';

const API_URL = import.meta.env.VITE_API_URL;

const EditCourse = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [course, setCourse] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCourse();
        // eslint-disable-next-line
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/api/admin/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourse(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch course details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCourse = async (formData) => {
        setSaving(true);
        setError('');
        try {
            const courseFormData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'modules' || key === 'tags') {
                    courseFormData.append(key, JSON.stringify(value));
                } else if (key === 'thumbnail' && value instanceof File) {
                    courseFormData.append('thumbnail', value);
                } else {
                    courseFormData.append(key, value);
                }
            });
            const token = localStorage.getItem('adminToken');
            await axios.put(`${API_URL}/api/admin/courses/${courseId}`, courseFormData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to update course');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Course</h1>
            <CourseForm
                initialValues={course || {}}
                onSubmit={handleUpdateCourse}
                mode="edit"
                loading={saving}
                error={error}
            />
        </div>
    );
};

export default EditCourse; 