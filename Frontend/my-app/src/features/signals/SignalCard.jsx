import { FiArrowDownRight, FiArrowUpRight } from 'react-icons/fi';
import { Badge, Card } from '../../ui/primitives';
import { cx, formatDateTime, timeAgo } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

export const STATUS_META = {
  active: { label: 'Live', tone: 'up' },
  tp_hit: { label: 'Take profit hit', tone: 'up' },
  sl_hit: { label: 'Stop loss hit', tone: 'down' },
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

function Level({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-ink-900 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className={cx('tabular mt-1 text-base font-semibold', tone === 'up' && 'text-up', tone === 'down' && 'text-down', !tone && 'text-fg')}>
        {value}
      </p>
    </div>
  );
}

/** A full signal with its levels — only ever rendered for members with Signals access. */
export default function SignalCard({ signal }) {
  const status = STATUS_META[signal.status] || STATUS_META.closed;
  const live = signal.status === 'active';

  return (
    <Card className={cx('p-5 sm:p-6', live && 'border-up/25')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="tabular text-xl font-bold text-fg">{signal.pair}</h3>
          <DirectionPill direction={signal.direction} />
          {signal.timeframe ? <span className="tabular text-xs text-fg-subtle">{signal.timeframe}</span> : null}
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
        <Level label={signal.orderType && signal.orderType !== 'market' ? signal.orderType : 'Entry'} value={signal.entry} />
        <Level label="Stop loss" value={signal.stopLoss} tone="down" />
        {signal.takeProfits.map((tp, i) => (
          <Level key={i} label={signal.takeProfits.length > 1 ? `Target ${i + 1}` : 'Target'} value={tp} tone="up" />
        ))}
      </div>

      {signal.note ? <p className="mt-4 whitespace-pre-line text-sm text-fg-muted">{signal.note}</p> : null}

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

      {signal.updates.length ? (
        <ol className="mt-4 space-y-2 border-l border-line pl-4">
          {signal.updates.map((u, i) => (
            <li key={i} className="text-sm">
              <span className="text-fg">{u.text}</span>
              <span className="ml-2 text-xs text-fg-subtle">{formatDateTime(u.at)}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <p className="mt-4 text-xs text-fg-subtle">
        Posted {timeAgo(signal.createdAt)}
        {signal.closedAt ? ` · closed ${timeAgo(signal.closedAt)}` : ''}
      </p>
    </Card>
  );
}
