import { FiLock } from 'react-icons/fi';
import { FEATURES } from '../../lib/features';
import { useApi } from '../../lib/useApi';
import { durationLabel, money } from '../../lib/format';
import { Button, Card } from '../../ui/primitives';

/**
 * A small card for one part of a page that needs a plan, for example a community room.
 * Shows the plan, its price and a button to get it. The full-page version is FeatureGate.
 */
export default function PlanLock({ feature, title, text, className = '' }) {
  const meta = FEATURES[feature];
  const { data } = useApi('/api/products');
  const single = (data?.products || []).find((p) => p.grants.length === 1 && p.grants[0] === feature);
  const Icon = meta?.icon || FiLock;

  return (
    <Card className={`p-6 sm:p-8 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
            <FiLock className="h-3.5 w-3.5" />
            Part of {meta?.label || 'a plan'}
          </p>
          <h3 className="mt-1.5 text-lg font-semibold text-fg">{title}</h3>
          {text ? <p className="mt-1.5 text-sm text-fg-muted">{text}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {single ? (
              <Button to={`/checkout/plan/${single.key}`}>
                Get {single.name} · <span className="tabular">{money(single.price)}</span>
                <span className="font-normal opacity-80">/ {durationLabel(single.durationDays)}</span>
              </Button>
            ) : null}
            <Button to="/pricing" variant="secondary">
              See all plans
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
