import React from 'react';
import { Link } from 'react-router-dom';
import { FiBriefcase, FiCpu, FiPenTool, FiBookOpen, FiArrowRight } from 'react-icons/fi';

const categories = [
  {
    id: 1,
    title: 'Business & Career',
    description:
      'Leadership, productivity, communication, and skills that help you grow at work.',
    href: '/courses',
    Icon: FiBriefcase,
    iconWrap: 'from-sky-500 to-blue-600 shadow-sky-500/25',
    linkClass: 'text-sky-600 group-hover:text-sky-700',
  },
  {
    id: 2,
    title: 'Technology',
    description:
      'Programming, data, cloud, and tools that teams use every day—learn by building.',
    href: '/courses',
    Icon: FiCpu,
    iconWrap: 'from-violet-500 to-indigo-600 shadow-violet-500/25',
    linkClass: 'text-violet-600 group-hover:text-violet-700',
  },
  {
    id: 3,
    title: 'Creative & Design',
    description:
      'Design, media, and creative skills—from fundamentals to portfolio-ready work.',
    href: '/courses',
    Icon: FiPenTool,
    iconWrap: 'from-fuchsia-500 to-pink-600 shadow-fuchsia-500/25',
    linkClass: 'text-fuchsia-600 group-hover:text-fuchsia-700',
  },
  {
    id: 4,
    title: 'Books & more',
    description:
      'Deep dives and companion reads next to your video lessons—all in one place.',
    href: '/store',
    Icon: FiBookOpen,
    iconWrap: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    linkClass: 'text-emerald-600 group-hover:text-emerald-700',
  },
];

const Learn = () => {
  return (
    <section className="relative border-y border-gray-100/80 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/50">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
        <div className="mb-10 text-center sm:mb-14">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600 sm:text-xs">
            Browse by topic
          </p>
          <h2 className="mx-auto mb-3 max-w-2xl text-xl font-bold tracking-tight text-gray-900 sm:mb-4 sm:text-2xl md:text-3xl lg:text-4xl">
            Find courses that fit your goals
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Same idea as browsing a course marketplace—pick a lane, see what&apos;s inside, and start when
            you&apos;re ready.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {categories.map((cat) => {
            const { Icon } = cat;
            return (
              <Link
                key={cat.id}
                to={cat.href}
                className="group relative flex flex-col rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] sm:p-6"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${cat.iconWrap}`}
                  aria-hidden
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <h3 className="text-[15px] font-semibold leading-snug text-gray-900 sm:text-base">
                  {cat.title}
                </h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-gray-600 sm:text-sm">
                  {cat.description}
                </p>
                <span
                  className={`mt-5 inline-flex items-center text-[13px] font-semibold sm:text-sm ${cat.linkClass}`}
                >
                  Explore
                  <FiArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Learn;
