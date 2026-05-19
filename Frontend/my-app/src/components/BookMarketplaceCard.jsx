import { Link } from 'react-router-dom';
import { FiShoppingCart, FiPackage, FiMinus, FiPlus, FiCheck } from 'react-icons/fi';
import { formatGhs } from '../utils/formatGhs';

const DEFAULT_COVER = '/images/bk-1.jpg';

/**
 * Compact marketplace card — horizontal layout, price and actions grouped (no wide gap).
 */
export default function BookMarketplaceCard({
  book,
  cartQuantity = 0,
  justAdded = false,
  onAddToCart,
  onUpdateQuantity,
  onHardcopyRequest,
}) {
  const isEbook = book.type === 'ebook';
  const inCart = cartQuantity > 0;
  const outOfStock = book.type === 'hardcopy' && Number(book.stock) < 1;
  const detailPath = `/store/${book._id}`;

  return (
    <article className="group/card mx-auto w-full max-w-[22rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-slate-300 hover:shadow-md">
      <div className="flex gap-4 p-3.5 sm:gap-4 sm:p-4">
        <Link
          to={detailPath}
          className="relative block h-[9.5rem] w-[7.5rem] shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:h-[11rem] sm:w-[8.5rem]"
          aria-label={`View ${book.title}`}
        >
          <img
            src={book.thumbnail || DEFAULT_COVER}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover/card:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_COVER;
            }}
          />
          <span
            className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isEbook ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isEbook ? 'E-book' : 'Print'}
          </span>
          {inCart ? (
            <span className="absolute bottom-1.5 left-1.5 right-1.5 rounded-md bg-white/95 py-0.5 text-center text-[10px] font-bold text-emerald-700 shadow">
              In cart · {cartQuantity}
            </span>
          ) : null}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <Link
              to={detailPath}
              className="min-w-0 text-inherit no-underline hover:text-[#0c2340] focus:outline-none focus-visible:underline"
            >
              <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#0c2340] sm:text-base">
                {book.title}
              </h3>
              {book.author ? (
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">{book.author}</p>
              ) : null}
            </Link>

            {outOfStock ? (
              <p className="mt-1.5 text-xs font-semibold text-rose-600">Out of stock</p>
            ) : null}
          </div>

          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="shrink-0 text-lg font-black text-[#0c2340]">{formatGhs(book.price)}</p>

              {isEbook ? (
                inCart ? (
                  <div
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50"
                    role="group"
                    aria-label={`Quantity for ${book.title}`}
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(book._id, -1)}
                      className="rounded-l-lg p-1.5 text-slate-600 hover:bg-white"
                      aria-label="Decrease quantity"
                    >
                      <FiMinus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="min-w-[1.75rem] text-center text-sm font-bold text-[#0c2340]">
                      {cartQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(book._id, 1)}
                      disabled={cartQuantity >= 99}
                      className="rounded-r-lg p-1.5 text-slate-600 hover:bg-white disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <FiPlus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddToCart(book)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                      justAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#0c2340] text-white hover:bg-[#0a1c33]'
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <FiCheck className="h-4 w-4" aria-hidden />
                        Added
                      </>
                    ) : (
                      <>
                        <FiShoppingCart className="h-4 w-4" aria-hidden />
                        Add
                      </>
                    )}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onHardcopyRequest(book)}
                  disabled={outOfStock}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FiPackage className="h-4 w-4" aria-hidden />
                  Request
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <Link
                to={detailPath}
                className="font-medium text-indigo-600 hover:underline"
              >
                Details
              </Link>
              {isEbook ? (
                <button
                  type="button"
                  onClick={() => onHardcopyRequest(book)}
                  className="font-medium text-slate-500 hover:text-emerald-700"
                >
                  Hardcopy
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
