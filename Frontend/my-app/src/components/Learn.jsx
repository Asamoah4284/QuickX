import { Link } from 'react-router-dom';
import { FiBriefcase, FiCpu, FiPenTool, FiBookOpen, FiArrowRight } from 'react-icons/fi';

const categories = [
  {
    id: 1,
    title: 'Business & Career',
    description: 'Leadership, productivity, and skills that help you grow at work.',
    href: '/courses',
    Icon: FiBriefcase,
  },
  {
    id: 2,
    title: 'Technology',
    description: 'Programming, data, and tools teams use every day—learn by building.',
    href: '/courses',
    Icon: FiCpu,
  },
  {
    id: 3,
    title: 'Creative & Design',
    description: 'Design and media skills—from fundamentals to portfolio-ready work.',
    href: '/courses',
    Icon: FiPenTool,
  },
  {
    id: 4,
    title: 'Books & more',
    description: 'Deep dives and companion reads next to your video lessons.',
    href: '/store',
    Icon: FiBookOpen,
  },
];

export default function Learn() {
  return (
    <section id="browse" className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1B5EF5]">
            Browse by topic
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#0B1F44] sm:text-4xl">
            Find courses that fit your goals
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Pick a lane, see what&apos;s inside, and start when you&apos;re ready.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => {
            const { Icon } = cat;
            return (
              <Link
                key={cat.id}
                to={cat.href}
                className="group flex flex-col bg-white p-6 transition hover:bg-slate-50 sm:p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B5EF5]/10 text-[#1B5EF5]">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 text-base font-semibold text-[#0B1F44]">{cat.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                  {cat.description}
                </p>
                <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#1B5EF5]">
                  Explore
                  <FiArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
