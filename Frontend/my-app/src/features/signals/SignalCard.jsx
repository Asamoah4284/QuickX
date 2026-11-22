import { AnimatePresence, motion } from 'framer-motion';
import { FiArrowDownRight, FiArrowUpRight, FiCheck, FiCopy } from 'react-icons/fi';
import { Badge, Card } from '../../ui/primitives';
import { cx, formatDateTime, timeAgo } from '../../lib/format';
import { useCopy } from '../../lib/useCopy';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

export const STATUS_META = {
  active: { label: 'Live', tone: 'up' },
  tp_hit: { label: 'Target hit', tone: 'up' },
  sl_hit: { label: 'Stopped out', tone: 'down' },
  closed: { label: 'Closed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export function DirectionPill({ direction }) {
  const buy = direction === 'buy';
  const Icon = buy ? FiArrowUpRight : FiArrowDownRight;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
        buy ? 'bg-up/15 text-up' : 'bg-down/15 text-down'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {direction}
    </span>
  );
}

export function Pips({ value, className }) {
  if (value == null) return null;
  const n = Number(value);
  return (
    <span className={cx('tabular font-semibold', n > 0 ? 'text-up' : n < 0 ? 'text-down' : 'text-fg-muted', className)}>
      {n > 0 ? '+' : ''}
      {n} pips
    </span>
  );
}

/** Every level of a signal uses the same number of decimals, so 1.085 and 1.08750 line up. */
export function levelFormatter(values) {
  const decimals = Math.min(
    6,
    Math.max(0, ...values.filter((v) => v != null).map((v) => (String(v).split('.')[1] || '').length))
  );
  return (v) => (v == null ? '' : Number(v).toFixed(decimals));
}

/** "Buy limit", "Sell", ... in the words a trading app uses. */
export function orderLabel(signal) {
  const type = String(signal.orderType || 'market').toLowerCase();
  if (type === 'market') return `${signal.direction === 'buy' ? 'Buy' : 'Sell'} now (market)`;
  return type.replace(/^\w/, (c) => c.toUpperCase());
}

function rewardRatio(signal, tp) {
  const risk = Math.abs(Number(signal.entry) - Number(signal.stopLoss));
  if (!risk) return null;
  return Math.round((Math.abs(Number(tp) - Number(signal.entry)) / risk) * 10) / 10;
}

/** Plain text that pastes cleanly into MT4/MT5 notes, Telegram or WhatsApp. */
export function signalAsText(signal) {
  const fmt = levelFormatter([signal.entry, signal.stopLoss, ...signal.takeProfits]);
  const lines = [
    `${signal.direction.toUpperCase()} ${signal.pair}${signal.timeframe ? ` (${signal.timeframe})` : ''}`,
    `Order: ${orderLabel(signal)}`,
    `Entry: ${fmt(signal.entry)}`,
    `Stop loss: ${fmt(signal.stopLoss)}`,
    ...signal.takeProfits.map((tp, i) => `${signal.takeProfits.length > 1 ? `TP${i + 1}` : 'TP'}: ${fmt(tp)}`),
  ];
  return lines.join('\n');
}

function CopyLevel({ label, value, hint, tone, copyKey, copy, copied }) {
  const done = copied === copyKey;
  return (
    <button
      type="button"
      onClick={() => copy(value, copyKey)}
      className={cx(
        'group relative rounded-xl border bg-ink-900 px-3.5 py-3 text-left transition',
        done ? 'border-brand-400/60' : 'border-line hover:border-line-strong hover:bg-ink-850 active:scale-[0.98]'
      )}
      aria-label={`Copy ${label} ${value}`}
    >
      <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
        <span className="text-fg-subtle transition group-hover:text-fg-muted">
          {done ? <FiCheck className="h-3.5 w-3.5 text-brand-300" /> : <FiCopy className="h-3.5 w-3.5" />}
        </span>
      </span>
      <span
        className={cx(
          'tabular mt-1 block text-lg font-semibold',
          tone === 'up' && 'text-up',
          tone === 'down' && 'text-down',
          !tone && 'text-fg'
        )}
      >
        {value}
      </span>
      {hint ? <span className="mt-0.5 block text-[11px] text-fg-subtle">{hint}</span> : null}
    </button>
  );
}

/** A full signal with its levels. Only rendered for members with Signals access (and in the admin preview). */
export default function SignalCard({ signal, preview = false }) {
  const { copy, copied } = useCopy();
  const status = STATUS_META[signal.status] || STATUS_META.closed;
  const live = signal.status === 'active';
  const fmt = levelFormatter([signal.entry, signal.stopLoss, ...signal.takeProfits]);
  const updates = signal.updates || [];

  return (
    <Card className={cx('p-5 sm:p-6', live && 'border-up/25')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="tabular text-xl font-bold text-fg">{signal.pair || 'PAIR'}</h3>
            <DirectionPill direction={signal.direction} />
            {signal.timeframe ? (
              <span className="tabular rounded-md bg-fg/[0.06] px-2 py-0.5 text-xs text-fg-muted">{signal.timeframe}</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{orderLabel(signal)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Pips value={signal.resultPips} />
          <Badge tone={status.tone}>
            {live ? <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-up" /> : null}
            {status.label}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CopyLevel label="Entry" value={fmt(signal.entry)} copyKey="entry" copy={copy} copied={copied} />
        <CopyLevel label="Stop loss" value={fmt(signal.stopLoss)} tone="down" copyKey="sl" copy={copy} copied={copied} />
        {signal.takeProfits.map((tp, i) => {
          const rr = rewardRatio(signal, tp);
          return (
            <CopyLevel
              key={i}
              label={signal.takeProfits.length > 1 ? `Target ${i + 1}` : 'Target'}
              value={fmt(tp)}
              hint={rr ? `Risk:reward 1:${rr}` : null}
              tone="up"
              copyKey={`tp${i}`}
              copy={copy}
              copied={copied}
            />
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-subtle">Tap a price to copy it.</p>
        <button
          type="button"
          onClick={() => copy(signalAsText(signal), 'all')}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-fg-muted transition hover:border-brand-400/50 hover:text-fg active:scale-[0.97]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied === 'all' ? 'done' : 'idle'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1.5"
            >
              {copied === 'all' ? <FiCheck className="h-3.5 w-3.5 text-brand-300" /> : <FiCopy className="h-3.5 w-3.5" />}
              {copied === 'all' ? 'Copied' : 'Copy trade'}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      {signal.note ? <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-fg-muted">{signal.note}</p> : null}

      {signal.chartImage ? (
        <a href={publicAssetUrl(signal.chartImage)} target="_blank" rel="noreferrer" className="mt-4 block">
          <img
            src={publicAssetUrl(signal.chartImage)}
            alt={`${signal.pair} chart`}
            loading="lazy"
            className="max-h-80 w-full rounded-xl border border-line object-cover"
          />
        </a>
      ) : null}

      {updates.length ? (
        <ol className="mt-4 space-y-2 border-l border-line pl-4">
          {updates.map((u, i) => (
            <li key={i} className="text-sm">
              <span className="text-fg">{u.text}</span>
              <span className="ml-2 text-xs text-fg-subtle">{formatDateTime(u.at)}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {!preview ? (
        <p className="mt-4 text-xs text-fg-subtle">
          Posted {timeAgo(signal.createdAt)}
          {signal.closedAt ? `, closed ${timeAgo(signal.closedAt)}` : ''}
        </p>
      ) : null}
    </Card>
  );
}
