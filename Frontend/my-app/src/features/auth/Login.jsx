import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage, session } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { savePendingCheckout } from '../../utils/pendingCheckout';
import { Alert, Button, Field, Input } from '../../ui/primitives';
import AuthShell, { afterAuth, PasswordInput } from './AuthShell';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signedInHere, setSignedInHere] = useState(false);

  useEffect(() => {
    if (location.state?.checkout?.item) savePendingCheckout(location.state.checkout);
  }, [location.state]);

  // Already signed in (and not in the middle of signing in on this screen).
  if (isSignedIn && !signedInHere) return <Navigate to="/account" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/api/users/login', { email: form.email.trim(), password: form.password });
      setSignedInHere(true);
      sessionStorage.removeItem('justRegistered');
      session.set(data.token, data.user);
      afterAuth(navigate, location.state);
    } catch (err) {
      setError(errorMessage(err, 'Could not log in. Check your details and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to continue."
      pageTitle="Log in"
      footer={
        <>
          New to QuickX?{' '}
          <Link to="/register" state={location.state} className="font-semibold text-brand-400 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            required
          />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-400 hover:underline">
            Forgot password?
          </Link>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}
