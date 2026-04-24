import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiMinus, FiPlus, FiShoppingCart, FiPackage } from 'react-icons/fi';

function BookDetails() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

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
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back
        </button>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
            Loading book…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : !book ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
            Book not found.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="aspect-[3/4] w-full bg-gray-100">
                <img
                  src={book.thumbnail}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
              <p className="mt-1 text-sm text-gray-600">{book.author}</p>
              <p className="mt-4 text-2xl font-bold text-indigo-600">GHS{book.price}</p>

              <div className="mt-6 flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">Quantity</span>
                <div className="inline-flex items-center overflow-hidden rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, Number(q || 1) - 1))}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-50"
                    aria-label="Decrease quantity"
                  >
                    <FiMinus />
                  </button>
                  <input
                    value={safeQty}
                    onChange={(e) => setQty(e.target.value)}
                    inputMode="numeric"
                    className="w-14 border-x border-gray-200 py-2 text-center text-sm font-semibold text-gray-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(99, Number(q || 1) + 1))}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-50"
                    aria-label="Increase quantity"
                  >
                    <FiPlus />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {book.type === 'ebook' ? (
                  <button
                    type="button"
                    onClick={addEbookToCart}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <FiShoppingCart />
                    Add to cart
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={requestHardcopy}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    <FiPackage />
                    Request hardcopy
                  </button>
                )}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-6">
                <h2 className="text-sm font-semibold text-gray-900">Description</h2>
                <p className="mt-2 text-sm leading-6 text-gray-700">{book.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookDetails; 