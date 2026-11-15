import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage, session } from '../../lib/api';
import { savePendingCheckout } from '../../utils/pendingCheckout';
import { Alert, Button } from '../../ui/primitives';
import AuthShell, { afterAuth } from './AuthShell';

const LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const email = params.get('email') || '';
  const phone = params.get('phone') || '';

  const [digits, setDigits] = useState(Array(LENGTH).fill(''));
  const inputs = useRef([]);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (location.state?.checkout?.item) savePendingCheckout(location.state.checkout);
  }, [location.state]);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds]);

  if (!email) return <Navigate to="/register" replace />;

  const verify = async (code) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/api/users/verify-account', { email, code });
      session.set(data.token, data.user);
      afterAuth(navigate, location.state);
    } catch (err) {
      setError(errorMessage(err, 'That code did not work. Check it and try again.'));
      setBusy(false);
    }
  };

  const fill = (values) => {
    setDigits(values);
    if (values.every(Boolean)) verify(values.join(''));
  };

  const onChange = (index, raw) => {
    const clean = raw.replace(/\D/g, '');
    if (!clean && raw) return;
    const next = [...digits];
    if (clean.length > 1) {
      // Pasted or auto-filled code: spread it across the boxes.
      clean.slice(0, LENGTH - index).split('').forEach((d, i) => {
        next[index + i] = d;
      });
      inputs.current[Math.min(index + clean.length, LENGTH - 1)]?.focus();
    } else {
      next[index] = clean;
      if (clean && index < LENGTH - 1) inputs.current[index + 1]?.focus();
    }
    fill(next);
  };

  const onKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const resend = async () => {
    setResending(true);
    setError('');
    setNotice('');
    try {
      await api.post('/api/users/resend-otp', { email });
      setNotice('A new code is on its way.');
      setSeconds(RESEND_SECONDS);
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
    } catch (err) {
      setError(errorMessage(err, 'Could not send a new code.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Verify your account"
      subtitle={`Enter the 6-digit code we sent to ${phone || email}.`}
      pageTitle="Verify account"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (digits.every(Boolean)) verify(digits.join(''));
          else setError('Enter all 6 digits.');
        }}
        className="space-y-5"
      >
        <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={digit}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoFocus={i === 0}
              disabled={busy}
              aria-label={`Digit ${i + 1}`}
              className="tabular h-14 w-full rounded-xl border border-line bg-ink-900 text-center text-2xl font-bold text-fg transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          ))}
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {notice ? <Alert tone="up">{notice}</Alert> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Verify
        </Button>
        <p className="text-center text-sm text-fg-muted">
          Didn&rsquo;t get it?{' '}
          {seconds > 0 ? (
            <span className="tabular">Send again in {seconds}s</span>
          ) : (
            <button type="button" onClick={resend} disabled={resending} className="font-semibold text-brand-400 hover:underline disabled:opacity-60">
              {resending ? 'Sending…' : 'Send a new code'}
            </button>
          )}
        </p>
      </form>
    </AuthShell>
  );
}
