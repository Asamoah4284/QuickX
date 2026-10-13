import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiArrowUpRight } from 'react-icons/fi';
import { FaTelegramPlane } from 'react-icons/fa';
import '../styles/landing.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-[#07152f] text-white">
      {/* Layered atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 420px at 12% 0%, rgba(27,94,245,0.28), transparent 55%), radial-gradient(700px 380px at 90% 100%, rgba(27,94,245,0.16), transparent 50%), linear-gradient(180deg, #0B1F44 0%, #07152f 55%, #050f22 100%)',
        }}
        aria-hidden
      />
      <div className="qx-grain absolute inset-0 opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
        aria-hidden
      />

      {/* Giant watermark */}
      <p
        className="pointer-events-none absolute -bottom-8 left-1/2 w-full -translate-x-1/2 select-none text-center text-[clamp(4.5rem,16vw,12rem)] font-semibold leading-none tracking-[-0.06em] text-white/[0.035]"
        aria-hidden
      >
        QUICKX
      </p>

      <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8 sm:pb-12 sm:pt-20">
        {/* Top CTA strip */}
        <div className="mb-14 flex flex-col gap-6 border-b border-white/10 pb-12 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-lg">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7BA3FF]">
              Stay curious
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              Learn with clarity.
              <br />
              Build with confidence.
            </h2>
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 self-start rounded-2xl bg-[#1B5EF5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1552D6] sm:self-auto"
          >
            Explore the catalog
            <FiArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Telegram Community Strip */}
        <div className="mb-14 rounded-3xl border border-white/10 bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-transparent p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#229ED9]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#7BA3FF]">
                <FaTelegramPlane className="h-3.5 w-3.5 text-[#229ED9]" />
                Official Community
              </div>
              <h3 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Trade with 5,000+ Ghanaian traders & learners.
              </h3>
              <p className="mt-2 text-sm text-white/70">
                Daily market analysis, live trade breakdowns, and direct tutor support on Telegram.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href="https://t.me/quickxtrading"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#229ED9] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#229ED9]/25 transition hover:bg-[#1e8cc0] hover:scale-[1.02] active:scale-[0.98]"
              >
                <FaTelegramPlane className="h-4 w-4" />
                Join on Telegram
              </a>
              <Link
                to="/community"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/10"
              >
                Community Hub
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex rounded-xl bg-white px-2.5 py-1.5">
              <img src="/logo.jpg" alt="QuickX Learn" className="h-9 w-auto object-contain" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">
              Courses, books, and tutor communities—clear teaching and fair value in one place.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Explore
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                ['/courses', 'Courses'],
                ['/events', 'Events & Workshops'],
                ['/store', 'Books'],
                ['/programs', 'Creator programs'],
                ['/school', 'School'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-white/70 transition hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Account
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                ['/login', 'Sign in'],
                ['/register', 'Create account'],
                ['/membership', 'Dashboard'],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-white/70 transition hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Contact
            </h3>
            <ul className="mt-4 space-y-3.5 text-sm text-white/70">
              <li className="flex items-start gap-2.5">
                <FiMail className="mt-0.5 h-4 w-4 shrink-0 text-[#1B5EF5]" />
                <a href="mailto:Quickx310@gmail.com" className="hover:text-white">
                  Quickx310@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <FiPhone className="mt-0.5 h-4 w-4 shrink-0 text-[#1B5EF5]" />
                <a href="tel:+233555756303" className="hover:text-white">
                  +233 555 756 303
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1B5EF5]" />
                <span>Central Region, Cape Coast</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-8 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} <span className="text-white/70">QuickX Learn</span>. All rights reserved.
          </p>
          <p className="text-white/30">Designed for focused learners.</p>
        </div>
      </div>
    </footer>
  );
}
