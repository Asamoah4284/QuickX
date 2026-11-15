import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, session } from './api';

const AuthContext = createContext(null);

const EMPTY_ACCESS = { features: [], entitlements: [], isOwner: false, loaded: false };

/**
 * Who is signed in and what they have access to.
 * Session state lives in localStorage (shared with older pages); this provider
 * mirrors it and loads the member's entitlements.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => session.token());
  const [user, setUser] = useState(() => session.user());
  const [access, setAccess] = useState(EMPTY_ACCESS);

  useEffect(() => {
    const sync = () => {
      setToken(session.token());
      setUser(session.user());
    };
    window.addEventListener('auth-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('auth-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const refreshAccess = useCallback(async () => {
    if (!session.token()) {
      setAccess({ ...EMPTY_ACCESS, loaded: true });
      return;
    }
    try {
      const { data } = await api.get('/api/me/entitlements');
      setAccess({
        features: data.features || [],
        entitlements: data.entitlements || [],
        isOwner: Boolean(data.isOwner),
        loaded: true,
      });
    } catch {
      setAccess((prev) => ({ ...prev, loaded: true }));
    }
  }, []);

  useEffect(() => {
    setAccess((prev) => ({ ...prev, loaded: false }));
    refreshAccess();
  }, [token, refreshAccess]);

  const value = useMemo(() => {
    const isSignedIn = Boolean(token && user);
    return {
      user,
      token,
      isSignedIn,
      features: access.features,
      entitlements: access.entitlements,
      isOwner: access.isOwner,
      accessLoaded: access.loaded,
      has: (feature) => access.features.includes(feature),
      expiryOf: (feature) => access.entitlements.find((e) => e.feature === feature)?.endsAt || null,
      refreshAccess,
      signIn: (nextToken, nextUser) => session.set(nextToken, nextUser),
      signOut: () => session.clear(),
    };
  }, [token, user, access, refreshAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Wrap a route element: sends signed-out visitors to /login and brings them back afterwards. */
export function RequireAuth({ children }) {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  if (!isSignedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/** Wrap an admin route element. */
export function RequireAdmin({ children }) {
  const location = useLocation();
  if (!session.adminToken()) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return children;
}
