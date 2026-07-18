import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiArrowUpRight } from 'react-icons/fi';
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
                ['/store', 'Books'],
                ['/creator/onboarding', 'Creator programs'],
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
