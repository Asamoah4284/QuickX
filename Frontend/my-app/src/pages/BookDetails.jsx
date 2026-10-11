import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiImage,
  FiShoppingCart,
  FiPackage,
  FiStar,
  FiTruck,
  FiX,
  FiZap,
  FiZoomIn,
  FiChevronLeft,
  FiChevronRight,
  FiUsers,
  FiShield,
  FiCheckCircle,
} from 'react-icons/fi';
import { FaTelegramPlane } from 'react-icons/fa';
import { formatGhs } from '../utils/formatGhs';
import { formatBookListingPrice, getBookListingPrice } from '../utils/bookListingPrice';
import { useMetaPixelBookPage } from '../hooks/useMetaPixelBookPage';
import MetaPixelNoscript from '../components/MetaPixelNoscript';
import BookOfferPicker from '../components/BookOfferPicker';
import HardcopyRequestModal from '../components/HardcopyRequestModal';
import { isMetaPixelEnabledForBook, trackMetaInitiateCheckout } from '../utils/metaPixel';

const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';
const API_FALLBACK = 'http://localhost:5000';
const COMMUNITY_TELEGRAM_URL = 'https://t.me/quckxtrading';

function BookImageGallery({ images = [], title = 'Book' }) {
  const allImages = (Array.isArray(images) ? images : []).filter(Boolean);
  const displayImages = allImages.length > 0 ? allImages : [DEFAULT_BOOK_COVER];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const touchStartX = useRef(null);

  // Auto-swiping when multiple images exist and not paused
  useEffect(() => {
    if (displayImages.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displayImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [displayImages.length, isPaused]);

  const handlePrev = (e) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % displayImages.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 40) handleNext();
    else if (diff < -40) handlePrev();
    touchStartX.current = null;
  };

  return (
    <div
      className="w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[400px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Image Box */}
      <div
        className="group relative overflow-hidden rounded-2xl bg-white p-2.5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/90 transition hover:shadow-[0_25px_60px_-15px_rgba(15,23,42,0.22)]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-50 flex items-center justify-center">
          <img
            key={displayImages[activeIndex]}
            src={displayImages[activeIndex]}
            alt={`${title} - view ${activeIndex + 1}`}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_BOOK_COVER;
            }}
          />

          {/* Zoom Overlay Button */}
          <button
            type="button"
            onClick={() => setZoomSrc(displayImages[activeIndex])}
            aria-label="Zoom image"
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/75 text-white shadow-lg backdrop-blur-sm transition hover:bg-slate-950 hover:scale-110"
          >
            <FiZoomIn className="h-4 w-4" />
          </button>

          {/* Multiple images indicator */}
          {displayImages.length > 1 && (
            <div className="absolute top-3 left-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {activeIndex + 1} / {displayImages.length}
            </div>
          )}

          {/* Prev/Next arrows if multiple */}
          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous photo"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white hover:scale-110 sm:h-9 sm:w-9"
              >
                <FiChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next photo"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur-sm transition hover:bg-white hover:scale-110 sm:h-9 sm:w-9"
              >
                <FiChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thumbnails strip */}
      {displayImages.length > 1 && (
        <div className="mt-3.5 flex items-center justify-center gap-2 overflow-x-auto pb-1 px-1">
          {displayImages.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative h-14 w-11 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                activeIndex === idx
                  ? 'border-[#1B5EF5] ring-2 ring-blue-500/30 scale-105'
                  : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Preview */}
      {zoomSrc && (
        <TestimonialImagePreview src={zoomSrc} alt={title} onClose={() => setZoomSrc(null)} />
      )}
    </div>
  );
}

function BookReaderCommunityCard() {
  return (
    <div className="my-12 overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c2340] via-[#102d53] to-[#0088cc] p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-200 backdrop-blur-sm">
            <FaTelegramPlane className="h-3.5 w-3.5" />
            QuickX Reader &amp; Trader Community
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">
            Never Trade Alone — Join 5,000+ Readers &amp; Pro Traders
          </h3>
          <p className="text-sm leading-relaxed text-sky-100/90 sm:text-base">
            Have questions while studying this book? Join our official community to discuss strategies, access daily market breakdowns, and learn alongside profitable peers.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-sky-200">
            <span className="flex items-center gap-1.5"><FiCheckCircle className="text-sky-300" /> Free Setup Reviews</span>
            <span className="flex items-center gap-1.5"><FiCheckCircle className="text-sky-300" /> Author Discussions</span>
            <span className="flex items-center gap-1.5"><FiCheckCircle className="text-sky-300" /> 100% Free Access</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href={COMMUNITY_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-bold text-[#0c2340] shadow-md transition hover:bg-sky-50"
          >
            <FaTelegramPlane className="h-4 w-4 text-[#0088cc]" />
            Join Community on Telegram
          </a>
          <Link
            to="/community"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Community Hub
            <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function BookLearnSection({ whatYoullLearn = [], afterReadingOutcomes = [] }) {
  const learnItems = Array.isArray(whatYoullLearn) ? whatYoullLearn.filter(Boolean) : [];
  const outcomeItems = Array.isArray(afterReadingOutcomes) ? afterReadingOutcomes.filter(Boolean) : [];

  if (learnItems.length === 0 && outcomeItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 border-t border-slate-100 pt-12 sm:mt-20 sm:pt-16" aria-labelledby="what-youll-learn-heading">
      <h2 id="what-youll-learn-heading" className="text-center text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        What you&apos;ll master in this book
      </h2>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Stacked pages preview */}
        <div className="relative mx-auto w-full max-w-md justify-self-center lg:justify-self-start">
          <div
            className="absolute left-3 top-6 hidden h-[min(100%,320px)] w-[88%] rotate-[-3deg] rounded-sm border border-slate-200/90 bg-white shadow-md sm:block"
            aria-hidden
          />
          <div
            className="absolute left-6 top-3 hidden h-[min(100%,320px)] w-[88%] rotate-[2deg] rounded-sm border border-slate-200/90 bg-white shadow-md sm:block"
            aria-hidden
          />
          <div className="relative rounded-sm border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.15)] sm:p-7 sm:shadow-xl">
            <p className="text-center text-base font-bold uppercase tracking-[0.12em] text-[#1B5EF5] sm:text-lg">
              After reading outcomes
            </p>
            {outcomeItems.length > 0 ? (
              <>
                {outcomeItems.length > 1 ? (
                  <div className="mt-5 columns-2 gap-x-4 text-xs leading-[1.65] text-slate-600 sm:text-sm sm:leading-[1.7]">
                    {outcomeItems.slice(1).map((item) => (
                      <p key={item} className="break-inside-avoid">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-3.5 text-xs leading-[1.65] text-slate-700 sm:text-sm sm:leading-[1.7]">
                  {outcomeItems[0]}
                </div>
              </>
            ) : (
              <p className="mt-5 text-center text-sm leading-[1.65] text-slate-500 sm:text-base sm:leading-relaxed">
                After-reading outcomes will appear here once the author adds them.
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {learnItems.length > 0 ? (
          <div>
            <h3 className="text-lg font-bold text-slate-950 sm:text-xl">Core Chapters &amp; Takeaways</h3>
            <ul className="mt-4 space-y-3 sm:space-y-3.5">
              {learnItems.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-800 sm:text-base">
                  <FiCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function readerInitials(name) {
  const parts = String(name || '')
    .replace(/\./g, '')
    .split(' ')
    .filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StarRating() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, i) => (
        <FiStar key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
      ))}
    </div>
  );
}

function TestimonialImagePreview({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Testimonial preview'}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 px-4 py-8 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <FiX className="h-5 w-5" aria-hidden />
      </button>
      <img
        src={src}
        alt={alt || 'Testimonial preview'}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}

function BookTestimonialsSection({ testimonials = [] }) {
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewAlt, setPreviewAlt] = useState('');
  const scrollRef = useRef(null);

  if (!testimonials.length) return null;

  const openPreview = (src, alt) => {
    setPreviewSrc(src);
    setPreviewAlt(alt);
  };

  const closePreview = () => {
    setPreviewSrc(null);
    setPreviewAlt('');
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  return (
    <section
      className="mt-12 rounded-3xl border border-slate-200/70 bg-gradient-to-b from-slate-50/70 to-white p-6 sm:p-8"
      aria-labelledby="book-testimonials-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200/80 mb-2">
            <FiStar className="h-3 w-3 fill-amber-400 text-amber-500" />
            Reader Reviews &amp; Results
          </div>
          <h2
            id="book-testimonials-heading"
            className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
          >
            What Readers Say
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Real feedback from Ghanaian traders who put this book into practice.
          </p>
        </div>

        {testimonials.length > 1 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleScrollLeft}
              aria-label="Previous review"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 hover:border-slate-300"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              aria-label="Next review"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 hover:border-slate-300"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="mt-6 flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        {testimonials.map((t, index) => (
          <div
            key={`${t.tagline}-${t.name}-${index}`}
            className="w-[280px] sm:w-[330px] shrink-0 snap-start flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <StarRating />
                {t.tagline ? (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate max-w-[130px]">
                    {t.tagline}
                  </span>
                ) : null}
              </div>

              <blockquote className="mt-3">
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 line-clamp-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              {t.image ? (
                <div
                  onClick={() =>
                    openPreview(
                      t.image,
                      t.tagline || (t.name ? `${t.name} testimonial` : 'Reader proof')
                    )
                  }
                  className="mb-3 group relative cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 flex items-center justify-center"
                >
                  <img
                    src={t.image}
                    alt={t.tagline || 'Reader proof'}
                    className="max-h-24 w-auto object-contain transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-900 text-[10px] font-semibold px-2 py-1 rounded-full shadow flex items-center gap-1">
                      <FiZoomIn className="h-3 w-3" /> Zoom proof
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-2.5">
                {t.name ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
                    {readerInitials(t.name)}
                  </span>
                ) : null}
                <div className="min-w-0">
                  {t.name ? (
                    <p className="text-xs font-bold text-slate-900 truncate">{t.name}</p>
                  ) : null}
                  {t.role ? (
                    <p className="text-[11px] text-slate-500 truncate">{t.role}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TestimonialImagePreview
        src={previewSrc}
        alt={previewAlt}
        onClose={closePreview}
      />
    </section>
  );
}

/** First N outcome bullets for the hero column. */
function heroOutcomes(book, limit = 3) {
  const items = Array.isArray(book?.afterReadingOutcomes)
    ? book.afterReadingOutcomes.map((s) => String(s).trim()).filter(Boolean)
    : [];
  return items.slice(0, limit);
}

function heroDescription(book) {
  const d = (book?.description || '').trim();
  if (d) return d;
  return book?.type === 'ebook'
    ? 'Digital edition with instant access after checkout.'
    : 'Request a printed copy and our team will follow up with delivery details.';
}

function HardcopyCtaButton({ onClick, variant = 'outline', className = '' }) {
  const isPrimary = variant === 'primary';

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`overflow-hidden rounded-2xl border-2 ${
          isPrimary
            ? 'border-[#FF5A5F] bg-[#FF5A5F] shadow-lg shadow-rose-500/20'
            : 'border-emerald-200 bg-white shadow-sm shadow-emerald-900/5'
        }`}
      >
        <div
          className={`flex items-center justify-center gap-2 px-4 py-2 text-center ${
            isPrimary ? 'bg-white/15 text-white' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          <FiTruck className="h-4 w-4 shrink-0" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-[0.14em]">
            Free delivery nationwide
          </span>
        </div>
        <button
          type="button"
          onClick={onClick}
          className={`flex w-full items-center justify-center gap-3 px-6 py-3.5 text-center transition ${
            isPrimary
              ? 'bg-[#FF5A5F] text-white hover:bg-[#E04E52]'
              : 'bg-white hover:bg-emerald-50/60'
          }`}
        >
          <FiPackage
            className={`h-5 w-5 shrink-0 ${isPrimary ? 'text-white' : 'text-emerald-700'}`}
            aria-hidden
          />
          <span>
            <span
              className={`block text-sm font-semibold leading-snug ${
                isPrimary ? 'text-white' : 'text-slate-800'
              }`}
            >
              Prefer Hard Copy?
            </span>
            <span
              className={`block text-sm leading-snug ${
                isPrimary ? 'font-semibold text-white/95' : 'font-medium text-slate-600'
              }`}
            >
              Request Here
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

function SameAuthorBooksSection({ author, books = [] }) {
  const items = books.slice(0, 6);
  if (!items.length) return null;
  const hasMultiple = items.length > 1;

  return (
    <section
      className="relative -mx-4 mt-12 overflow-hidden rounded-none bg-[#0c2340] py-8 sm:-mx-6 sm:mt-20 sm:rounded-[2rem] sm:py-14 lg:mx-0 lg:mt-24 lg:rounded-[2rem] lg:px-10 lg:py-16"
      aria-labelledby="same-author-heading"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div className="relative sm:px-8 lg:px-0">
        <div className="px-4 sm:px-0">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-400/90 sm:text-[11px] sm:tracking-[0.28em]">
                Curated collection
              </p>
              <h2
                id="same-author-heading"
                className="mt-1.5 text-xl font-black leading-tight tracking-tight text-white sm:mt-2 sm:text-3xl lg:text-[2rem]"
              >
                More from {author}
              </h2>
            </div>
            <p className="hidden max-w-md text-sm leading-relaxed text-slate-400 sm:block lg:text-right">
              Hand-picked titles from the same author — expand your library with their full body of work.
            </p>
          </div>

          {hasMultiple ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 sm:hidden">
              Swipe to explore more
              <FiArrowRight className="h-3.5 w-3.5" aria-hidden />
            </p>
          ) : null}
        </div>

        <ul
          className="mt-6 flex gap-3 overflow-x-auto scroll-smooth pb-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] sm:mt-12 sm:gap-6 sm:pb-2 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => {
            const isEbook = item.type === 'ebook';
            const hardcopyLabel =
              isEbook && item.hardcopyPrice != null && item.hardcopyPrice !== ''
                ? formatGhs(item.hardcopyPrice)
                : null;

            return (
              <li
                key={item._id}
                className="w-[min(88vw,20rem)] shrink-0 snap-start sm:w-[19rem]"
              >
                <Link
                  to={`/store/${item._id}`}
                  className="group block h-full"
                >
                  <article className="relative flex h-full flex-row items-stretch gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all duration-500 sm:flex-col sm:rounded-2xl sm:p-6 sm:hover:border-amber-400/25 sm:hover:from-white/[0.11] sm:hover:to-white/[0.04] sm:hover:shadow-[0_28px_56px_-16px_rgba(0,0,0,0.55)]">
                    <span
                      className="pointer-events-none absolute right-3 top-2 hidden select-none font-serif text-5xl font-light leading-none text-white/[0.07] sm:block"
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="relative w-[5.5rem] shrink-0 self-center sm:mx-auto sm:w-[9.5rem]">
                      <div
                        className="absolute inset-x-2 top-2 hidden aspect-[2/3] rounded-lg bg-white/[0.04] shadow-lg sm:block"
                        aria-hidden
                      />
                      <div
                        className="absolute inset-x-1 top-1 hidden aspect-[2/3] rounded-lg bg-white/[0.07] sm:block"
                        aria-hidden
                      />
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-[0_12px_28px_-8px_rgba(0,0,0,0.55)] ring-1 ring-white/15 sm:shadow-[0_22px_44px_-10px_rgba(0,0,0,0.65)] sm:transition sm:duration-500 sm:ease-out sm:group-hover:-translate-y-2 sm:group-hover:rotate-[-2deg] sm:group-hover:shadow-[0_28px_50px_-8px_rgba(0,0,0,0.7)]">
                        <img
                          src={item.thumbnail || DEFAULT_BOOK_COVER}
                          alt=""
                          className="h-full w-full object-cover sm:transition sm:duration-700 sm:group-hover:scale-[1.04]"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_BOOK_COVER;
                          }}
                        />
                        <div className="absolute inset-0 hidden bg-gradient-to-t from-[#0c2340]/80 via-transparent to-transparent opacity-0 sm:block sm:transition-opacity sm:duration-500 sm:group-hover:opacity-100" />
                      </div>
                      <span
                        className={`absolute -bottom-1.5 left-1/2 max-w-[calc(100%+0.5rem)] -translate-x-1/2 truncate rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide shadow-md sm:-bottom-2 sm:px-2.5 sm:py-0.5 sm:text-[10px] sm:tracking-wider sm:shadow-lg ${
                          isEbook
                            ? 'bg-indigo-500 text-white ring-2 ring-[#0c2340]'
                            : 'bg-emerald-500 text-white ring-2 ring-[#0c2340]'
                        }`}
                      >
                        {isEbook ? 'Digital' : 'Print'}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-center py-1 text-left sm:mt-8 sm:py-0 sm:text-center">
                      <h3 className="line-clamp-3 text-sm font-bold leading-snug text-white sm:line-clamp-2 sm:min-h-[2.75rem] sm:text-base">
                        {item.title}
                      </h3>

                      <div className="mt-2 flex flex-col items-start gap-0.5 sm:mt-4 sm:items-center sm:gap-1">
                        <p className="text-lg font-black tracking-tight text-amber-400 sm:text-2xl">
                          {formatBookListingPrice(item)}
                        </p>
                        {hardcopyLabel ? (
                          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 sm:text-[11px]">
                            Hardcopy {hardcopyLabel}
                          </p>
                        ) : null}
                      </div>

                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/75 sm:mt-auto sm:justify-center sm:pt-5 sm:text-sm sm:transition sm:group-hover:text-amber-300">
                        Explore this title
                        <FiArrowRight
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:transition sm:duration-300 sm:group-hover:translate-x-1"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </article>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function BookDetails() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || API_FALLBACK;

  const [book, setBook] = useState(null);
  const [offerGroup, setOfferGroup] = useState(null);
  const [sameAuthorBooks, setSameAuthorBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHardcopyModal, setShowHardcopyModal] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      axios.get(`${API_URL}/api/books/${bookId}/preview`),
      axios.get(`${API_URL}/api/books/${bookId}/offers`).catch(() => ({ data: { offerGroup: null } })),
    ])
      .then(([previewRes, offersRes]) => {
        if (cancelled) return;
        if (previewRes.data?.redirectTo) {
          navigate(`/store/${previewRes.data.redirectTo}`, { replace: true });
          return;
        }
        setBook(previewRes.data);
        setOfferGroup(offersRes.data?.offerGroup || null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.response?.data?.message || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [API_URL, bookId, navigate]);

  useEffect(() => {
    if (!book?.author) {
      setSameAuthorBooks([]);
      return undefined;
    }

    let cancelled = false;

    axios
      .get(`${API_URL}/api/books`, {
        params: { author: book.author, exclude: book._id },
      })
      .then((res) => {
        if (!cancelled) setSameAuthorBooks(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setSameAuthorBooks([]);
      });

    return () => {
      cancelled = true;
    };
  }, [API_URL, book?.author, book?._id]);

  const heroOutcomePoints = useMemo(
    () => (book ? heroOutcomes(book, 3) : []),
    [book]
  );

  const bundleOfferOption = useMemo(() => {
    const options = offerGroup?.options || [];
    if (!options.length) return null;
    return (
      options.find((o) => o.type === 'bundle') ||
      options.find((o) => o.highlighted) ||
      null
    );
  }, [offerGroup]);

  const listingPriceInfo = useMemo(
    () => (book ? getBookListingPrice(book, offerGroup) : null),
    [book, offerGroup]
  );

  const activeTestimonials = useMemo(() => {
    if (!Array.isArray(book?.testimonials)) return [];
    return book.testimonials.filter((t) => String(t?.quote || '').trim());
  }, [book?.testimonials]);

  useMetaPixelBookPage(book, bookId);

  const goToCheckout = (item) => {
    if (isMetaPixelEnabledForBook(bookId)) {
      trackMetaInitiateCheckout(book);
    }
    navigate('/checkout', {
      state: {
        item,
        returnPath: `/store/${book._id}`,
        guestEbook: true,
      },
    });
  };

  const addEbookToCart = () => {
    if (!book?._id) return;
    goToCheckout({
      type: 'book',
      id: book._id,
      _id: book._id,
      title: book.title,
      price: Number(book.price || 0),
      thumbnail: book.thumbnail,
      image: book.thumbnail,
      author: book.author,
    });
  };

  const selectOfferOption = (option) => {
    if (!offerGroup?.id || !option?.id) return;
    goToCheckout({
      type: 'book_offer',
      id: offerGroup.id,
      offerGroupId: offerGroup.id,
      offerOptionId: option.id,
      title: option.cardTitle || option.headline || book.title,
      price: Number(option.price || 0),
      thumbnail: option.thumbnail,
      image: option.thumbnail,
      author: book.author,
      books: option.books,
      bookIds: option.bookIds,
    });
  };

  const openHardcopyModal = () => {
    if (!book) return;
    setShowHardcopyModal(true);
  };

  const handleHardcopyInstantPay = (orderInfo) => {
    if (!book) return;
    setShowHardcopyModal(false);
    const bookPrice =
      book.hardcopyPrice != null && book.hardcopyPrice !== ''
        ? Number(book.hardcopyPrice)
        : Number(book.price ?? 0);
    const fee = Number(orderInfo.deliveryFee || 0);
    goToCheckout({
      type: 'book',
      id: book._id,
      _id: book._id,
      title: `${book.title} (Physical Copy)`,
      format: 'hardcopy',
      deliveryType: orderInfo.deliveryType || 'instant_pay',
      deliveryFee: fee,
      estimatedDays: orderInfo.estimatedDays || '2 - 4 business days',
      shippingAddress: {
        fullName: orderInfo.name,
        phone: orderInfo.phone,
        location: orderInfo.location,
        deliveryType: orderInfo.deliveryType || 'instant_pay',
        deliveryFee: fee,
        estimatedDays: orderInfo.estimatedDays || '2 - 4 business days',
      },
      price: bookPrice + fee,
      thumbnail: book.thumbnail,
      image: book.thumbnail,
      author: book.author,
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <MetaPixelNoscript />
      <header className="sticky top-0 z-30 border-b border-slate-100/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            to="/store"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950"
          >
            <FiArrowLeft className="h-4 w-4" aria-hidden />
            <span>Store Marketplace</span>
          </Link>
          <a
            href={COMMUNITY_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-[#0088cc] ring-1 ring-sky-200/80 transition hover:bg-sky-100"
          >
            <FaTelegramPlane className="h-3.5 w-3.5 text-[#0088cc]" />
            <span>Join Our Community</span>
          </a>
        </div>
      </header>

      {/* Top Community Notification Banner */}
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-blue-50 to-sky-50 px-4 py-2.5 text-center text-xs text-slate-700 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 flex-wrap">
          <span className="flex h-2 w-2 rounded-full bg-[#0088cc] animate-pulse" />
          <span className="font-semibold text-slate-800">QuickX Trader Community:</span>
          <span>5,000+ Ghanaian traders sharing daily setups &amp; book discussion.</span>
          <a
            href={COMMUNITY_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#0088cc] hover:underline inline-flex items-center gap-1"
          >
            Join Free &rarr;
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8 lg:pb-28 lg:pt-12">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-rose-500" />
              <p className="text-sm font-medium">Loading book?</p>
            </div>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-rose-100 bg-rose-50 px-6 py-8 text-center text-sm text-rose-800">
            <p className="font-semibold">We couldn&apos;t load this book</p>
            <p className="mt-2 text-rose-700/90">{error}</p>
            <Link
              to="/store"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Browse marketplace
            </Link>
          </div>
        ) : !book ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
            Book not found.
            <div className="mt-4">
              <Link to="/store" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
                Return to store
              </Link>
            </div>
          </div>
        ) : (
          <>
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-20">
            <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-1 lg:max-w-xl">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1B5EF5] ring-1 ring-blue-200/80">
                    📱 Digital E-Book Edition
                  </span>
                  <a
                    href={COMMUNITY_TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-[#0088cc] ring-1 ring-sky-200/80 hover:bg-sky-100 transition"
                  >
                    <FaTelegramPlane className="h-3 w-3" />
                    <span>Community Recommended</span>
                  </a>
                </div>

                <div className="space-y-2">
                  <h1 className="text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.5rem]">
                    {book.title}
                  </h1>
                  <p className="text-base font-medium text-slate-500">By {book.author}</p>
                  {book.type === 'ebook' && listingPriceInfo ? (
                    <p className="text-xl font-black tracking-tight text-[#0c2340]">
                      {listingPriceInfo.showFromLabel ? 'From ' : ''}
                      {formatGhs(listingPriceInfo.displayPrice)}
                    </p>
                  ) : null}
                </div>

                {/* Instant value guarantees */}
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1 text-slate-800 font-semibold"><FiZap className="text-amber-500" /> Instant PDF Access</span>
                  <span className="flex items-center gap-1 text-slate-800 font-semibold"><FiCheck className="text-emerald-500" /> MoMo Checkout</span>
                  <span className="flex items-center gap-1 text-slate-800 font-semibold"><FiShield className="text-sky-500" /> Lifetime Access</span>
                </div>

                <p className="text-pretty text-base leading-relaxed text-slate-600 line-clamp-5 sm:text-[1.05rem]">
                  {heroDescription(book)}
                </p>
              </div>

              {heroOutcomePoints.length > 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-6">
                  <p className="text-sm font-bold text-slate-900 sm:text-base">What this book helps you achieve:</p>
                  <ul className="mt-4 space-y-3">
                    {heroOutcomePoints.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-snug text-slate-700 sm:text-[15px]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <FiCheck className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {book.type === 'ebook' && !offerGroup?.options?.length ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={addEbookToCart}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-[#E04E52] sm:w-auto sm:min-w-[240px]"
                  >
                    <FiShoppingCart className="h-5 w-5 shrink-0" aria-hidden />
                    Buy now — instant download
                  </button>
                  <p className="text-xs text-slate-500">
                    No account needed · Pay with Mobile Money · Download right after payment
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={COMMUNITY_TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-[#0088cc] transition hover:bg-sky-100"
                    >
                      <FaTelegramPlane className="h-3.5 w-3.5" />
                      <span>Join Our Trader Community Free</span>
                    </a>
                    <HardcopyCtaButton onClick={openHardcopyModal} className="sm:max-w-[240px]" />
                  </div>
                </div>
              ) : book.type === 'ebook' && offerGroup?.options?.length && bundleOfferOption ? (
                <div className="w-full max-w-md space-y-2.5">
                  <div className="rounded-2xl bg-[#0c2340] p-2.5 shadow-lg shadow-[#0c2340]/20 sm:p-3">
                    <button
                      type="button"
                      onClick={() => selectOfferOption(bundleOfferOption)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-[#0c2340] shadow-sm transition hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c2340] sm:py-4 sm:text-base"
                    >
                      <FiZap className="h-5 w-5 shrink-0" aria-hidden />
                      Buy Now — Bundle {formatGhs(bundleOfferOption.price)}
                    </button>
                  </div>
                  {listingPriceInfo?.showFromLabel ? (
                    <p className="text-center text-xs text-slate-500">
                      Single plans from {formatGhs(listingPriceInfo.displayPrice)} · compare all options below
                    </p>
                  ) : (
                    <p className="text-center text-xs text-slate-500">
                      Secure · MoMo · Instant PDF · Compare all plans below
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <a
                      href={COMMUNITY_TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-[#0088cc] transition hover:bg-sky-100"
                    >
                      <FaTelegramPlane className="h-3.5 w-3.5" />
                      <span>Join Trader Community</span>
                    </a>
                    <HardcopyCtaButton onClick={openHardcopyModal} />
                  </div>
                </div>
              ) : book.type === 'ebook' && offerGroup?.options?.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">
                    Choose a plan below. No account needed · MoMo checkout.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={COMMUNITY_TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-[#0088cc] transition hover:bg-sky-100"
                    >
                      <FaTelegramPlane className="h-3.5 w-3.5" />
                      <span>Join Trader Community</span>
                    </a>
                    <HardcopyCtaButton onClick={openHardcopyModal} className="sm:max-w-[240px]" />
                  </div>
                </div>
              ) : book.type !== 'ebook' ? (
                <div className="space-y-3">
                  <HardcopyCtaButton onClick={openHardcopyModal} variant="primary" className="sm:mx-auto sm:max-w-[280px]" />
                  <p className="text-sm text-slate-500">
                    Fill in your details — we&apos;ll confirm free delivery on WhatsApp.
                  </p>
                  <div>
                    <a
                      href={COMMUNITY_TELEGRAM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-[#0088cc] transition hover:bg-sky-100"
                    >
                      <FaTelegramPlane className="h-3.5 w-3.5" />
                      <span>Join Community on Telegram</span>
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right: Scrollable / Swiping Book Image Gallery */}
            <div className="order-2 flex justify-center lg:order-2 lg:justify-end lg:pl-4">
              <BookImageGallery
                images={[book.thumbnail, ...(book.galleryImages || [])]}
                title={book.title}
              />
            </div>
          </div>

          {/* Testimonials (moved higher up with smooth horizontal UX) */}
          {activeTestimonials.length > 0 ? (
            <BookTestimonialsSection testimonials={activeTestimonials} />
          ) : null}

          {/* Reader & Trader Community Companion Card */}
          <BookReaderCommunityCard />

          {/* Purchase Plans for E-Book */}
          {offerGroup?.options?.length ? (
            <BookOfferPicker
              offerGroup={offerGroup}
              apiUrl={API_URL}
              onSelectOption={selectOfferOption}
            />
          ) : null}

          <BookLearnSection
            whatYoullLearn={book.whatYoullLearn}
            afterReadingOutcomes={book.afterReadingOutcomes}
          />

          <SameAuthorBooksSection author={book.author} books={sameAuthorBooks} />

          <HardcopyRequestModal
            book={book}
            open={showHardcopyModal}
            onClose={() => setShowHardcopyModal(false)}
            onSelectInstantPay={handleHardcopyInstantPay}
          />
          </>
        )}
      </div>
    </div>
  );
}

export default BookDetails;
