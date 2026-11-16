import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import PaystackPop from '@paystack/inline-js';
import { FiArrowLeft, FiClock, FiCreditCard, FiExternalLink, FiShield, FiUsers } from 'react-icons/fi';
import { BsWallet2 } from 'react-icons/bs';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../lib/auth';
import { cedis, cx, daysLeft, formatDate, formatDateTime, timeAgo } from '../../lib/format';
import { Alert, Avatar, Badge, Button, Card, Container, EmptyState, Field, Input, Skeleton } from '../../ui/primitives';
import { Modal } from '../../ui/overlays';
import { Reveal } from '../../ui/motion';
import { OUTCOME, PIE_STATUS, PieRing, RISK_TEXT, percentFunded } from './shared';

function Term({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-ink-900 px-4 py-3">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className={cx('tabular mt-1 font-semibold', tone === 'up' && 'text-up', tone === 'down' && 'text-down', !tone && 'text-fg')}>
        {value}
      </p>
    </div>
  );
}

/** What a slice of `amount` would pay back at the target and at the worst case. */
function Outcomes({ pie, amount }) {
  const a = Number(amount) || 0;
  if (a <= 0) return null;
  const profit = (a * pie.targetRoiPercent) / 100;
  const best = a + profit - (profit * (pie.ownerFeePercent || 0)) / 100;
  const worst = a - (a * pie.maxLossPercent) / 100;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-up/25 bg-up/5 px-4 py-3">
        <p className="text-xs text-fg-subtle">If it hits the target</p>
        <p className="tabular mt-1 font-semibold text-up">{cedis(best)}</p>
      </div>
      <div className="rounded-xl border border-down/25 bg-down/5 px-4 py-3">
        <p className="text-xs text-fg-subtle">If it hits the max loss</p>
        <p className="tabular mt-1 font-semibold text-down">{cedis(worst)}</p>
      </div>
    </div>
  );
}

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

function MethodOption({ active, onClick, icon: Icon, title, detail, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'border-brand-400/60 bg-brand-500/10' : 'border-line hover:border-line-strong'
      )}
    >
      <Icon className={cx('h-5 w-5 shrink-0', active ? 'text-brand-300' : 'text-fg-subtle')} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block text-xs text-fg-subtle">{detail}</span>
      </span>
    </button>
  );
}

function JoinModal({ pie, already, onClose, onDone }) {
  const { user } = useAuth();
  const wallet = useApi('/api/wallet');
  const balance = Number(wallet.data?.balance || 0);
  const room = Math.max(0, Number(pie.targetAmount) - Number(pie.raisedAmount));
  const personalRoom = Math.max(0, Number(pie.maxDeposit) - already);
  const max = Math.min(room, personalRoom);
  const [amount, setAmount] = useState(String(Math.min(max, Math.max(pie.minDeposit, 0)) || ''));
  const [method, setMethod] = useState('paystack');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const value = Number(amount) || 0;
  const tooLow = value > 0 && value < pie.minDeposit;
  const tooHigh = value > max;
  const short = method === 'wallet' && value > balance;
  const url = `/api/ptrading/${pie._id}/deposit`;

  const confirmPaystack = async (reference) => {
    setBusy(true);
    try {
      const { data } = await api.post(url, { amount: value, acceptRisk: true, transactionId: reference });
      onDone(data.message);
    } catch (err) {
      const moved = err?.response?.data?.code === 'MOVED_TO_WALLET';
      if (moved) {
        onDone(errorMessage(err));
        return;
      }
      setError(`${errorMessage(err, 'We could not add your slice yet.')} If you were charged, send this reference to support: ${reference}`);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (method === 'wallet') {
        const { data } = await api.post(url, { amount: value, acceptRisk: true });
        onDone(data.message);
        return;
      }
      if (!PAYSTACK_KEY) throw new Error('Payments are not set up yet. Please contact support.');
      // Check the slice is still allowed before taking any money.
      await api.post(url, { amount: value, acceptRisk: true, check: true });
      setBusy(false);
      new PaystackPop().newTransaction({
        key: PAYSTACK_KEY,
        email: user?.email,
        amount: Math.round(value * 100),
        currency: 'GHS',
        reference: `QX-PIE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        channels: ['mobile_money', 'card'],
        ...(user?.phone ? { phone: user.phone } : {}),
        metadata: { item_type: 'pie', pie_id: pie._id },
        onSuccess: (transaction) => confirmPaystack(transaction.reference),
        onCancel: () => {},
      });
    } catch (err) {
      setError(errorMessage(err, 'The slice did not go through.'));
    } finally {
      if (method === 'wallet') setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={already ? 'Add to your slice' : 'Take a slice'}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Amount (GH₵)"
          htmlFor="pie-amount"
          hint={`From ${cedis(pie.minDeposit)} up to ${cedis(max)}${already ? `. You already have ${cedis(already)} in.` : '.'}`}
        >
          <Input
            id="pie-amount"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Outcomes pie={pie} amount={value} />
        {tooLow ? <Alert tone="warn">The smallest slice is {cedis(pie.minDeposit)}.</Alert> : null}
        {tooHigh ? <Alert tone="warn">The most you can add is {cedis(max)}.</Alert> : null}

        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">How do you want to pay?</p>
          <MethodOption
            active={method === 'paystack'}
            onClick={() => setMethod('paystack')}
            icon={FiCreditCard}
            title="Mobile Money or card"
            detail="Pay securely with Paystack."
          />
          <MethodOption
            active={method === 'wallet'}
            onClick={() => setMethod('wallet')}
            icon={BsWallet2}
            title="QuickX wallet"
            detail={wallet.loading ? 'Checking your balance...' : `Balance: ${cedis(balance)}`}
            disabled={!wallet.loading && balance <= 0}
          />
        </div>
        {short && !wallet.loading ? <Alert tone="warn">Not enough in your wallet. Pay with Mobile Money or card instead.</Alert> : null}

        <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            I understand I can lose up to {pie.maxLossPercent}% of this, or more if the market gaps, and that this is not
            financial advice.
          </span>
        </label>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!accept || !value || tooLow || tooHigh || short}>
            Pay {value ? cedis(value) : ''}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PieDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const { data, loading, error, reload } = useApi(`/api/ptrading/${id}`);
  const [joining, setJoining] = useState(false);
  const [notice, setNotice] = useState('');

  if (loading && !data) {
    return (
      <Container className="space-y-4 py-10">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-72" />
      </Container>
    );
  }
  if (error || !data?.pie) {
    return (
      <Container className="py-16">
        <EmptyState title="This Pie could not be found" description={error?.message} action={<Button to="/pie">All Pies</Button>} />
      </Container>
    );
  }

  const { pie, deposits = [], userDeposit } = data;
  const status = PIE_STATUS[pie.status] || PIE_STATUS.funding;
  const outcome = pie.outcome ? OUTCOME[pie.outcome] : null;
  const pct = percentFunded(pie);
  const open = pie.status === 'funding' && (!pie.fundingDeadline || new Date(pie.fundingDeadline) > new Date());
  const left = daysLeft(pie.fundingDeadline);
  const already = Number(userDeposit?.amount || 0);
  const updates = (pie.tradeUpdates || []).slice().reverse();

  return (
    <>
      <Helmet>
        <title>{`${pie.title} | Pie trading | QuickX`}</title>
      </Helmet>
      <Container className="space-y-8 py-8 sm:py-12">
        <Link to="/pie" className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition hover:text-fg">
          <FiArrowLeft className="h-4 w-4" /> All Pies
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={outcome ? outcome.tone : status.tone}>{outcome ? outcome.label : status.label}</Badge>
                <span className="tabular rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-fg-muted">{pie.pair}</span>
                <span className="text-xs capitalize text-fg-subtle">{pie.market}</span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{pie.title}</h1>
              {pie.description ? <p className="mt-3 whitespace-pre-line leading-relaxed text-fg-muted">{pie.description}</p> : null}
              <div className="mt-4 flex items-center gap-3 text-sm text-fg-muted">
                <Avatar src={pie.ownerId?.profilePicture} name={pie.ownerId?.fullName} size={28} />
                Traded by <span className="font-medium text-fg">{pie.ownerId?.fullName || 'Maxwell Donkoh'}</span>
              </div>
            </Reveal>

            {notice ? <Alert tone="up">{notice}</Alert> : null}

            {pie.status === 'settled' ? (
              <Reveal>
                <Card className={cx('p-5 sm:p-6', outcome?.tone === 'up' && 'border-up/30', outcome?.tone === 'down' && 'border-down/30')}>
                  <p className="text-sm text-fg-muted">Final result</p>
                  <p className={cx('tabular mt-1 text-4xl font-bold', outcome?.tone === 'up' ? 'text-up' : outcome?.tone === 'down' ? 'text-down' : 'text-fg')}>
                    {pie.finalPnlPercent > 0 ? '+' : ''}
                    {pie.finalPnlPercent}%
                  </p>
                  <p className="mt-2 text-sm text-fg-muted">
                    {cedis(pie.totalDistributedAmount)} was paid back into members&apos; wallets on {formatDate(pie.settledAt)}.
                  </p>
                  {pie.settlementNotes ? <p className="mt-3 text-sm text-fg-muted">{pie.settlementNotes}</p> : null}
                  {pie.settlementProof ? (
                    <a
                      href={pie.settlementProof}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-300 hover:underline"
                    >
                      See the broker statement <FiExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </Card>
              </Reveal>
            ) : null}

            <section>
              <h2 className="text-lg font-semibold text-fg">The plan</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Term label="Aiming for" value={`+${pie.targetRoiPercent}%`} tone="up" />
                <Term label="Most it can lose" value={`-${pie.maxLossPercent}%`} tone="down" />
                <Term label="Risk level" value={pie.riskLevel} />
                <Term label="Maxwell's fee" value={`${pie.ownerFeePercent}% of profit only`} />
                <Term label="Slice size" value={`${cedis(pie.minDeposit)} to ${cedis(pie.maxDeposit)}`} />
                <Term label="Joining closes" value={pie.fundingDeadline ? formatDate(pie.fundingDeadline) : 'When trading starts'} />
              </div>
              <p className="mt-3 text-xs text-fg-subtle">There is no fee if the trade loses or breaks even.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-fg">Trade updates</h2>
              {updates.length ? (
                <ol className="mt-4 space-y-4 border-l border-line pl-5">
                  {updates.map((u, i) => (
                    <motion.li
                      key={u._id || i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.04 }}
                      className="relative"
                    >
                      <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-400 ring-4 ring-ink-950" />
                      <p className="font-medium text-fg">{u.title}</p>
                      <p className="text-xs text-fg-subtle">{formatDateTime(u.createdAt)}</p>
                      {u.entryPrice || u.stopLoss || u.takeProfit ? (
                        <p className="tabular mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          {u.entryPrice ? <span className="text-fg-muted">Entry <span className="text-fg">{u.entryPrice}</span></span> : null}
                          {u.stopLoss ? <span className="text-fg-muted">Stop <span className="text-down">{u.stopLoss}</span></span> : null}
                          {u.takeProfit ? <span className="text-fg-muted">Target <span className="text-up">{u.takeProfit}</span></span> : null}
                        </p>
                      ) : null}
                      {u.notes ? <p className="mt-2 whitespace-pre-line text-sm text-fg-muted">{u.notes}</p> : null}
                      {u.imageUrl ? (
                        <a href={u.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                          <img src={u.imageUrl} alt="" loading="lazy" className="max-h-64 rounded-xl border border-line object-cover" />
                        </a>
                      ) : null}
                    </motion.li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-fg-muted">Maxwell will post entries, exits and notes here once trading starts.</p>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                <PieRing value={pct} size={150} stroke={12}>
                  <span className="tabular text-3xl font-bold text-fg">{pct}%</span>
                  <span className="text-xs text-fg-subtle">funded</span>
                </PieRing>
                <p className="tabular mt-4 text-lg font-semibold text-fg">
                  {cedis(pie.raisedAmount)} <span className="text-sm font-normal text-fg-subtle">of {cedis(pie.targetAmount)}</span>
                </p>
                <p className="mt-1 flex items-center gap-3 text-xs text-fg-subtle">
                  <span className="inline-flex items-center gap-1">
                    <FiUsers className="h-3.5 w-3.5" /> {pie.participantCount || 0} members
                  </span>
                  {open && pie.fundingDeadline ? (
                    <span className="inline-flex items-center gap-1">
                      <FiClock className="h-3.5 w-3.5" /> {left > 0 ? `${left} day${left === 1 ? '' : 's'} left` : 'Closes today'}
                    </span>
                  ) : null}
                </p>
              </div>

              {userDeposit ? (
                <div className="mt-5 rounded-xl border border-brand-400/30 bg-brand-500/10 px-4 py-3 text-sm">
                  <p className="text-fg-muted">Your slice</p>
                  <p className="tabular mt-0.5 text-lg font-semibold text-fg">
                    {cedis(userDeposit.amount)} <span className="text-sm font-normal text-fg-muted">({userDeposit.slicePercentage}%)</span>
                  </p>
                  {userDeposit.status === 'settled' ? (
                    <p className={cx('tabular mt-1 text-sm', userDeposit.pnlAmount >= 0 ? 'text-up' : 'text-down')}>
                      Paid back {cedis(userDeposit.payoutAmount)} ({userDeposit.pnlAmount >= 0 ? '+' : ''}
                      {cedis(userDeposit.pnlAmount)})
                    </p>
                  ) : null}
                  {userDeposit.status === 'refunded' ? <p className="mt-1 text-sm text-fg-muted">Refunded in full</p> : null}
                </div>
              ) : null}

              <div className="mt-5">
                {open ? (
                  isSignedIn ? (
                    <Button className="w-full" onClick={() => setJoining(true)} disabled={pct >= 100}>
                      {pct >= 100 ? 'This Pie is full' : userDeposit ? 'Add to my slice' : 'Take a slice'}
                    </Button>
                  ) : (
                    <Button className="w-full" to="/login" state={{ from: location.pathname }}>
                      Log in to take a slice
                    </Button>
                  )
                ) : (
                  <p className="text-center text-sm text-fg-muted">{status.help}</p>
                )}
              </div>
            </Card>

            <div className="flex gap-3 rounded-xl border border-warn/25 bg-warn/5 p-4 text-xs leading-relaxed text-fg-muted">
              <FiShield className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              {RISK_TEXT}
            </div>

            {deposits.length ? (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-fg">Who&apos;s in</h3>
                <ul className="mt-3 space-y-2.5">
                  {deposits.slice(0, 12).map((d) => (
                    <li key={d._id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar src={d.profilePicture} name={d.name} size={26} />
                        <span className={cx('truncate', d.isYou ? 'font-semibold text-fg' : 'text-fg-muted')}>
                          {d.isYou ? 'You' : d.name}
                        </span>
                      </span>
                      <span className="tabular text-fg-subtle">{d.slicePercentage}%</span>
                    </li>
                  ))}
                </ul>
                {deposits.length > 12 ? <p className="mt-3 text-xs text-fg-subtle">and {deposits.length - 12} more</p> : null}
                <p className="mt-3 text-[11px] text-fg-subtle">Updated {timeAgo(pie.updatedAt)}</p>
              </Card>
            ) : null}
          </aside>
        </div>
      </Container>

      {joining ? (
        <JoinModal
          pie={pie}
          already={already}
          onClose={() => setJoining(false)}
          onDone={(message) => {
            setJoining(false);
            setNotice(message);
            reload();
          }}
        />
      ) : null}
    </>
  );
}
