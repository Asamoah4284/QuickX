import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiBookOpen,
  FiBook,
  FiEdit3,
  FiFileText,
  FiUsers,
  FiStar,
  FiDollarSign,
  FiCreditCard,
  FiSettings,
} from 'react-icons/fi';

/** Rotating promo lines — same blue as the main nav (`bg-blue-900`). */
const CREATOR_PROMO_SLIDES = [
  {
    eyebrow: 'Quick X Creator',
    title: 'Build and grow your course business',
    body: 'Publish premium learning experiences without any creator subscription.',
  },
  {
    eyebrow: 'Quick X Creator',
    title: 'Turn expertise into income',
    body: 'Sell courses and bundles from one studio — no separate creator subscription.',
  },
  {
    eyebrow: 'Quick X Creator',
    title: 'Reach learners everywhere',
    body: 'Structured paths, reviews, and payouts built for serious instructors.',
  },
];

const items = [
  { to: '/creator/dashboard', label: 'Overview', icon: FiBarChart2, end: true },
  { to: '/creator/dashboard/courses', label: 'My Courses', icon: FiBookOpen },
  { to: '/creator/dashboard/courses/new', label: 'Create New Course', icon: FiEdit3 },
  { to: '/creator/dashboard/books', label: 'My Books', icon: FiBook },
  { to: '/creator/dashboard/drafts', label: 'Drafts', icon: FiFileText },
  { to: '/creator/dashboard/students', label: 'Students', icon: FiUsers },
  { to: '/creator/dashboard/reviews', label: 'Reviews', icon: FiStar },
  { to: '/creator/dashboard/earnings', label: 'Earnings', icon: FiDollarSign },
  { to: '/creator/dashboard/payouts', label: 'Payouts', icon: FiCreditCard },
  { to: '/creator/dashboard/settings', label: 'Profile Settings', icon: FiSettings },
];

export default function CreatorSidebar({ onNavigate }) {
  const [promoIndex, setPromoIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPromoIndex((i) => (i + 1) % CREATOR_PROMO_SLIDES.length);
    }, 6500);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="w-full rounded-2xl border border-slate-200/80 bg-white p-3 lg:w-64 lg:p-4">
      <div className="relative mb-4 overflow-hidden rounded-xl bg-[#1B5EF5] p-4 text-white ring-1 ring-white/10">
        <div className="relative min-h-[7.5rem]">
          {CREATOR_PROMO_SLIDES.map((slide, i) => (
            <div
              key={slide.title}
              className={`transition-opacity duration-500 ease-out ${
                i === promoIndex
                  ? 'relative z-10 opacity-100'
                  : 'pointer-events-none absolute inset-0 z-0 opacity-0'
              }`}
              aria-hidden={i !== promoIndex}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/90">{slide.eyebrow}</p>
              <h2 className="mt-1.5 text-base font-semibold leading-snug">{slide.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-blue-100/85">{slide.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Promo slides">
          {CREATOR_PROMO_SLIDES.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              role="tab"
              aria-selected={i === promoIndex}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setPromoIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === promoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/35 hover:bg-white/55'
              }`}
            />
          ))}
        </div>
      </div>

      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? 'bg-[#1B5EF5]/12 text-[#1B5EF5]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                }`
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
