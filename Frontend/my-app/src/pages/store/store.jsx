import React, { useMemo, useState, useEffect } from 'react';
import {
  FiShoppingCart,
  FiBook,
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiMinus,
  FiPlus,
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import HardcopyRequestModal from '../../components/HardcopyRequestModal';
import BookMarketplaceCard from '../../components/BookMarketplaceCard';
import { normalizeCart, getCartSubtotal, getCartItemCount } from '../../utils/bookCart';
import { formatGhs } from '../../utils/formatGhs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Default book cover if image is not available
const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';

const Store = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showHardcopyModal, setShowHardcopyModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justAddedId, setJustAddedId] = useState('');
  const navigate = useNavigate();

  const fallbackHeroSlides = useMemo(
    () => [
      { id: 'fb-1', url: '/images/bk-1.jpg', alt: 'Featured digital book â€” The Wise Scholar', tag: 'Spotlight' },
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
      return normalizeCart(Array.isArray(raw) ? raw : []);
    } catch {
      return [];
    }
  };

  const setCart = (next) => {
    const normalized = normalizeCart(next);
    localStorage.setItem('bookCart', JSON.stringify(normalized));
    setCartItems(normalized);
    setCartCount(getCartItemCount(normalized));
  };

  const syncCartState = () => {
    const items = getCart();
    setCartItems(items);
    setCartCount(getCartItemCount(items));
    return items;
  };

  const cartQuantityById = useMemo(() => {
    const map = new Map();
    for (const item of cartItems) {
      map.set(String(item.id), item.quantity || 1);
    }
    return map;
  }, [cartItems]);

  useEffect(() => {
    syncCartState();
    const onStorage = (e) => {
      if (e.key === 'bookCart') syncCartState();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Add e-book to cart (marketplace flow)
  const handleAddBookToCart = (book) => {
    const existing = getCart();
    const id = String(book._id);
    const index = existing.findIndex((b) => String(b?.id) === id);
    if (index >= 0) {
      const next = [...existing];
      next[index] = {
        ...next[index],
        quantity: Math.min(99, (next[index].quantity || 1) + 1),
      };
      setCart(next);
    } else {
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
          quantity: 1,
        },
      ]);
    }
    setJustAddedId(id);
    window.setTimeout(() => setJustAddedId(''), 1200);
  };

  const handleUpdateCartQuantity = (bookId, delta) => {
    const id = String(bookId);
    const existing = getCart();
    const index = existing.findIndex((item) => String(item?.id) === id);
    if (index < 0) return;

    const current = existing[index].quantity || 1;
    const nextQty = current + delta;
    if (nextQty < 1) {
      handleRemoveBookFromCart(bookId);
      return;
    }

    const next = [...existing];
    next[index] = { ...next[index], quantity: Math.min(99, nextQty) };
    setCart(next);
  };

  const handleRemoveBookFromCart = (bookId) => {
    const id = String(bookId);
    setCart(getCart().filter((item) => String(item?.id) !== id));
    if (justAddedId === id) setJustAddedId('');
  };

  const handleOpenCart = () => {
    syncCartState();
    setShowCartModal(true);
  };

  const handleGoToCheckout = () => {
    const items = getCart();
    const total = getCartSubtotal(items);
    if (!items.length) return;
    setShowCartModal(false);
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
                  ? `${currentHero.author} â€” browse the marketplace for more titles and instant checkout.`
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

            {/* Hero carousel â€” crossfade covers + arrows + dots */}
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
      <main id="store-books" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
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
                    onClick={handleOpenCart}
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
                    onClick={handleOpenCart}
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
              <div className="grid grid-cols-1 gap-4 justify-items-center sm:grid-cols-2 sm:justify-items-stretch sm:gap-5 lg:grid-cols-3 lg:gap-5">
                {books.map((book) => (
                  <BookMarketplaceCard
                    key={book._id}
                    book={book}
                    cartQuantity={cartQuantityById.get(String(book._id)) || 0}
                    justAdded={justAddedId === String(book._id)}
                    onAddToCart={handleAddBookToCart}
                    onUpdateQuantity={handleUpdateCartQuantity}
                    onHardcopyRequest={handleHardcopyRequest}
                  />
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

      {/* Cart modal */}
      {showCartModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-cart-title"
          onClick={() => setShowCartModal(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 id="store-cart-title" className="text-lg font-semibold text-slate-950">
                  Your cart
                </h3>
                <p className="text-sm text-slate-500">
                  {cartCount === 0 ? 'No books yet' : `${cartCount} item${cartCount === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCartModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                aria-label="Close cart"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <ul className="max-h-[min(50vh,320px)] divide-y divide-slate-100 overflow-y-auto px-5">
              {getCart().length === 0 ? (
                <li className="py-8 text-center text-sm text-slate-500">
                  Add e-books from the marketplace, then checkout here.
                </li>
              ) : (
                getCart().map((item) => (
                  <li key={String(item.id)} className="flex gap-3 py-4">
                    <img
                      src={item.image || item.thumbnail || DEFAULT_BOOK_COVER}
                      alt=""
                      className="h-16 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_BOOK_COVER;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</p>
                      {item.author ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.author}</p>
                      ) : null}
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatGhs(item.price)}
                        {(item.quantity || 1) > 1 ? (
                          <span className="ml-1 text-xs font-medium text-slate-500">
                            × {item.quantity} = {formatGhs(Number(item.price || 0) * (item.quantity || 1))}
                          </span>
                        ) : null}
                      </p>
                      <div
                        className="mt-2 inline-flex items-center rounded-lg border border-slate-200 bg-slate-50"
                        role="group"
                        aria-label={`Quantity for ${item.title}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.id, -1)}
                          className="rounded-l-lg p-2 text-slate-600 transition hover:bg-slate-100"
                          aria-label="Decrease quantity"
                        >
                          <FiMinus className="h-4 w-4" aria-hidden />
                        </button>
                        <span className="min-w-[2rem] px-2 text-center text-sm font-semibold text-slate-900">
                          {item.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.id, 1)}
                          disabled={(item.quantity || 1) >= 99}
                          className="rounded-r-lg p-2 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <FiPlus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBookFromCart(item.id)}
                      className="shrink-0 self-start rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="border-t border-slate-200 px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-bold text-slate-900">
                  {formatGhs(getCartSubtotal(getCart()))}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGoToCheckout}
                disabled={cartCount === 0}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Go to checkout
              </button>
            </div>
          </div>
        </div>
      ) : null}


      <HardcopyRequestModal
        book={selectedBook}
        open={showHardcopyModal && Boolean(selectedBook)}
        onClose={() => setShowHardcopyModal(false)}
      />
    </div>
  );
};

export default Store;

