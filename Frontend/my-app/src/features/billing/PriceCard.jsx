import { useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { Badge, Button, Card } from '../../ui/primitives';
import { cx, daysLeft, durationLabel, formatDate, money } from '../../lib/format';
import { monthlyPrice, savingVs } from '../../lib/plans';
import { useAuth } from '../../lib/auth';

const CHIP = 'inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-semibold transition';

/**
 * Buttons to pick how long to buy: 1 month, 3 months, 1 year... Always one row (it scrolls
 * sideways if it must), so cards in a grid line up. A plan with one length shows it as a chip.
 */
export function LengthPicker({ lengths, value, onChange, className }) {
  if (lengths.length < 2) {
    return (
      <div className={cx('flex', className)}>
        <span className={cx(CHIP, 'border-line text-fg-muted')}>{durationLabel(lengths[0].durationDays)}</span>
      </div>
    );
  }
  return (
    <div
      role="radiogroup"
      aria-label="How long"
      className={cx('-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
    >
      {lengths.map((p) => {
        const active = p.key === value.key;
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={cx(
              CHIP,
              active ? 'border-brand-400/70 bg-brand-500/15 text-fg' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
            )}
          >
            {durationLabel(p.durationDays)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One plan on the pricing grid. Pass `lengths` (shortest first) to let people pick how long,
 * or a single `product`. `featured` gives the bundle its highlighted look.
 */
export default function PriceCard({ product, lengths, featured = false, className, initialKey }) {
  const options = lengths?.length ? lengths : [product];
  const [picked, setPicked] = useState(() => options.find((p) => p.key === initialKey) || options[0]);
  // The admin preview passes a fresh product on every keystroke; follow it.
  const current = options.find((p) => p.key === picked.key) || options[0];
  const { has, expiryOf, isSignedIn } = useAuth();
  const ownsAll = isSignedIn && current.grants.every((f) => has(f));
  const soonestExpiry = ownsAll ? current.grants.map((f) => expiryOf(f)).filter(Boolean).sort()[0] : null;
  const perMonth = options.length > 1 ? monthlyPrice(current) : null;
  const save = savingVs(current, options[0]);

  return (
    <Card
      interactive
      className={cx(
        'relative flex h-full min-w-0 flex-col p-7',
        featured && 'border-brand-400/50 bg-gradient-to-b from-brand-600/20 to-transparent shadow-glow',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold text-fg">{current.name}</h3>
        {current.badge ? <Badge tone="brand">{current.badge}</Badge> : null}
      </div>
      <p className="mt-2 min-h-10 text-sm text-fg-muted">{current.tagline}</p>

      <LengthPicker lengths={options} value={current} onChange={setPicked} className="mt-5" />

      <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
        <span className="tabular text-4xl font-bold text-fg">{money(current.price)}</span>
        <span className="text-sm text-fg-subtle">/ {durationLabel(current.durationDays)}</span>
      </p>
      <p className="mt-1 min-h-5 text-sm text-fg-subtle">
        {perMonth ? `That is ${money(Math.round(perMonth * 100) / 100)} a month` : ''}
        {save ? <span className="ml-1.5 font-semibold text-up">Save {save}%</span> : null}
      </p>

      <ul className="mt-5 flex-1 space-y-3 text-sm">
        {current.highlights.map((item) => (
          <li key={item} className="flex gap-3 text-fg-muted">
            <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {ownsAll ? (
        <p className="mt-6 text-xs text-fg-subtle">
          You have this until {formatDate(soonestExpiry)} ({daysLeft(soonestExpiry)} days left).
        </p>
      ) : null}

      <Button to={`/checkout/plan/${current.key}`} variant={featured ? 'primary' : 'secondary'} className="mt-5 w-full">
        {ownsAll ? 'Add more time' : options.length > 1 ? `Get ${durationLabel(current.durationDays)}` : `Get ${current.name}`}
      </Button>
    </Card>
  );
}
