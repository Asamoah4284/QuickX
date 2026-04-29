import { Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Loader from './Loader';

const API_URL = import.meta.env.VITE_API_URL;

function ProtectedRoute({ children }) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setIsAuthenticated(false);
          setIsChecking(false);
          return;
        }
        
        // Validate token with the backend
        const response = await axios.get(`${API_URL}/api/users/validate-token`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.isAuthenticated) {
          setIsAuthenticated(true);
          
          // Update user data in localStorage if needed
          if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        } else {
          // Clear invalid/expired tokens
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear invalid/expired tokens
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Show loading while checking authentication
  if (isChecking) {
    return <Loader label="Verifying your access…" sublabel="Just a moment while we check your session." />;
  }

  if (!isAuthenticated) {
    // Redirect to login and save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute; 