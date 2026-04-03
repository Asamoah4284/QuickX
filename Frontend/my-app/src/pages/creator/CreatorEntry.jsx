import { Navigate } from 'react-router-dom';

export default function CreatorEntry() {
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;
  const hasCreatorAccess = user?.role === 'tutor' && user?.creatorStatus === 'approved';

  return <Navigate to={hasCreatorAccess ? '/creator/dashboard' : '/creator/onboarding'} replace />;
}
