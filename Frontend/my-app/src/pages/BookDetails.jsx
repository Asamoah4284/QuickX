import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiCheck, FiShoppingCart, FiPackage, FiStar, FiZap } from 'react-icons/fi';
import { formatGhs } from '../utils/formatGhs';
import { useMetaPixelBookPage } from '../hooks/useMetaPixelBookPage';
import MetaPixelNoscript from '../components/MetaPixelNoscript';
import BookOfferPicker from '../components/BookOfferPicker';
import HardcopyRequestModal from '../components/HardcopyRequestModal';
import { isMetaPixelEnabledForBook, trackMetaInitiateCheckout } from '../utils/metaPixel';

const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';
const API_FALLBACK = 'http://localhost:5000';

const MOCK_BOOK_TESTIMONIALS = [
  {
    tagline: 'The Beginner Who Almost Quit',
    quote:
      "I lost GH?8000 in my first two months of trading. I was following signals, copying people, doing everything wrong. I almost gave up completely. A friend sent me the Quick X Trading Course and honestly I was sceptical ? I had wasted money before. But within the first few chapters I realised something. I wasn't stupid. I was just untaught. Maxwell breaks everything down in a way that finally made sense to me. I understand charts now. I understand why I was losing. I haven't blown an account since. This book didn't just teach me forex ? it gave me my confidence back.",
    name: 'Kwame A.',
    role: 'Kumasi',
  },
  {
    tagline: 'The Signal Buyer Who Found His Own Edge',
    quote:
      "I used to pay GH?150 every month for signals. Sometimes they worked. Most times they didn't. And even when they did, I didn't understand why ? so I couldn't learn from it. Course 2 changed everything. The Triple X Strategy is real. It's not a gimmick. It's a structured way of reading the market that I now use every single week. I stopped paying for signals the day I finished this course. The money I used to spend on signals every month now goes into my trading account. Best investment I have made in a long time.",
    name: 'Fiifi M.',
    role: 'Accra',
  },
  {
    tagline: 'The Father Trading for His Family',
    quote:
      "I am a father of three. I don't have money to waste. When I saw this course I sat with it for two weeks before buying because I needed to be sure. I bought Course 1 first. I read it slowly, took notes, went back and re-read chapters. Three months later I bought Course 2. I am not a millionaire. But I am consistently profitable now ? small and steady. My wife has seen the difference. I trade with a plan, I manage my risk, and I sleep at night knowing I didn't gamble. Maxwell wrote this for real people with real responsibilities. I felt that in every page.",
    name: 'Emmanuel D.',
    role: 'Takoradi',
  },
  {
    tagline: 'The Young Person Who Stopped Looking for Shortcuts',
    quote:
      "I am 22. Everyone my age is looking for the fast way ? signals, tips, copy trading. I was the same. After reading Quick X Course 1 I realised I was approaching forex like a gambler, not a trader. The section on risk management alone was worth everything. I now know how much to risk per trade, how to set my stop loss properly, and how to walk away when the setup isn't there. I feel like an adult in the market for the first time. If you are young and serious about building something real ? this is where you start. Not with signals. Here.",
    name: 'Abena S.',
    role: 'Tema',
  },
  {
    tagline: 'The Person Who Tried Everything Else First',
    quote:
      "YouTube videos. Free PDFs. Telegram groups. I tried all of it for over a year and I was still confused. What made this course different is that it is written by someone who understands where we are coming from. Maxwell doesn't talk down to you. He doesn't make you feel like forex is for special people. He makes you feel like ? with the right knowledge ? this is possible for you. And he's right. I bought the bundle and went through both courses back to back. It took me five weeks. By week six I placed my first trade with a real strategy and real confidence. Not hope. Confidence. That difference is everything.",
    name: 'Nana K.',
    role: 'Accra',
  },
];

function BookLearnSection({ whatYoullLearn = [], afterReadingOutcomes = [] }) {
  const learnItems = Array.isArray(whatYoullLearn) ? whatYoullLearn.filter(Boolean) : [];
  const outcomeItems = Array.isArray(afterReadingOutcomes) ? afterReadingOutcomes.filter(Boolean) : [];

  if (learnItems.length === 0 && outcomeItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-20 border-t border-slate-100 pt-16 sm:mt-24 sm:pt-20 lg:mt-28 lg:pt-24" aria-labelledby="what-youll-learn-heading">
      <h2 id="what-youll-learn-heading" className="text-center text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
        What you&apos;ll learn
      </h2>

      <div className="mt-12 grid items-start gap-12 lg:mt-16 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        {/* Stacked ?pages? preview (decorative) */}
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
            <p className="text-center text-lg font-bold uppercase tracking-[0.12em] text-[#c4122e] sm:text-xl">
              After reading
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

        <div className="min-w-0 space-y-10 lg:space-y-12">
          {learnItems.length > 0 ? (
          <div>
            <h3 className="text-lg font-black text-slate-950 sm:text-xl">What you&apos;ll learn</h3>
            <ul className="mt-5 space-y-3.5 sm:space-y-4">
              {learnItems.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-800 sm:text-base">
                  <FiCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-900" strokeWidth={2.5} aria-hidden />
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
  return name
    .replace(/\./g, '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StarRating() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, i) => (
        <FiStar key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
      ))}
    </div>
  );
}

function BookTestimonialsSectionMock() {
  return (
    <section
      className="mt-12 rounded-3xl bg-slate-50/80 px-4 py-14 sm:mt-16 sm:px-8 sm:py-16 lg:mt-20 lg:py-20"
      aria-labelledby="book-testimonials-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reader reviews</p>
        <h2
          id="book-testimonials-heading"
          className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl"
        >
          What readers say
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
          Real stories from Ghanaian traders who started where you are now.
        </p>
      </div>

      <ul className="mx-auto mt-10 grid max-w-7xl gap-8 md:grid-cols-2 lg:mt-12">
        {MOCK_BOOK_TESTIMONIALS.map((t, index) => (
          <li
            key={t.tagline}
            className={`flex flex-col rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04] transition hover:shadow-[0_16px_40px_-14px_rgba(15,23,42,0.18)] sm:p-8 ${
              index === MOCK_BOOK_TESTIMONIALS.length - 1 && MOCK_BOOK_TESTIMONIALS.length % 2 === 1
                ? 'md:col-span-2 md:mx-auto md:max-w-3xl'
                : ''
            }`}
          >
            <StarRating />
            {t.tagline ? (
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#0c2340]/70">
                {t.tagline}
              </p>
            ) : null}
            <blockquote className="relative mt-4 flex-1">
              <span
                className="pointer-events-none absolute -left-1 -top-3 font-serif text-5xl leading-none text-slate-200"
                aria-hidden
              >
                &ldquo;
              </span>
              <p className="relative text-[15px] leading-[1.7] text-slate-700 sm:text-base sm:leading-[1.75]">
                {t.quote}
              </p>
            </blockquote>
            <footer className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-600 text-sm font-semibold text-white"
                aria-hidden
              >
                {readerInitials(t.name)}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="text-sm text-slate-500">{t.role}</p>
              </div>
            </footer>
          </li>
        ))}
      </ul>
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

/**
 * Reader reviews only on the FOREX TRADING storefront book (single id).
 * Override with VITE_TESTIMONIAL_BOOK_ID in .env if the id changes.
 */
const TESTIMONIAL_BOOK_ID =
  import.meta.env.VITE_TESTIMONIAL_BOOK_ID?.trim() || '6a06f1085ae8b7541db685e2';

function isTestimonialBook(book, routeBookId) {
  if (!book || !TESTIMONIAL_BOOK_ID) return false;
  const ids = [routeBookId, book._id, book.id].filter(Boolean).map(String);
  return ids.includes(TESTIMONIAL_BOOK_ID);
}

function BookDetails() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || API_FALLBACK;

  const [book, setBook] = useState(null);
  const [offerGroup, setOfferGroup] = useState(null);
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
  }, [API_URL, bookId]);

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

  const showTestimonials = useMemo(
    () => isTestimonialBook(book, bookId),
    [book, bookId]
  );

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

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <MetaPixelNoscript />
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
            <div className="order-1 flex min-w-0 flex-col gap-8 lg:order-1 lg:max-w-xl">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  About this book
                </p>
                <div className="space-y-2">
                  <h1 className="text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.5rem]">
                    {book.title}
                  </h1>
                  <p className="text-base font-medium text-slate-500">By {book.author}</p>
                </div>
                <p className="text-pretty text-base leading-relaxed text-slate-600 line-clamp-5 sm:text-[1.05rem]">
                  {heroDescription(book)}
                </p>
              </div>

              {heroOutcomePoints.length > 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-5 sm:px-6">
                  <p className="text-sm font-bold text-slate-900 sm:text-base">You will be able to</p>
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
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={addEbookToCart}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-[#E04E52] sm:w-auto sm:min-w-[240px]"
                  >
                    <FiShoppingCart className="h-5 w-5 shrink-0" aria-hidden />
                    Buy now ? instant download
                  </button>
                  <p className="text-sm text-slate-500">
                    No account needed ? Pay with Mobile Money ? Download right after payment
                  </p>
                  <button
                    type="button"
                    onClick={openHardcopyModal}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 sm:w-auto"
                  >
                    <FiPackage className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                    Prefer printed? Request hardcopy
                  </button>
                </div>
              ) : book.type === 'ebook' && offerGroup?.options?.length && bundleOfferOption ? (
                <div className="w-full max-w-md space-y-2">
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
                  <p className="text-sm text-slate-500">
                    Secure ? MoMo ? Instant PDF ? Compare all plans below
                  </p>
                  <button
                    type="button"
                    onClick={openHardcopyModal}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <FiPackage className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                    Prefer printed? Request hardcopy after payment
                  </button>
                </div>
              ) : book.type === 'ebook' && offerGroup?.options?.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">
                    Choose a plan below. No account needed ? MoMo checkout.
                  </p>
                  <button
                    type="button"
                    onClick={openHardcopyModal}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 sm:w-auto"
                  >
                    <FiPackage className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
                    Prefer printed? Request hardcopy
                  </button>
                </div>
              ) : book.type !== 'ebook' ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={openHardcopyModal}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-[#E04E52] sm:w-auto sm:min-w-[220px]"
                  >
                    <FiPackage className="h-5 w-5 shrink-0" aria-hidden />
                    Request hardcopy
                  </button>
                  <p className="text-sm text-slate-500">
                    Fill in your details ? we&apos;ll confirm delivery on WhatsApp.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Right: cover */}
            <div className="order-2 flex justify-center lg:order-2 lg:justify-end lg:pl-4">
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

          {offerGroup?.options?.length ? (
            <BookOfferPicker
              offerGroup={offerGroup}
              apiUrl={API_URL}
              onSelectOption={selectOfferOption}
            />
          ) : null}

          {showTestimonials ? <BookTestimonialsSectionMock /> : null}

          <BookLearnSection
            whatYoullLearn={book.whatYoullLearn}
            afterReadingOutcomes={book.afterReadingOutcomes}
          />

          <HardcopyRequestModal
            book={book}
            open={showHardcopyModal}
            onClose={() => setShowHardcopyModal(false)}
          />
          </>
        )}
      </div>
    </div>
  );
}

export default BookDetails;
