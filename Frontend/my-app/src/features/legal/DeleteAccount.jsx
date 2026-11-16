import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { cedis } from '../../lib/format';
import { LEGAL } from '../../lib/legal';
import { clearServerPushSubscription } from '../../utils/webPush';
import { Alert, Button, Card, Container, Eyebrow, Field, Input, Skeleton } from '../../ui/primitives';

const REMOVED = [
  'Your name, email, phone number, password, profile photo and Mobile Money details',
  'Your plans and access, and your course progress',
  'Your community posts, questions, comments, answers, likes and votes',
  'Your private messages',
  'Your notifications and notification settings on every device',
  'Upcoming mentorship sessions (they are cancelled)',
];

const KEPT = [
  'Payment, wallet, withdrawal, ticket and Pie records, which tax and accounting law require us to keep. They are no longer linked to your name or contact details.',
];

/** The signed-in part: checks for anything in the way, then deletes. */
function DeletePanel() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const check = useApi('/api/users/me/deletion-check');
  const [confirm, setConfirm] = useState('');
  const [acceptLoss, setAcceptLoss] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (check.loading && !check.data) return <Skeleton className="h-56" />;
  if (check.error) return <Alert>{check.error.message}</Alert>;

  const blockers = check.data?.blockers || [];
  const hard = blockers.filter((b) => b.code !== 'HAS_BALANCE');
  const balance = Number(check.data?.balance || 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.delete('/api/users/me', { data: { confirm, acceptLoss } });
      await clearServerPushSubscription().catch(() => {});
      signOut();
      navigate('/delete-account?done=1', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not delete your account.'));
      setBusy(false);
    }
  };

  if (hard.length) {
    return (
      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-semibold text-fg">Not yet</h2>
        {hard.map((b) => (
          <Alert key={b.code} tone="warn">
            {b.message}
          </Alert>
        ))}
        <Button to="/account" variant="secondary">
          Go to my account
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-down/30 p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="flex gap-3">
          <FiAlertTriangle className="mt-1 h-5 w-5 shrink-0 text-down" />
          <div>
            <h2 className="text-lg font-semibold text-fg">Delete my account</h2>
            <p className="mt-1 text-sm text-fg-muted">This cannot be undone. You will lose access to everything you bought.</p>
          </div>
        </div>
        {balance > 0 ? (
          <label className="flex cursor-pointer gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-fg-muted">
            <input type="checkbox" checked={acceptLoss} onChange={(e) => setAcceptLoss(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500" />
            <span>
              You still have <strong className="text-fg">{cedis(balance)}</strong> in your wallet and referral earnings. I understand I will lose it.{' '}
              <Link to="/account#wallet" className="font-semibold text-brand-300 hover:underline">
                Withdraw it first
              </Link>
            </span>
          </label>
        ) : null}
        <Field label="Type DELETE to confirm" htmlFor="confirm-delete">
          <Input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" placeholder="DELETE" />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" variant="danger" loading={busy} disabled={confirm.trim().toUpperCase() !== 'DELETE' || (balance > 0 && !acceptLoss)}>
          Delete my account
        </Button>
      </form>
    </Card>
  );
}

export default function DeleteAccount() {
  const { isSignedIn } = useAuth();
  const [params] = useSearchParams();
  const done = params.get('done') === '1';

  return (
    <>
      <Helmet>
        <title>Delete your account | QuickX</title>
        <meta name="description" content="How to delete your QuickX Learn account, and what is removed." />
      </Helmet>
      <Container className="max-w-3xl space-y-8 py-12 sm:py-16">
        <header>
          <Eyebrow>Your account</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Delete your QuickX Learn account</h1>
          <p className="mt-4 leading-relaxed text-fg-muted">
            You can delete your account yourself at any time, in the app or on this page.
          </p>
        </header>

        {done ? (
          <Alert tone="up" className="flex items-center gap-3">
            <FiCheckCircle className="h-5 w-5 shrink-0" />
            Your account has been deleted. Thank you for learning with us.
          </Alert>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold text-fg">In the app</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-fg-muted">
              <li>Open QuickX Learn and sign in.</li>
              <li>Go to the Account tab.</li>
              <li>Scroll down and tap Delete account.</li>
              <li>Type DELETE and confirm.</li>
            </ol>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold text-fg">On the website</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-fg-muted">
              <li>Sign in on {LEGAL.site}.</li>
              <li>Come back to this page.</li>
              <li>Type DELETE below and confirm.</li>
            </ol>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="font-semibold text-fg">What is deleted</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
              {REMOVED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-fg">What is kept</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
              {KEPT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-fg-muted">Deletion happens straight away.</p>
          </div>
        </section>

        <p className="text-sm text-fg-muted">
          Before deleting, withdraw any money left in your wallet. If you have money in a Pie that has not finished, wait until it
          pays out. Can&apos;t sign in? Email{' '}
          <a href={`mailto:${LEGAL.supportEmail}?subject=${encodeURIComponent('Delete my account')}`} className="font-semibold text-brand-300 hover:underline">
            {LEGAL.supportEmail}
          </a>{' '}
          from the email on your account, or message us on WhatsApp from your account&apos;s phone number, and we will delete it
          for you within 30 days.
        </p>

        {done ? null : isSignedIn ? (
          <DeletePanel />
        ) : (
          <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-fg-muted">Sign in to delete your account here.</p>
            <Button to="/login" state={{ from: { pathname: '/delete-account' } }}>
              Sign in
            </Button>
          </Card>
        )}
      </Container>
    </>
  );
}
