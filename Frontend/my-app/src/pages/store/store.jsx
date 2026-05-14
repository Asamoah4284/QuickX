import React, { useMemo, useState, useEffect } from 'react';
import { FiShoppingCart, FiBook, FiArrowRight, FiX, FiPackage, FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Default book cover if image is not available
const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';

function formatGhs(value) {
  const n = Number(value || 0);
  return `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const Store = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showHardcopyModal, setShowHardcopyModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [hardcopyRequest, setHardcopyRequest] = useState({
    name: '',
    location: ''
  });
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justAddedId, setJustAddedId] = useState('');
  const navigate = useNavigate();

  const fallbackHeroSlides = useMemo(
    () => [
      { id: 'fb-1', url: '/images/bk-1.jpg', alt: 'Featured digital book — The Wise Scholar', tag: 'Spotlight' },
      { id: 'fb-2', url: '/images/bk-3.jpg', alt: 'Reading collection highlight', tag: 'Trending' },
      { id: 'fb-3', url: '/images/bk-5.jpg', alt: 'New in the library', tag: 'New' },
    ],
    []
  );

  /** Prefer live book covers when the API returns titles; fall back to static art. */
  const heroSlides = useMemo(() => {
    const tags = ['Spotlight', 'Trending', 'New'];
    const fromApi = books
      .filter((b) => b?.thumbnail || b?.title)
      .slice(0, 8)
      .map((b, i) => ({
        id: `book-${b._id}`,
        url: b.thumbnail || DEFAULT_BOOK_COVER,
        alt: b.title || 'Book cover',
        tag: tags[i % tags.length],
        bookId: String(b._id),
        title: b.title,
        author: b.author,
      }));
    if (fromApi.length) return fromApi;
    return fallbackHeroSlides;
  }, [books, fallbackHeroSlides]);

  const currentHero = heroSlides[currentImageIndex] ?? heroSlides[0];
  const heroBookId = currentHero?.bookId;

  // Fetch books from API
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_URL}/api/books`);
        setBooks(response.data);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load books. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // Keep cart count in sync with localStorage
  useEffect(() => {
    const readCount = () => {
      try {
        const raw = JSON.parse(localStorage.getItem('bookCart') || '[]');
        setCartCount(Array.isArray(raw) ? raw.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    readCount();
    const onStorage = (e) => {
      if (e.key === 'bookCart') readCount();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    setCurrentImageIndex((i) => Math.min(i, Math.max(0, heroSlides.length - 1)));
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [heroSlides]);

  const goHeroSlide = (dir) => {
    setCurrentImageIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return heroSlides.length - 1;
      if (next >= heroSlides.length) return 0;
      return next;
    });
  };

  const getCart = () => {
    try {
      const raw = JSON.parse(localStorage.getItem('bookCart') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  };

  const setCart = (next) => {
    localStorage.setItem('bookCart', JSON.stringify(next));
    setCartCount(next.length);
  };

  // Add e-book to cart (marketplace flow)
  const handleAddBookToCart = (book) => {
    const existing = getCart();
    if (existing.some((b) => b?.id === book._id || b?.id === String(book._id))) {
      return;
    }
    setCart([
      ...existing,
      {
        id: book._id,
        type: 'book',
        title: book.title,
        price: Number(book.price || 0),
        image: book.thumbnail,
        thumbnail: book.thumbnail,
        fileUrl: book.fileUrl,
        author: book.author,
      },
    ]);
    setJustAddedId(String(book._id));
    window.setTimeout(() => setJustAddedId(''), 1200);
  };

  const handleGoToCheckout = () => {
    const items = getCart();
    const total = items.reduce((sum, item) => sum + Number(item?.price || 0), 0);
    if (!items.length) return;
    navigate('/checkout', {
      state: {
        item: {
          type: 'book_cart',
          title: 'Book cart',
          items,
          price: total,
          image: items[0]?.image,
        },
        returnPath: '/store',
      },
    });
  };

  // Handle hardcopy request
  const handleHardcopyRequest = (book) => {
    setSelectedBook(book);
    setShowHardcopyModal(true);
  };

  // Handle hardcopy form submission
  const handleHardcopySubmit = (e) => {
    e.preventDefault();
    const message = `New Hardcopy Request:\n\nBook: ${selectedBook.title}\nPrice: GHS${selectedBook.price}\nName: ${hardcopyRequest.name}\nLocation: ${hardcopyRequest.location}`;
    const whatsappUrl = `https://wa.me/233542343069?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowHardcopyModal(false);
    setHardcopyRequest({ name: '', location: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Featured Book */}
      <div className="relative min-h-[38vh] overflow-hidden text-white sm:min-h-[42vh] lg:min-h-[min(52vh,560px)]">
        {/* Hero-style layered background (matches main hero vibe) */}
        <div className="absolute inset-0 z-0" aria-hidden>
          {/* Solid brand base (slightly darker for a calmer, premium look) */}
          <div className="absolute inset-0 bg-[#1552D6]" />

          {/* Soft light blobs (solid colors + blur, no gradients) */}
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-white/14 blur-3xl" />
          <div className="absolute -left-28 -bottom-24 h-80 w-80 rounded-full bg-indigo-950/28 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

          {/* Grain texture for a premium feel */}
          <div
            className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="grid min-w-0 grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="min-w-0 space-y-4 text-white sm:space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100 backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" aria-hidden />
                {currentHero?.tag ?? 'Featured'}
              </div>
              <h1 className="line-clamp-4 text-balance text-3xl font-bold leading-tight tracking-tight sm:line-clamp-none sm:text-4xl sm:leading-tight md:text-5xl lg:text-[2.75rem] lg:leading-[1.1]">
                {heroBookId && currentHero?.title
                  ? currentHero.title
                  : 'Discover Your Next Digital Adventure'}
              </h1>
              <p className="max-w-lg text-pretty text-sm leading-relaxed text-blue-100/95 sm:text-base md:text-lg">
                {heroBookId && currentHero?.author
                  ? `${currentHero.author} — browse the marketplace for more titles and instant checkout.`
                  : 'Explore our curated collection of digital books and expand your knowledge.'}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <a
                  href="#store-books"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-blue-900 shadow-lg shadow-blue-950/20 transition-colors duration-300 hover:bg-blue-50 sm:w-auto sm:px-6 sm:text-base"
                >
                  Browse collection
                </a>
                {heroBookId ? (
                  <Link
                    to={`/store/${heroBookId}`}
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white/95 underline-offset-4 transition-colors hover:text-blue-100 hover:underline sm:text-base"
                  >
                    <span>Open this book</span>
                    <FiArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <a
                    href="#store-books"
                    className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white/95 underline-offset-4 transition-colors hover:text-blue-100 hover:underline sm:text-base"
                  >
                    <span>Learn more</span>
                    <FiArrowRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Hero carousel — crossfade covers + arrows + dots */}
            <div className="relative min-w-0 w-full justify-self-center lg:justify-self-end">
              <div className="relative mx-auto w-full max-w-[min(100%,320px)] sm:max-w-md lg:max-w-[320px]">
                <div
                  className="relative aspect-[4/3] w-full sm:aspect-[3/4]"
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Featured books and promotions"
                >
                  {/* Soft shelf / glow behind covers */}
                  <div
                    className="pointer-events-none absolute inset-x-[8%] bottom-[6%] top-[18%] rounded-[2rem] bg-gradient-to-b from-white/20 to-transparent blur-2xl"
                    aria-hidden
                  />
                  {heroSlides.map((slide, i) => (
                    <img
                      key={slide.id}
                      src={slide.url}
                      alt={slide.alt}
                      className={`absolute inset-0 m-auto max-h-[92%] max-w-[92%] object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.35)] transition-opacity duration-700 ease-out ${
                        i === currentImageIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'
                      }`}
                      draggable={false}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_BOOK_COVER;
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => goHeroSlide(-1)}
                    className="absolute left-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-md backdrop-blur-sm transition hover:bg-white/25 sm:left-1"
                    aria-label="Previous slide"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goHeroSlide(1)}
                    className="absolute right-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-md backdrop-blur-sm transition hover:bg-white/25 sm:right-1"
                    aria-label="Next slide"
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {heroSlides.length > 1 ? (
                  <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Choose slide">
                    {heroSlides.map((slide, i) => (
                      <button
                        key={slide.id}
                        type="button"
                        role="tab"
                        aria-selected={i === currentImageIndex}
                        aria-label={`Show slide ${i + 1}`}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === currentImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/35 hover:bg-white/55'
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main id="store-books" className="max-w-6xl mx-auto scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <div>
            <div className="mb-6 sm:mb-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
                    Marketplace
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Buy digital books instantly. Hardcopy requests are handled via WhatsApp.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mobile cart button */}
                  <button
                    type="button"
                    onClick={handleGoToCheckout}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 hover:bg-slate-50 sm:hidden"
                    aria-label="View cart"
                  >
                    <span className="relative">
                      <FiShoppingCart className="h-5 w-5" />
                      {cartCount > 0 ? (
                        <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold leading-none text-white">
                          {cartCount}
                        </span>
                      ) : null}
                    </span>
                  </button>

                  {/* Desktop cart button */}
                  <button
                    type="button"
                    onClick={handleGoToCheckout}
                    className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    <FiShoppingCart className="h-4 w-4" />
                    View cart
                    {cartCount > 0 ? (
                      <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                        {cartCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">{error}</div>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Books grid */}
            {!isLoading && !error && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4 xl:gap-5">
                {books.map((book) => (
                  <div
                    key={book._id}
                    className="group/card flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300"
                  >
                    <Link
                      to={`/store/${book._id}`}
                      className="block shrink-0 text-left text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ring-offset-white"
                      aria-label={`View ${book.title}`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50 sm:aspect-[16/10] lg:aspect-[16/9]">
                        <img
                          src={book.thumbnail}
                          alt={book.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                          onError={(e) => {
                            console.error('Book image failed to load:', book.title, book.thumbnail);
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.src = DEFAULT_BOOK_COVER;
                          }}
                        />
                        <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px] ${
                              book.type === 'ebook'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {book.type === 'ebook' ? 'E-book' : 'Hardcopy'}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 sm:p-4 lg:p-4">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 transition-colors group-hover/card:text-indigo-700 sm:text-lg lg:text-lg">
                            {book.title}
                          </h3>
                          <p className="mt-1 line-clamp-1 text-[11px] text-slate-600 sm:text-sm lg:text-[13px]">
                            {book.author}
                          </p>
                        </div>
                      </div>
                    </Link>
                    <div className="mt-auto flex flex-1 flex-col justify-end px-3 pb-3 sm:px-4 sm:pb-4 lg:px-4 lg:pb-4">
                      {/* <div className="flex items-center text-amber-400 mb-3">
                        <FiStar className="fill-current" />
                        <FiStar className="fill-current" />
                        <FiStar className="fill-current" />
                        <FiStar className="fill-current" />
                        <FiStar />
                        <span className="text-gray-500 text-sm ml-2">
                          ({book.reviews?.length || 0} reviews)
                        </span>
                      </div> */}
                      <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                        <span className="text-sm font-bold text-slate-900 sm:text-base lg:text-base">
                          {formatGhs(book.price)}
                        </span>
                        <div className="flex items-center gap-2">
                          {book.type === 'ebook' ? (
                            <button
                              type="button"
                              className={`inline-flex items-center justify-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-white transition sm:px-4 sm:text-sm ${
                                justAddedId === String(book._id)
                                  ? 'bg-emerald-600'
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                              onClick={() => handleAddBookToCart(book)}
                            >
                              {justAddedId === String(book._id) ? (
                                <>
                                  <FiCheck className="h-4 w-4" />
                                  <span className="hidden sm:inline">Added</span>
                                </>
                              ) : (
                                <>
                                  <FiShoppingCart className="h-4 w-4" />
                                  <span className="hidden sm:inline">Add</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:px-4 sm:text-sm"
                              onClick={() => handleHardcopyRequest(book)}
                            >
                              <FiPackage className="h-4 w-4" />
                              <span className="hidden sm:inline">Request</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {book.type === 'hardcopy' && book.stock < 1 ? (
                        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                          Out of stock
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && books.length === 0 && (
              <div className="text-center py-12">
                <FiBook className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No books found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Check back later for new titles.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Hardcopy Request Modal */}
      {showHardcopyModal && selectedBook && (
        <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">Request hardcopy</h3>
                <p className="mt-0.5 text-sm text-slate-500">Tell us where to deliver it.</p>
              </div>
              <button 
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                onClick={() => setShowHardcopyModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={handleHardcopySubmit} className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <img 
                  src={selectedBook.thumbnail || DEFAULT_BOOK_COVER}
                  alt={selectedBook.title} 
                  className="h-20 w-16 flex-none rounded-xl border border-slate-200 object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_BOOK_COVER;
                  }}
                />
                <div>
                  <h4 className="text-base font-semibold text-slate-950">{selectedBook.title}</h4>
                  <p className="mt-0.5 text-sm text-slate-600">{selectedBook.author}</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">GHS{selectedBook.price}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-800">Your name</label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={hardcopyRequest.name}
                    onChange={(e) => setHardcopyRequest({ ...hardcopyRequest, name: e.target.value })}
                    placeholder="e.g. Asamoah Richard"
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-semibold text-slate-800">Your location</label>
                  <input
                    type="text"
                    id="location"
                    required
                    value={hardcopyRequest.location}
                    onChange={(e) => setHardcopyRequest({ ...hardcopyRequest, location: e.target.value })}
                    placeholder="e.g. Accra, East Legon"
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowHardcopyModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;

