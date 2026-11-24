import { FiCheck, FiLock } from 'react-icons/fi';
import { useAuth } from '../../lib/auth';
import { FEATURES } from '../../lib/features';
import { useApi } from '../../lib/useApi';
import { durationLabel, money } from '../../lib/format';
import { bundlePlan, singlePlan } from '../../lib/plans';
import { Button, Card, Container, PageLoader } from '../../ui/primitives';
import { Reveal } from '../../ui/motion';

/**
 * Shows `children` only to members who hold `feature`.
 * Everyone else sees what the feature is, what it costs and how to get it.
 * `preview` is optional content shown above the offer (for example a track record).
 */
export default function FeatureGate({ feature, preview, children }) {
  const { isSignedIn, has, accessLoaded } = useAuth();
  const meta = FEATURES[feature];
  const allowed = isSignedIn && has(feature);
  const { data } = useApi(allowed ? null : '/api/products');

  if (isSignedIn && !accessLoaded) return <PageLoader label="Checking your access" />;
  if (allowed) return children;

  const products = data?.products || [];
  const plan = singlePlan(products, feature);
  const single = plan?.first;
  const bundle = bundlePlan(products, feature)?.first;
  const Icon = meta.icon;

  return (
    <Container className="py-12 sm:py-16">
      {preview}
      <Reveal>
        <Card className="relative mx-auto max-w-3xl overflow-hidden p-8 sm:p-12">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-600/25 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
              <Icon className="h-7 w-7" />
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-fg-subtle">
              <FiLock className="h-4 w-4" />
              {meta.label} is a members feature
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">Unlock {meta.label}</h1>
            <p className="mt-3 max-w-xl text-base text-fg-muted">{meta.blurb}</p>

            {single ? (
              <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                {single.highlights.map((item) => (
                  <li key={item} className="flex gap-3 text-fg-muted">
                    <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {single ? (
                <Button to={`/checkout/plan/${single.key}`} size="lg">
                  Get {single.name} · <span className="tabular">{money(single.price)}</span>
                  <span className="font-normal opacity-80">/ {durationLabel(single.durationDays)}</span>
                </Button>
              ) : (
                <Button to="/pricing" size="lg">
                  See plans
                </Button>
              )}
              {bundle ? (
                <Button to={`/checkout/plan/${bundle.key}`} variant="secondary" size="lg">
                  Or get everything · <span className="tabular">{money(bundle.price)}</span>
                </Button>
              ) : null}
            </div>
            {plan?.lengths.length > 1 ? (
              <p className="mt-4 text-sm text-fg-muted">
                Also sold for {plan.lengths.slice(1).map((p) => durationLabel(p.durationDays)).join(', ')}.{' '}
                <Button to="/pricing" variant="ghost" size="sm" className="-mx-2 inline-flex h-auto px-2 py-1 text-brand-400">
                  Compare lengths
                </Button>
              </p>
            ) : null}
            {!isSignedIn ? (
              <p className="mt-5 text-sm text-fg-subtle">
                Already a member?{' '}
                <Button to="/login" variant="ghost" size="sm" className="-mx-2 inline-flex h-auto px-2 py-1 text-brand-400">
                  Log in
                </Button>
              </p>
            ) : null}
          </div>
        </Card>
      </Reveal>
    </Container>
  );
}
