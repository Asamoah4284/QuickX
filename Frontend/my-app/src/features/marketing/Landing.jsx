import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FiArrowRight, FiArrowUpRight, FiBell, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { FEATURE_LIST } from '../../lib/features';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { Avatar, Badge, Button, Card, Container, Eyebrow } from '../../ui/primitives';
import { Reveal, Stagger, StaggerItem } from '../../ui/motion';
import { PricingGrid, PricingSkeleton } from '../billing/Pricing';
import TrackRecord from '../signals/TrackRecord';
import CourseCard from '../courses/CourseCard';

const EASE = [0.22, 1, 0.36, 1];

/** Decorative sample of what a signal looks like. Not real data. */
function SampleSignal() {
  const reduce = useReducedMotion();
  const levels = [
    { label: 'Entry', value: '2,341.50', tone: 'text-fg' },
    { label: 'Stop loss', value: '2,334.00', tone: 'text-down' },
    { label: 'Target 1', value: '2,352.00', tone: 'text-up' },
    { label: 'Target 2', value: '2,360.00', tone: 'text-up' },
  ];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 1, ease: EASE, delay: 0.35 }}
      className="relative mx-auto w-full max-w-md"
      aria-hidden
    >
      <div className="absolute -inset-10 rounded-full bg-brand-600/30 blur-3xl" />
      <Card className="relative animate-float p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="tabular text-xl font-bold text-fg">XAUUSD</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-up/15 px-2.5 py-1 text-xs font-bold uppercase text-up">
              <FiArrowUpRight className="h-3.5 w-3.5" />
              Buy
            </span>
          </div>
          <Badge tone="up">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-up" />
            Live
          </Badge>
        </div>
        <svg viewBox="0 0 320 90" className="mt-5 h-24 w-full" fill="none">
          <defs>
            <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2fd08c" stopOpacity="0.35" />
              <stop offset="1" stopColor="#2fd08c" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 70 L30 62 L58 68 L92 48 L120 54 L150 36 L184 42 L214 24 L248 30 L280 12 L320 16 L320 90 L0 90 Z" fill="url(#hero-area)" />
          <motion.path
            d="M0 70 L30 62 L58 68 L92 48 L120 54 L150 36 L184 42 L214 24 L248 30 L280 12 L320 16"
            stroke="#2fd08c"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: EASE, delay: 0.7 }}
          />
        </svg>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {levels.map((l) => (
            <div key={l.label} className="rounded-xl border border-line bg-ink-900 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{l.label}</p>
              <p className={`tabular mt-0.5 text-sm font-semibold ${l.tone}`}>{l.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-fg-subtle">
          <FiBell className="h-3.5 w-3.5" />
          Sample signal for illustration
        </p>
      </Card>
    </motion.div>
  );
}

function Hero() {
  const { isSignedIn } = useAuth();
  const reduce = useReducedMotion();
  const item = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay },
  });

  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="absolute left-1/2 top-0 h-[32rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" aria-hidden />
      <Container className="relative grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div>
          <motion.div {...item(0)}>
            <Badge tone="brand">Forex education by Maxwell Donkor</Badge>
          </motion.div>
          <motion.h1 {...item(0.08)} className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-6xl">
            Learn the method.
            <br />
            <span className="text-gradient">Trade the signals.</span>
          </motion.h1>
          <motion.p {...item(0.16)} className="mt-6 max-w-xl text-lg text-fg-muted">
            Video courses, live trade signals, a community of traders and 1-on-1 mentorship. Take one, or take them all.
          </motion.p>
          <motion.div {...item(0.24)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button to={isSignedIn ? '/account' : '/register'} size="lg">
              {isSignedIn ? 'Go to my account' : 'Get started'}
              <FiArrowRight className="h-4 w-4" />
            </Button>
            <Button to="/pricing" variant="secondary" size="lg">
              See pricing
            </Button>
          </motion.div>
          <motion.ul {...item(0.32)} className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
            {['Buy only what you need', 'Pay with mobile money or card', 'Free preview lessons'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <FiCheck className="h-4 w-4 text-up" />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>
        <SampleSignal />
      </Container>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <Reveal className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h2>
        {description ? <p className="mt-3 text-fg-muted">{description}</p> : null}
      </div>
      {action}
    </Reveal>
  );
}

export default function Landing() {
  const products = useApi('/api/products');
  const record = useApi('/api/signals/public');
  const courses = useApi('/api/courses', { params: { courseType: 'forex' } });
  const owner = useApi('/api/owner');

  const featured = (Array.isArray(courses.data) ? courses.data : [])
    .filter((c) => c.listingStatus !== 'archived' && c.listingStatus !== 'draft')
    .slice(0, 3);
  const mentor = owner.data?.owner;
  const hasRecord = record.data && record.data.stats.total > 0;

  return (
    <div className="overflow-x-hidden">
      <Hero />

      <section className="border-t border-line py-20">
        <Container>
          <SectionHeading
            eyebrow="What you get"
            title="Four ways to grow as a trader"
            description="Each one works on its own. Together they cover learning, doing and getting feedback."
          />
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_LIST.map((feature) => (
              <StaggerItem key={feature.key}>
                <Card as={Link} to={feature.path} interactive className="group flex h-full flex-col p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300 transition group-hover:bg-brand-600 group-hover:text-white">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-fg">{feature.label}</h3>
                  <p className="mt-2 flex-1 text-sm text-fg-muted">{feature.blurb}</p>
                  <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-brand-400">
                    Explore
                    <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {hasRecord ? (
        <section className="border-t border-line bg-ink-900 py-20">
          <Container>
            <SectionHeading
              eyebrow="Signals"
              title="Results, in the open"
              description="Every closed signal is recorded, wins and losses alike."
              action={
                <Button to="/signals" variant="secondary">
                  View signals
                </Button>
              }
            />
            <TrackRecord data={record.data} />
          </Container>
        </section>
      ) : null}

      {featured.length ? (
        <section className="border-t border-line py-20">
          <Container>
            <SectionHeading
              eyebrow="Courses"
              title="Start with a lesson"
              description="Watch the free previews before you decide."
              action={
                <Button to="/courses" variant="secondary">
                  All courses
                </Button>
              }
            />
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((course) => (
                <StaggerItem key={course._id}>
                  <CourseCard course={course} />
                </StaggerItem>
              ))}
            </Stagger>
          </Container>
        </section>
      ) : null}

      <section className="border-t border-line bg-ink-900 py-20" id="pricing">
        <Container>
          <SectionHeading
            eyebrow="Pricing"
            title="Simple, separate prices"
            description="Only want signals? Buy signals. Want everything? All-Access costs less than buying each one."
          />
          {products.data ? <PricingGrid products={products.data.products} /> : <PricingSkeleton />}
        </Container>
      </section>

      {mentor ? (
        <section className="border-t border-line py-20">
          <Container>
            <Reveal>
              <Card className="flex flex-col items-center gap-8 p-8 text-center sm:flex-row sm:p-12 sm:text-left">
                <Avatar src={publicAssetUrl(mentor.profilePicture)} name={mentor.fullName} size={120} className="ring-4 ring-brand-500/30" />
                <div>
                  <Eyebrow>Your mentor</Eyebrow>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg">{mentor.fullName}</h2>
                  {mentor.headline ? <p className="mt-1 text-brand-300">{mentor.headline}</p> : null}
                  {mentor.bio ? <p className="mt-4 max-w-2xl whitespace-pre-line text-fg-muted">{mentor.bio}</p> : null}
                  <Button to="/mentorship" variant="secondary" className="mt-6">
                    About mentorship
                  </Button>
                </div>
              </Card>
            </Reveal>
          </Container>
        </section>
      ) : null}

      <section className="border-t border-line py-20">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] border border-brand-400/30 bg-gradient-to-br from-brand-700 via-brand-600 to-ink-800 px-6 py-14 text-center sm:px-12 sm:py-20">
              <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                  Ready when you are.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                  Create a free account, watch a preview lesson and pick the plan that fits.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button to="/register" variant="light" size="lg">
                    Create free account
                  </Button>
                  <Button to="/pricing" size="lg" className="border border-white/30 bg-white/10 shadow-none hover:bg-white/20">
                    See pricing
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </div>
  );
}
