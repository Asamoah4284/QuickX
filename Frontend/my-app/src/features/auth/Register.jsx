import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, session } from '../../lib/api';
import { savePendingCheckout } from '../../utils/pendingCheckout';
import { Alert, Button, Field, Input } from '../../ui/primitives';
import AuthShell, { PASSWORD_HINT, PasswordInput, passwordProblem } from './AuthShell';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const checkout = location.state?.checkout || null;
  const [form, setForm] = useState(() => ({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    // Shareable sign-up links carry the referrer's code: /register?ref=ABC123
    referralCode: String(new URLSearchParams(location.search).get('ref') || '').trim().toUpperCase(),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (checkout?.item) savePendingCheckout(checkout);
  }, [checkout]);

  const submit = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(form.password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        ...(form.referralCode.trim() ? { referralCode: form.referralCode.trim().toUpperCase() } : {}),
      };
      const { data } = await api.post('/api/users/register', payload);
      sessionStorage.setItem('justRegistered', 'true');
      session.set(data.token, data.user);
      navigate(`/verify-account?email=${encodeURIComponent(payload.email)}&phone=${encodeURIComponent(payload.phone)}`, {
        state: { from: location.state?.from || null, checkout },
      });
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.message ||
          data?.errors?.[0]?.msg ||
          (err.response ? 'Could not create your account. Please check the form.' : 'Cannot reach the server. Check your connection and try again.')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to join. Watch preview lessons before you buy anything."
      pageTitle="Sign up"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-brand-400 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" htmlFor="reg-name">
          <Input id="reg-name" autoComplete="name" value={form.fullName} onChange={set('fullName')} required />
        </Field>
        <Field label="Email" htmlFor="reg-email">
          <Input id="reg-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Phone number" htmlFor="reg-phone" hint="We send your verification code here.">
          <Input id="reg-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0241234567" value={form.phone} onChange={set('phone')} required />
        </Field>
        <Field label="Password" htmlFor="reg-password" hint={PASSWORD_HINT}>
          <PasswordInput id="reg-password" autoComplete="new-password" value={form.password} onChange={set('password')} required />
        </Field>
        <Field label="Referral code" htmlFor="reg-ref" hint="Optional. Enter the code of the person who invited you.">
          <Input
            id="reg-ref"
            value={form.referralCode}
            onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value.toUpperCase() }))}
            maxLength={6}
            autoComplete="off"
          />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
