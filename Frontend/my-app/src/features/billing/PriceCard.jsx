import { FiCheck } from 'react-icons/fi';
import { Badge, Button, Card } from '../../ui/primitives';
import { cx, daysLeft, durationLabel, formatDate, money } from '../../lib/format';
import { useAuth } from '../../lib/auth';

/** One product on the pricing grid. `featured` gives the bundle its highlighted look. */
export default function PriceCard({ product, featured = false, className }) {
  const { has, expiryOf, isSignedIn } = useAuth();
  const ownsAll = isSignedIn && product.grants.every((f) => has(f));
  const soonestExpiry = ownsAll
    ? product.grants.map((f) => expiryOf(f)).filter(Boolean).sort()[0]
    : null;

  return (
    <Card
      interactive
      className={cx(
        'relative flex h-full flex-col p-7',
        featured && 'border-brand-400/50 bg-gradient-to-b from-brand-600/20 to-transparent shadow-glow',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold text-fg">{product.name}</h3>
        {product.badge ? <Badge tone="brand">{product.badge}</Badge> : null}
      </div>
      <p className="mt-2 min-h-10 text-sm text-fg-muted">{product.tagline}</p>

      <p className="mt-6 flex items-baseline gap-2">
        <span className="tabular text-4xl font-bold text-fg">{money(product.price)}</span>
        <span className="text-sm text-fg-subtle">/ {durationLabel(product.durationDays)}</span>
      </p>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {product.highlights.map((item) => (
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

      <Button
        to={`/checkout/plan/${product.key}`}
        variant={featured ? 'primary' : 'secondary'}
        className="mt-5 w-full"
      >
        {ownsAll ? 'Add more time' : `Get ${product.name}`}
      </Button>
    </Card>
  );
}
