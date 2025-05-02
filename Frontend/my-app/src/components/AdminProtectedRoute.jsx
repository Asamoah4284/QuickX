import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminProtectedRoute = ({ children }) => {
    const adminToken = localStorage.getItem('adminToken');
    const admin = JSON.parse(localStorage.getItem('admin'));

    if (!adminToken || !admin) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

export default AdminProtectedRoute; 