import { Helmet } from 'react-helmet-async';
import { useApi } from '../../lib/useApi';
import { Alert, Container, Eyebrow, Skeleton } from '../../ui/primitives';
import { Reveal, Stagger, StaggerItem } from '../../ui/motion';
import PriceCard from './PriceCard';

const FAQ = [
  {
    q: 'Can I buy just one thing, like signals?',
    a: 'Yes. Courses, Signals, Community and Mentorship are each sold on their own. Buy only what you need.',
  },
  {
    q: 'What happens when my time runs out?',
    a: 'Access to that feature pauses. Nothing is deleted — your progress and history are there when you come back.',
  },
  {
    q: 'I already have time left. What if I buy again?',
    a: 'The new time is added on top of what you have left, so you never lose days by renewing early.',
  },
  {
    q: 'How do I pay?',
    a: 'Mobile money (MTN, Telecel, AirtelTigo) or card. Access is switched on as soon as the payment is confirmed.',
  },
];

export function PricingGrid({ products }) {
  const bundle = products.find((p) => p.grants.length > 1);
  const singles = products.filter((p) => p.grants.length === 1);
  return (
    <div className="space-y-6">
      {bundle ? (
        <Reveal>
          <PriceCard product={bundle} featured />
        </Reveal>
      ) : null}
      <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {singles.map((p) => (
          <StaggerItem key={p.key}>
            <PriceCard product={p} />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function PricingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72 w-full" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  );
}

export default function Pricing() {
  const { data, loading, error } = useApi('/api/products');

  return (
    <>
      <Helmet>
        <title>Pricing — QuickX</title>
      </Helmet>
      <Container className="py-14 sm:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-fg sm:text-5xl">
            Pay for what you use. <span className="text-gradient">Or get it all.</span>
          </h1>
          <p className="mt-4 text-lg text-fg-muted">
            Every feature has its own price. Pick one, mix a few, or take All-Access and save.
          </p>
        </Reveal>

        <div className="mt-12">
          {loading ? <PricingSkeleton /> : null}
          {error ? <Alert>{error.message}</Alert> : null}
          {data ? <PricingGrid products={data.products} /> : null}
        </div>

        <section className="mx-auto mt-20 max-w-3xl">
          <Reveal>
            <h2 className="text-2xl font-bold text-fg">Common questions</h2>
          </Reveal>
          <Stagger className="mt-6 divide-y divide-line border-y border-line">
            {FAQ.map((item) => (
              <StaggerItem key={item.q} className="py-5">
                <h3 className="font-semibold text-fg">{item.q}</h3>
                <p className="mt-2 text-sm text-fg-muted">{item.a}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      </Container>
    </>
  );
}
