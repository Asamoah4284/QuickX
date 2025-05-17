import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CourseForm from './CourseForm';

const API_URL = import.meta.env.VITE_API_URL;

const AddCourse = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAddCourse = async (formData) => {
        setLoading(true);
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
            const adminToken = localStorage.getItem('adminToken');
            await axios.post(`${API_URL}/api/admin/courses`, courseFormData, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Course</h1>
            <CourseForm
                initialValues={{}}
                onSubmit={handleAddCourse}
                mode="add"
                loading={loading}
                error={error}
            />
        </div>
    );
};

export default AddCourse; 