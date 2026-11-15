import { Card } from '../../ui/primitives';
import { CountUp, Reveal } from '../../ui/motion';
import { cx, formatDate } from '../../lib/format';
import { DirectionPill, Pips, STATUS_META } from './SignalCard';

export function SignalStats({ stats, openCount, className }) {
  const items = [
    { label: 'Win rate', node: stats.winRate == null ? '—' : <CountUp value={stats.winRate} suffix="%" /> },
    {
      label: 'Net pips',
      node: <CountUp value={stats.totalPips} decimals={stats.totalPips % 1 ? 1 : 0} prefix={stats.totalPips > 0 ? '+' : ''} />,
      tone: stats.totalPips > 0 ? 'text-up' : stats.totalPips < 0 ? 'text-down' : '',
    },
    { label: 'Signals closed', node: <CountUp value={stats.total} /> },
    ...(openCount != null ? [{ label: 'Live now', node: <CountUp value={openCount} />, tone: openCount ? 'text-up' : '' }] : []),
  ];
  return (
    <div className={cx('grid grid-cols-2 gap-3', items.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3', className)}>
      {items.map((item) => (
        <Card key={item.label} className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{item.label}</p>
          <p className={cx('tabular mt-1.5 text-2xl font-bold text-fg sm:text-3xl', item.tone)}>{item.node}</p>
        </Card>
      ))}
    </div>
  );
}

/** Results of finished signals. Safe to show anyone: no live levels. */
export default function TrackRecord({ data, className }) {
  if (!data) return null;
  return (
    <Reveal className={className}>
      <SignalStats stats={data.stats} openCount={data.openCount} />
      <p className="mt-3 text-xs text-fg-subtle">Results over the last {data.stats.periodDays} days.</p>
      {data.recent.length ? (
        <Card className="mt-5 divide-y divide-line overflow-hidden">
          {data.recent.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="tabular font-semibold text-fg">{s.pair}</span>
                <DirectionPill direction={s.direction} />
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden text-fg-subtle sm:inline">{STATUS_META[s.status]?.label}</span>
                <Pips value={s.resultPips} />
                <span className="tabular hidden text-xs text-fg-subtle sm:inline">{formatDate(s.closedAt)}</span>
              </div>
            </div>
          ))}
        </Card>
      ) : null}
    </Reveal>
  );
}
