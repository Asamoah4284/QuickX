import { useState } from 'react';
import { FiCheck, FiCopy, FiGift } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { formatDate, cedis } from '../../lib/format';
import { Alert, Badge, Button, Card, Field, Input, Select, Skeleton } from '../../ui/primitives';
import { Modal } from '../../ui/overlays';

const NETWORKS = [
  { value: 'MTN', label: 'MTN' },
  { value: 'Vodafone', label: 'Telecel (Vodafone)' },
  { value: 'AirtelTigo', label: 'AirtelTigo' },
];

const STATUS = {
  pending: { label: 'Being processed', tone: 'warn' },
  completed: { label: 'Paid', tone: 'up' },
  rejected: { label: 'Rejected, money returned', tone: 'neutral' },
  failed: { label: 'Failed', tone: 'down' },
};

function WithdrawModal({ source, wallet, onClose, onDone }) {
  const isReferral = source === 'referral';
  const available = isReferral ? wallet.referralEarnings : wallet.balance;
  const minimum = isReferral ? wallet.minReferralWithdrawal : wallet.minWalletWithdrawal;
  const [amount, setAmount] = useState(String(available));
  const [momoNumber, setMomoNumber] = useState(wallet.momoDetails?.momoNumber || '');
  const [network, setNetwork] = useState(wallet.momoDetails?.network || 'MTN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isReferral) {
        await api.post('/api/withdrawals/withdraw', { momoNumber, network });
      } else {
        await api.post('/api/wallet/withdraw', { amount: Number(amount), momoNumber, network });
      }
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not request the withdrawal.'));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isReferral ? 'Withdraw referral earnings' : 'Withdraw from wallet'}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-fg-muted">
          {isReferral
            ? `Your full referral balance of ${cedis(available)} will be sent to your mobile money number once approved.`
            : `You have ${cedis(available)} available. Minimum withdrawal is ${cedis(minimum)}.`}
        </p>
        {!isReferral ? (
          <Field label="Amount (GH₵)" htmlFor="wd-amount">
            <Input id="wd-amount" type="number" min={minimum} max={available} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mobile money number" htmlFor="wd-momo">
            <Input
              id="wd-momo"
              inputMode="numeric"
              pattern="0[0-9]{9}"
              maxLength={10}
              placeholder="0241234567"
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, ''))}
              required
            />
          </Field>
          <Field label="Network" htmlFor="wd-network">
            <Select id="wd-network" value={network} onChange={(e) => setNetwork(e.target.value)}>
              {NETWORKS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Request withdrawal
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Wallet balance, referral earnings and withdrawals, on the account page. */
export default function WalletPanel() {
  const { data: wallet, loading, error, reload } = useApi('/api/wallet');
  const [withdrawing, setWithdrawing] = useState(null);
  const [copied, setCopied] = useState(false);

  if (loading && !wallet) return <Skeleton className="h-44" />;
  if (error || !wallet) return <Alert>{error?.message || 'Could not load your wallet.'}</Alert>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.referralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const canWithdrawReferral = wallet.referralEarnings >= wallet.minReferralWithdrawal && !wallet.hasPendingWithdrawal;
  const canWithdrawWallet = wallet.balance >= wallet.minWalletWithdrawal && !wallet.hasPendingWithdrawal;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Wallet balance</p>
          <p className="tabular mt-2 text-3xl font-bold text-fg">{cedis(wallet.balance)}</p>
          <p className="mt-1 text-sm text-fg-muted">Use it to pay for any plan at checkout.</p>
          <Button size="sm" variant="secondary" className="mt-4" disabled={!canWithdrawWallet} onClick={() => setWithdrawing('wallet')}>
            Withdraw
          </Button>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Referral earnings</p>
          <p className="tabular mt-2 text-3xl font-bold text-up">{cedis(wallet.referralEarnings)}</p>
          <p className="mt-1 text-sm text-fg-muted">
            Withdraw once you reach {cedis(wallet.minReferralWithdrawal)}.
          </p>
          <Button size="sm" variant="secondary" className="mt-4" disabled={!canWithdrawReferral} onClick={() => setWithdrawing('referral')}>
            Withdraw
          </Button>
        </Card>

        <Card className="p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <FiGift className="h-4 w-4" />
            Your referral code
          </p>
          <button
            type="button"
            onClick={copy}
            className="tabular mt-2 flex items-center gap-3 text-3xl font-bold tracking-widest text-fg transition hover:text-brand-300"
            aria-label="Copy referral code"
          >
            {wallet.referralCode || 'Not set yet'}
            {copied ? <FiCheck className="h-5 w-5 text-up" /> : <FiCopy className="h-5 w-5 text-fg-subtle" />}
          </button>
          <p className="mt-1 text-sm text-fg-muted">
            Earn {wallet.referralRatePercent}% of every purchase made by people who sign up with your code.
          </p>
        </Card>
      </div>

      {wallet.withdrawals.length ? (
        <Card className="divide-y divide-line overflow-hidden">
          {wallet.withdrawals.slice(0, 5).map((w) => (
            <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span className="text-fg-muted">
                <span className="tabular font-semibold text-fg">{cedis(w.amount)}</span> from{' '}
                {w.source === 'wallet' ? 'wallet' : 'referral earnings'} · {w.network} {w.momoNumber}
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular text-xs text-fg-subtle">{formatDate(w.requestedAt)}</span>
                <Badge tone={STATUS[w.status]?.tone}>{STATUS[w.status]?.label || w.status}</Badge>
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      {withdrawing ? (
        <WithdrawModal source={withdrawing} wallet={wallet} onClose={() => setWithdrawing(null)} onDone={reload} />
      ) : null}
    </div>
  );
}
