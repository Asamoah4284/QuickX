import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiCheck, FiMinus, FiPlus, FiShoppingCart, FiPackage } from 'react-icons/fi';

const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';
const API_FALLBACK = 'http://localhost:5000';

/** Mock curriculum — replace with API fields when available */
const MOCK_WHAT_YOULL_LEARN = [
  'The basics of currency pairs',
  'Who uses the currency pairs',
  'Currencies available in the currency pairs',
  'Why trade currency pairs at Deriv',
  'Currency pairs available for trading at Deriv',
  'Currency pairs in more detail',
];

const MOCK_AFTER_READING = [
  'Understand fundamental concepts of the currency pairs',
  'Apply basic trading strategies, techniques, and risk management principles',
  'Analyse chart patterns to anticipate potential price movements',
  'Apply informed trading strategies in various market conditions',
];

const MOCK_BOOK_TESTIMONIALS = [
  {
    quote:
      'Clear structure and practical examples. I finished feeling confident to apply what I read on a demo account the same week.',
    name: 'Kojo A.',
    role: 'Retail trader, Accra',
  },
  {
    quote:
      'Finally a book that does not skip risk management. The pacing is perfect for evenings after work.',
    name: 'Ama Serwaa',
    role: 'Part-time learner',
  },
  {
    quote:
      'Worth every cedi. Highlights and summaries at the end of each section made revision easy.',
    name: 'Emmanuel T.',
    role: 'Marketplace buyer',
  },
];

function BookLearnSectionMock() {
  return (
    <section className="mt-20 border-t border-slate-100 pt-16 sm:mt-24 sm:pt-20 lg:mt-28 lg:pt-24" aria-labelledby="what-youll-learn-heading">
      <h2 id="what-youll-learn-heading" className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
        What you&apos;ll learn
      </h2>

      <div className="mt-12 grid items-start gap-12 lg:mt-16 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        {/* Stacked “pages” preview (decorative) */}
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
            <p className="text-center text-base font-bold uppercase tracking-[0.12em] text-[#c4122e] sm:text-lg">Introduction</p>
            <div className="mt-5 columns-2 gap-x-4 text-[11px] leading-relaxed text-slate-600 sm:text-xs">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
              <p className="mt-0 break-inside-avoid">
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="break-inside-avoid">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
              <p className="break-inside-avoid">
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>
            <div className="mt-5 rounded-lg border border-sky-100 bg-sky-50/90 px-3 py-3 text-[11px] leading-snug text-slate-700 sm:text-xs">
              This chapter sets the foundation for everything that follows — key definitions, context, and how to read the examples in this book.
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-10 lg:space-y-12">
          <div>
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">What you&apos;ll learn</h3>
            <ul className="mt-5 space-y-3.5 sm:space-y-4">
              {MOCK_WHAT_YOULL_LEARN.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-800 sm:text-base">
                  <FiCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" strokeWidth={2.5} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">After reading, you&apos;ll be able to</h3>
            <ul className="mt-5 space-y-3.5 sm:space-y-4">
              {MOCK_AFTER_READING.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-800 sm:text-base">
                  <FiCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" strokeWidth={2.5} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function BookTestimonialsSectionMock() {
  return (
    <section className="mt-20 border-t border-slate-100 pt-16 sm:mt-24 sm:pt-20 lg:mt-28 lg:pt-24" aria-labelledby="book-testimonials-heading">
      <h2 id="book-testimonials-heading" className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
        What readers say
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600 sm:text-base">
        Real feedback from people who bought and read titles on QuickX. (Sample quotes for layout — connect to reviews later.)
      </p>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-8">
        {MOCK_BOOK_TESTIMONIALS.map((t) => (
          <li
            key={t.name}
            className="flex flex-col rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-7"
          >
            <blockquote className="flex-1 text-sm leading-relaxed text-slate-800 sm:text-[15px]">&ldquo;{t.quote}&rdquo;</blockquote>
            <footer className="mt-6 border-t border-slate-200/80 pt-4">
              <p className="font-semibold text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500 sm:text-sm">{t.role}</p>
            </footer>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Bottom banner — same purchase actions as hero */
function BookFinalCta({ book, priceLabel, onGetEbook, onRequestHardcopy }) {
  const isEbook = book.type === 'ebook';

  return (
    <section
      className="mt-20 rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-6 py-12 text-center shadow-xl sm:mt-24 sm:px-10 sm:py-14 lg:mt-28 lg:px-12 lg:py-16"
      aria-labelledby="book-final-cta-heading"
    >
      <h2 id="book-final-cta-heading" className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
        {isEbook ? 'Get your copy today' : 'Request your hardcopy'}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-slate-300 sm:text-base">
        {isEbook
          ? 'Add this ebook to your cart and check out securely. You’ll get digital access after payment is confirmed.'
          : 'We’ll open WhatsApp with your book details so our team can confirm delivery and payment.'}
      </p>
      <p className="mt-6 text-xl font-bold text-white sm:text-2xl">{priceLabel}</p>
      <p className="mt-1 text-sm text-slate-400">{book.title}</p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
        {isEbook ? (
          <button
            type="button"
            onClick={onGetEbook}
            className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#E04E52] sm:w-auto sm:min-w-[220px]"
          >
            <FiShoppingCart className="h-5 w-5 shrink-0" aria-hidden />
            Get ebook
          </button>
        ) : (
          <button
            type="button"
            onClick={onRequestHardcopy}
            className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#E04E52] sm:w-auto sm:min-w-[240px]"
          >
            <FiPackage className="h-5 w-5 shrink-0" aria-hidden />
            Request hardcopy
          </button>
        )}
        <Link
          to="/store"
          className="text-sm font-medium text-slate-300 underline-offset-4 transition hover:text-white hover:underline"
        >
          Browse more books
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">Checkout required · Secure payment</p>
    </section>
  );
}

function formatGhs(value) {
  const n = Number(value || 0);
  return `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Short subtitle from description (hero style). */
function heroSubtitle(book) {
  const d = (book?.description || '').trim();
  if (!d) {
    return `By ${book?.author || 'the author'} — ${book?.type === 'ebook' ? 'digital edition with instant access after checkout.' : 'request a printed copy and we will follow up with delivery details.'}`;
  }
  if (d.length <= 220) return d;
  return `${d.slice(0, 217).trim()}…`;
}

function BookDetails() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || API_FALLBACK;

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    axios
      .get(`${API_URL}/api/books/${bookId}/preview`)
      .then(({ data }) => {
        if (cancelled) return;
        setBook(data);
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
  }, [API_URL, bookId]);

  const safeQty = useMemo(() => Math.max(1, Math.min(99, Number(qty) || 1)), [qty]);

  const addEbookToCart = () => {
    if (!book?._id) return;
    try {
      const raw = JSON.parse(localStorage.getItem('bookCart') || '[]');
      const cart = Array.isArray(raw) ? raw : [];
      const existingIndex = cart.findIndex((i) => String(i?.id) === String(book._id));
      if (existingIndex >= 0) {
        cart[existingIndex] = {
          ...cart[existingIndex],
          qty: Math.max(1, Number(cart[existingIndex]?.qty || 1)) + safeQty,
        };
      } else {
        cart.push({
          id: book._id,
          type: 'book',
          title: book.title,
          price: Number(book.price || 0),
          image: book.thumbnail,
          author: book.author,
          qty: safeQty,
        });
      }
      localStorage.setItem('bookCart', JSON.stringify(cart));
      navigate('/checkout', {
        state: {
          item: {
            type: 'book_cart',
            title: 'Book cart',
            items: cart,
            price: cart.reduce((sum, it) => sum + Number(it?.price || 0) * Math.max(1, Number(it?.qty || 1)), 0),
            image: cart[0]?.image,
          },
          returnPath: '/store',
        },
      });
    } catch {
      // ignore
    }
  };

  const requestHardcopy = () => {
    if (!book) return;
    const message = `New Hardcopy Request:\n\nBook: ${book.title}\nQty: ${safeQty}\nPrice: GHS${book.price}\n\nPlease contact me to complete delivery.`;
    const whatsappUrl = `https://wa.me/233542343069?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100/80">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-5 sm:px-6 lg:px-8">
          <Link
            to="/store"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <FiArrowLeft className="h-4 w-4" aria-hidden />
            Back to marketplace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8 lg:pb-28 lg:pt-12">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-rose-500" />
              <p className="text-sm font-medium">Loading book…</p>
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
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            {/* Left: marketing-style copy */}
            <div className="order-2 min-w-0 lg:order-1">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">About this book</p>
              <h1 className="mt-3 text-pretty text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.1]">
                {book.title}
              </h1>
              <p className="mt-2 text-base font-medium text-slate-500">By {book.author}</p>

              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
                {heroSubtitle(book)}
              </p>

              <p className="mt-8 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{formatGhs(book.price)}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">Quantity</span>
                <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, Number(q || 1) - 1))}
                    className="px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
                    aria-label="Decrease quantity"
                  >
                    <FiMinus className="h-4 w-4" />
                  </button>
                  <input
                    value={safeQty}
                    onChange={(e) => setQty(e.target.value)}
                    inputMode="numeric"
                    className="w-14 border-x border-slate-200 bg-white py-2.5 text-center text-sm font-semibold text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(99, Number(q || 1) + 1))}
                    className="px-3 py-2.5 text-slate-600 transition hover:bg-slate-50"
                    aria-label="Increase quantity"
                  >
                    <FiPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                {book.type === 'ebook' ? (
                  <button
                    type="button"
                    onClick={addEbookToCart}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-[#E04E52] sm:w-auto sm:min-w-[200px]"
                  >
                    <FiShoppingCart className="h-5 w-5" aria-hidden />
                    Get ebook
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={requestHardcopy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-[#E04E52] sm:w-auto sm:min-w-[220px]"
                  >
                    <FiPackage className="h-5 w-5" aria-hidden />
                    Request hardcopy
                  </button>
                )}
                <p className="text-sm text-slate-400">Checkout required</p>
              </div>
            </div>

            {/* Right: cover only — no dark frame (artwork fills the visual) */}
            <div className="order-1 flex justify-center lg:order-2 lg:justify-end lg:pl-4">
              <figure className="relative w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[380px]">
                <div className="overflow-hidden rounded-2xl bg-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/90">
                  <img
                    src={book.thumbnail || DEFAULT_BOOK_COVER}
                    alt={book.title}
                    className="aspect-[3/4] w-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_BOOK_COVER;
                    }}
                  />
                </div>
              </figure>
            </div>
          </div>

          <BookLearnSectionMock />

          <BookTestimonialsSectionMock />

          <BookFinalCta
            book={book}
            priceLabel={formatGhs(book.price)}
            onGetEbook={addEbookToCart}
            onRequestHardcopy={requestHardcopy}
          />
          </>
        )}
      </div>
    </div>
  );
}

export default BookDetails;
