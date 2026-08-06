import { Link } from 'react-router-dom';
import { FiArrowDownRight } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const HERO_BG = '/images/hero.png';

const COMMUNITY_WHATSAPP_URL = `https://wa.me/233559037872?text=${encodeURIComponent(
  'I want to join community'
)}`;

const LEARNERS = [
  'https://i.pravatar.cc/100?img=12',
  'https://i.pravatar.cc/100?img=32',
  'https://i.pravatar.cc/100?img=47',
  'https://i.pravatar.cc/100?img=68',
];

/**
 * Landing hero — single full-bleed background, no slideshow.
 */
export default function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[var(--qx-navy)] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_BG})` }}
        aria-hidden
      />

      {/* Deep cinematic wash so type stays readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, rgba(11,31,68,0.96) 0%, rgba(11,31,68,0.82) 38%, rgba(11,31,68,0.35) 72%, rgba(11,31,68,0.55) 100%)',
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -left-24 top-10 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(27,94,245,0.45), transparent 68%)',
          animation: 'qxDrift 12s ease-in-out infinite',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[360px] w-[50%] opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 80% 100%, rgba(27,94,245,0.35), transparent 60%)',
        }}
        aria-hidden
      />

      <div className="qx-grain absolute inset-0" aria-hidden />
      <div className="qx-grid-fade absolute inset-0 opacity-40" aria-hidden />

      <p
        className="pointer-events-none absolute -right-6 bottom-16 select-none text-[clamp(5rem,18vw,14rem)] font-semibold leading-none tracking-[-0.06em] text-white/[0.04] sm:bottom-10"
        aria-hidden
      >
        QuickX
      </p>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-20 pt-28 sm:justify-center sm:px-8 sm:pb-28 sm:pt-32">
        <div className="qx-rise max-w-3xl">
          <div className="flex items-center gap-3">
            <span
              className="h-px w-10 origin-left bg-[#1B5EF5]"
              style={{ animation: 'qxLine 0.8s ease both' }}
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
              QuickX Learn
            </p>
          </div>

          <h1 className="qx-rise qx-rise-d1 mt-6 text-[clamp(2.85rem,8.5vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
            Master what
            <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.85)' }}
            >
              moves
            </span>{' '}
            your future.
          </h1>

          <p className="qx-rise qx-rise-d2 mt-6 max-w-lg text-base leading-relaxed text-white/72 sm:text-lg">
            Video courses, books, and private tutor communities—built for focus, clarity, and
            progress you can feel.
          </p>

          <div className="qx-rise qx-rise-d3 mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/courses"
              className="group inline-flex items-center gap-2 rounded-2xl bg-[#1B5EF5] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1552D6]"
            >
              Explore courses
              <FiArrowDownRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link
              to="/store"
              className="inline-flex items-center rounded-2xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/10"
            >
              Browse books
            </Link>
          </div>

          {/* Community social proof */}
          <div className="qx-rise qx-rise-d4 mt-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 sm:text-[11px]">
              Join learners worldwide
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center">
                {LEARNERS.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-10 w-10 rounded-full border-2 border-white object-cover sm:h-11 sm:w-11"
                    style={{ marginLeft: i === 0 ? 0 : -12, zIndex: LEARNERS.length - i }}
                    loading="lazy"
                  />
                ))}
                <a
                  href={COMMUNITY_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 -ml-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#25D366] text-white transition hover:bg-[#1ebe57] sm:h-11 sm:w-11"
                  aria-label="Join the community on WhatsApp"
                >
                  <FaWhatsapp className="h-5 w-5" />
                </a>
              </div>
              <p className="text-sm font-bold text-white sm:text-base">Growing community</p>
            </div>
          </div>
        </div>

        <div className="qx-rise qx-rise-d4 mt-12 flex items-end justify-between gap-6 border-t border-white/10 pt-6 sm:mt-16">
          <p className="max-w-xs text-xs leading-relaxed text-white/45">
            Structured lessons. Fair pricing. Communities that keep you learning.
          </p>
          <a
            href="#browse"
            className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-white sm:inline-flex"
          >
            Scroll
            <span className="block h-8 w-px bg-gradient-to-b from-white/50 to-transparent" />
          </a>
        </div>
      </div>
    </section>
  );
}
