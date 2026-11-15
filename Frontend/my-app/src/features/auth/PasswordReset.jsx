import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { FiCheckCircle, FiMail } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { Alert, Button, Field, Input } from '../../ui/primitives';
import AuthShell, { PASSWORD_HINT, PasswordInput, passwordProblem } from './AuthShell';

const backToLogin = (
  <Link to="/login" className="font-semibold text-brand-400 hover:underline">
    Back to log in
  </Link>
);

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/users/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the reset link. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" pageTitle="Reset password" footer={backToLogin}>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
            <FiMail className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-fg-muted">
            If an account exists for <strong className="text-fg">{email}</strong>, a link to reset your password is on its way. It can take a minute, and may land in spam.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send you a reset link." pageTitle="Reset password" footer={backToLogin}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" htmlFor="forgot-email">
          <Input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) return <Navigate to="/forgot-password" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError('');
    try {
      await api.post('/api/users/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'This reset link is invalid or has expired. Request a new one.'));
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  if (done) {
    return (
      <AuthShell title="Password updated" pageTitle="Reset password">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-up/15 text-up">
            <FiCheckCircle className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm text-fg-muted">You can now log in with your new password.</p>
          <Button className="mt-6 w-full" size="lg" onClick={() => navigate('/login')}>
            Log in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" pageTitle="Reset password" footer={backToLogin}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" htmlFor="reset-password" hint={PASSWORD_HINT}>
          <PasswordInput id="reset-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Field label="Repeat new password" htmlFor="reset-confirm">
          <PasswordInput id="reset-confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
