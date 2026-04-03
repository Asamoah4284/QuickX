import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export default function CreatorProtectedRoute({ children }) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [access, setAccess] = useState('pending');

  useEffect(() => {
    let mounted = true;

    async function checkCreatorAccess() {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          if (mounted) {
            setAccess('unauthenticated');
            setIsChecking(false);
          }
          return;
        }

        const { data } = await axios.get(`${API_URL}/api/users/validate-token`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        localStorage.setItem('user', JSON.stringify(data.user));

        if (mounted) {
          const hasCreatorAccess =
            data.user?.role === 'tutor' && data.user?.creatorStatus === 'approved';
          setAccess(hasCreatorAccess ? 'approved' : 'not-approved');
          setIsChecking(false);
        }
      } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        if (mounted) {
          setAccess('unauthenticated');
          setIsChecking(false);
        }
      }
    }

    checkCreatorAccess();

    return () => {
      mounted = false;
    };
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="mt-3 text-sm text-slate-500">Checking creator access...</p>
        </div>
      </div>
    );
  }

  if (access === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (access !== 'approved') {
    return <Navigate to="/creator/onboarding" replace />;
  }

  return children;
}
