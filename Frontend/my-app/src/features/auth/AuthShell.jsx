import { useState } from 'react';
import { FiActivity, FiEye, FiEyeOff, FiPlayCircle, FiUsers } from 'react-icons/fi';
import { Helmet } from 'react-helmet-async';
import { Card, Container, Input } from '../../ui/primitives';
import { Reveal } from '../../ui/motion';
import { readPendingCheckout } from '../../utils/pendingCheckout';

const POINTS = [
  { icon: FiPlayCircle, text: 'Step-by-step video courses with free previews' },
  { icon: FiActivity, text: 'Live trade signals sent to your phone' },
  { icon: FiUsers, text: 'A community of traders and 1-on-1 mentorship' },
];

/** Two-column frame shared by every sign-in / sign-up screen. */
export default function AuthShell({ title, subtitle, pageTitle, children, footer }) {
  return (
    <>
      <Helmet>
        <title>{pageTitle || title} — QuickX</title>
      </Helmet>
      <div className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="absolute left-1/2 top-0 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" aria-hidden />
        <Container className="relative grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-10 lg:grid-cols-2 lg:py-16">
          <Reveal className="hidden lg:block">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-fg">
              Learn the method.
              <br />
              <span className="text-gradient">Trade the signals.</span>
            </h2>
            <ul className="mt-8 space-y-4">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-center gap-4 text-fg-muted">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                    <p.icon className="h-5 w-5" />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.06} className="mx-auto w-full max-w-md">
            <Card className="p-7 sm:p-9">
              <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-fg-muted">{subtitle}</p> : null}
              <div className="mt-6">{children}</div>
            </Card>
            {footer ? <p className="mt-5 text-center text-sm text-fg-muted">{footer}</p> : null}
          </Reveal>
        </Container>
      </div>
    </>
  );
}

export function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-fg-subtle hover:text-fg"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export const PASSWORD_HINT = 'At least 8 characters, with an upper-case letter, a lower-case letter, a number and a symbol.';

export function passwordProblem(password) {
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[\W_]/.test(password)) {
    return PASSWORD_HINT;
  }
  return '';
}

/**
 * Where to send someone once they are signed in: back to a book checkout they
 * started, else the page that asked them to sign in, else their account.
 */
export function afterAuth(navigate, locationState) {
  const pending = locationState?.checkout || readPendingCheckout();
  if (pending?.item) {
    navigate('/checkout', {
      replace: true,
      state: { item: pending.item, returnPath: pending.returnPath || null, returnTabState: pending.returnTabState ?? null },
    });
    return;
  }
  const from = locationState?.from;
  const path = typeof from === 'string' ? from : from?.pathname ? `${from.pathname}${from.search || ''}` : '/account';
  navigate(path, { replace: true });
}
