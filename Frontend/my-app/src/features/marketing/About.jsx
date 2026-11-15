import { Helmet } from 'react-helmet-async';
import { FiShield, FiTarget, FiUsers } from 'react-icons/fi';
import { Button, Card, Container, Eyebrow } from '../../ui/primitives';
import { Reveal, Stagger, StaggerItem } from '../../ui/motion';
import { FEATURES } from '../../lib/features';

const VALUES = [
  {
    icon: FiTarget,
    title: 'Practical first',
    body: 'Every lesson ends with something you can try on a chart the same day.',
  },
  {
    icon: FiShield,
    title: 'Risk before reward',
    body: 'Stop losses, position sizing and patience come before any entry. No get-rich-quick promises.',
  },
  {
    icon: FiUsers,
    title: 'Learn together',
    body: 'Members share trades, ask questions and review each other’s ideas in the community.',
  },
];

export default function About() {
  return (
    <>
      <Helmet>
        <title>About QuickX | Forex education with Maxwell Donkor</title>
        <meta
          name="description"
          content="QuickX is Maxwell Donkor's forex school: video courses, live signals, a members community and 1-on-1 mentorship."
        />
      </Helmet>

      <section className="relative overflow-hidden border-b border-line bg-grid">
        <Container className="py-20 sm:py-28">
          <Reveal className="max-w-3xl">
            <Eyebrow>About QuickX</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              Forex taught the way it is actually traded.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-fg-muted">
              QuickX is the forex school of mentor Maxwell Donkor. School rarely teaches how money and markets
              work, so we built one place to learn it properly: structured courses, live trade ideas, a community
              of traders and direct mentorship.
            </p>
          </Reveal>
        </Container>
      </section>

      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <h2 className="text-2xl font-semibold text-fg">What you get</h2>
            <p className="mt-3 text-fg-muted">
              Buy only what you need, or get everything with All-Access. Books are sold separately in the store.
            </p>
            <Stagger className="mt-8 grid gap-4 sm:grid-cols-2">
              {Object.values(FEATURES).map((f) => {
                const Icon = f.icon;
                return (
                  <StaggerItem key={f.key}>
                    <Card className="h-full p-5">
                      <span className="inline-flex rounded-lg bg-brand-500/10 p-2 text-brand-300">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 font-semibold text-fg">{f.label}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-fg-muted">{f.blurb}</p>
                    </Card>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-fg">How we teach</h2>
              <ul className="mt-6 space-y-6">
                {VALUES.map((v) => {
                  const Icon = v.icon;
                  return (
                    <li key={v.title} className="flex gap-4">
                      <span className="mt-0.5 h-fit rounded-lg bg-ink-800 p-2 text-brand-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block font-semibold text-fg">{v.title}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-fg-muted">{v.body}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-8 border-t border-line pt-6 text-xs leading-relaxed text-fg-subtle">
                Trading carries risk. Nothing on QuickX is financial advice, and past results do not guarantee
                future returns.
              </p>
            </Card>
          </Reveal>
        </div>
      </Container>

      <section className="border-t border-line">
        <Container className="flex flex-col items-start justify-between gap-6 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-fg">Ready to start?</h2>
            <p className="mt-1 text-fg-muted">See the plans, or watch the free preview lessons first.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to="/pricing">See plans</Button>
            <Button to="/courses" variant="secondary">
              Browse courses
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
