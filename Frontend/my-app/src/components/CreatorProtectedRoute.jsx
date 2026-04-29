import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Loader from './Loader';

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
    return <Loader label="Checking creator access…" sublabel="Making sure your creator tools are ready." />;
  }

  if (access === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (access !== 'approved') {
    return <Navigate to="/creator/onboarding" replace />;
  }

  return children;
}
