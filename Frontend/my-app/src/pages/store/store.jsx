import React, { useMemo, useState, useEffect } from 'react';
import {
  FiShoppingCart,
  FiBook,
  FiArrowRight,
  FiX,
  FiMinus,
  FiPlus,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HardcopyRequestModal from '../../components/HardcopyRequestModal';
import BookMarketplaceCard from '../../components/BookMarketplaceCard';
import { normalizeCart, getCartSubtotal, getCartItemCount } from '../../utils/bookCart';
import { formatGhs } from '../../utils/formatGhs';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Default book cover if image is not available
const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';

/** Decorative book photos for the store hero — stacked fan layout. */
const HERO_BOOK_COVERS = [
  {
    src: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
    rotate: '-12deg',
    x: '8%',
    xMobile: '4%',
    z: 1,
  },
  {
    src: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=80',
    rotate: '-6deg',
    x: '24%',
    xMobile: '20%',
    z: 2,
  },
  {
    src: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=80',
    rotate: '0deg',
    x: '40%',
    xMobile: '36%',
    z: 5,
  },
  {
    src: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=400&q=80',
    rotate: '6deg',
    x: '56%',
    xMobile: '52%',
    z: 3,
  },
  {
    src: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=400&q=80',
    rotate: '12deg',
    x: '72%',
    xMobile: '68%',
    z: 1,
  },
];

const Store = () => {
  const [showHardcopyModal, setShowHardcopyModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justAddedId, setJustAddedId] = useState('');
  const [fanReady, setFanReady] = useState(false);
  const navigate = useNavigate();

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
    const id = window.requestAnimationFrame(() => setFanReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

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
    <div className="min-h-screen overflow-x-hidden bg-ink-850">
      {/* Hero — static copy + book image collection */}
      <div className="border-b border-line bg-ink-900 pt-20 sm:pt-24">
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-12">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div className="max-w-xl space-y-4 sm:space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-ink-850 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-400 ring-1 ring-line sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden />
                Bookstore
              </div>
              <h1 className="text-balance text-[1.85rem] font-bold leading-tight tracking-tight text-fg sm:text-4xl md:text-[2.65rem] md:leading-[1.12]">
                Discover your next digital book
              </h1>
              <p className="max-w-md text-pretty text-sm leading-relaxed text-fg-subtle sm:text-base">
                Browse the marketplace for more titles and instant checkout—ebooks you can open right
                away, plus hardcopy requests when you need print.
              </p>
              <div className="pt-1">
                <a
                  href="#store-books"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 sm:w-auto sm:py-3"
                >
                  Browse collection
                  <FiArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[22rem] overflow-hidden sm:max-w-md lg:max-w-none">
              <div
                className={`store-book-fan relative mx-auto h-[220px] w-full sm:h-[300px] lg:h-[340px] ${
                  fanReady ? 'store-book-fan--ready' : ''
                }`}
                aria-hidden
              >
                <style>{`
                  @keyframes storeBookFanIn {
                    from {
                      opacity: 0;
                      transform: translateY(20px) rotate(var(--book-r)) scale(0.96);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0) rotate(var(--book-r)) scale(1);
                    }
                  }
                  .store-book-fan__card {
                    left: var(--book-x-mobile);
                    opacity: 0;
                    transform: translateY(20px) rotate(var(--book-r)) scale(0.96);
                    pointer-events: none;
                  }
                  .store-book-fan--ready .store-book-fan__card {
                    animation: storeBookFanIn 1.05s cubic-bezier(0.22, 1, 0.36, 1) both;
                    animation-delay: var(--book-delay);
                  }
                  @media (min-width: 640px) {
                    .store-book-fan__card {
                      left: var(--book-x);
                    }
                  }
                `}</style>
                {HERO_BOOK_COVERS.map((cover, i) => (
                  <div
                    key={cover.src}
                    className="store-book-fan__card absolute top-[18%] w-[30%] max-w-[108px] overflow-hidden rounded-lg bg-ink-850 shadow-[0_10px_24px_rgba(15,23,42,0.14)] ring-1 ring-line sm:top-[20%] sm:w-[34%] sm:max-w-[168px]"
                    style={{
                      zIndex: cover.z,
                      '--book-x': cover.x,
                      '--book-x-mobile': cover.xMobile,
                      '--book-r': cover.rotate,
                      '--book-delay': `${80 + i * 110}ms`,
                    }}
                  >
                    <div className="aspect-[3/4]">
                      <img
                        src={cover.src}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marketplace */}
      <main id="store-books" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-start justify-between gap-3 sm:mb-8 sm:items-end sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl md:text-3xl">
              Marketplace
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-subtle">
              Buy digital books instantly. Hardcopy requests are handled via WhatsApp.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCart}
              className="inline-flex items-center justify-center rounded-xl border border-line bg-ink-850 p-2.5 text-fg transition hover:border-line hover:bg-ink-900 sm:hidden"
              aria-label="View cart"
            >
                    <span className="relative">
                      <FiShoppingCart className="h-5 w-5" />
                      {cartCount > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-none text-white">
                          {cartCount}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCart}
              className="hidden items-center gap-2 rounded-xl border border-line bg-ink-850 px-4 py-2 text-sm font-semibold text-fg transition hover:border-line hover:bg-ink-900 sm:inline-flex"
                  >
                    <FiShoppingCart className="h-4 w-4" />
                    View cart
                    {cartCount > 0 ? (
                <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-bold text-white">
                        {cartCount}
                      </span>
                    ) : null}
                  </button>
              </div>
            </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
        ) : null}

        {error ? (
          <div className="py-12 text-center">
            <p className="mb-3 text-sm font-medium text-down">{error}</p>
                <button 
              type="button"
                  onClick={() => window.location.reload()}
              className="text-sm font-semibold text-brand-400 hover:underline"
                >
                  Try again
                </button>
              </div>
        ) : null}

        {!isLoading && !error && books.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-5">
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
        ) : null}

        {!isLoading && !error && books.length === 0 ? (
          <div className="py-12 text-center">
            <FiBook className="mx-auto h-12 w-12 text-fg-muted" />
            <h3 className="mt-2 text-sm font-medium text-fg">No books found</h3>
            <p className="mt-1 text-sm text-fg-subtle">Check back later for new titles.</p>
          </div>
        ) : null}
      </main>

      {/* Cart modal */}
      {showCartModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-cart-title"
          onClick={() => setShowCartModal(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-ink-850 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 id="store-cart-title" className="text-lg font-semibold text-fg">
                  Your cart
                </h3>
                <p className="text-sm text-fg-subtle">
                  {cartCount === 0 ? 'No books yet' : `${cartCount} item${cartCount === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCartModal(false)}
                className="rounded-lg p-2 text-fg-subtle hover:bg-ink-900 hover:text-fg-muted"
                aria-label="Close cart"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <ul className="max-h-[min(50vh,320px)] divide-y divide-line overflow-y-auto px-5">
              {getCart().length === 0 ? (
                <li className="py-8 text-center text-sm text-fg-subtle">
                  Add e-books from the marketplace, then checkout here.
                </li>
              ) : (
                getCart().map((item) => (
                  <li key={String(item.id)} className="flex gap-3 py-4">
                    <img
                      src={item.image || item.thumbnail || DEFAULT_BOOK_COVER}
                      alt=""
                      className="h-16 w-14 shrink-0 rounded-lg border border-line bg-ink-900 object-contain p-0.5"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_BOOK_COVER;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-fg">{item.title}</p>
                      {item.author ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-fg-subtle">{item.author}</p>
                      ) : null}
                      <p className="mt-1 text-sm font-bold text-fg">
                        {formatGhs(item.price)}
                        {(item.quantity || 1) > 1 ? (
                          <span className="ml-1 text-xs font-medium text-fg-subtle">
                            × {item.quantity} = {formatGhs(Number(item.price || 0) * (item.quantity || 1))}
                          </span>
                        ) : null}
                      </p>
                      <div
                        className="mt-2 inline-flex items-center rounded-lg border border-line bg-ink-900"
                        role="group"
                        aria-label={`Quantity for ${item.title}`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.id, -1)}
                          className="rounded-l-lg p-2 text-fg-muted transition hover:bg-ink-800"
                          aria-label="Decrease quantity"
                        >
                          <FiMinus className="h-4 w-4" aria-hidden />
                        </button>
                        <span className="min-w-[2rem] px-2 text-center text-sm font-semibold text-fg">
                          {item.quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.id, 1)}
                          disabled={(item.quantity || 1) >= 99}
                          className="rounded-r-lg p-2 text-fg-muted transition hover:bg-ink-800 disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          <FiPlus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBookFromCart(item.id)}
                      className="shrink-0 self-start rounded-lg border border-down/30 px-2.5 py-1.5 text-xs font-semibold text-down hover:bg-down/10"
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="border-t border-line px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-fg-muted">Subtotal</span>
                <span className="font-bold text-fg">
                  {formatGhs(getCartSubtotal(getCart()))}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGoToCheckout}
                disabled={cartCount === 0}
                className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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

