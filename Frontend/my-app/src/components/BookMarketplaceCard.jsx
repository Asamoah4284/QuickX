import { Link } from 'react-router-dom';
import { FiShoppingCart, FiPackage, FiMinus, FiPlus, FiCheck } from 'react-icons/fi';
import { formatBookListingPrice } from '../utils/bookListingPrice';

const DEFAULT_COVER = '/images/bk-1.jpg';

/**
 * Marketplace card — enhanced horizontal layout.
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
  const listingPrice = formatBookListingPrice(book);

  return (
    <article className="group/card w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <Link
          to={detailPath}
          className="relative flex h-[8.5rem] w-[6.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200/70 sm:h-[11rem] sm:w-[8.5rem]"
          aria-label={`View ${book.title}`}
        >
          <img
            src={book.thumbnail || DEFAULT_COVER}
            alt=""
            className="max-h-full max-w-full object-contain p-1.5 transition duration-300 group-hover/card:scale-[1.03]"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_COVER;
            }}
          />
          <span
            className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
              isEbook ? 'bg-[#1B5EF5]' : 'bg-emerald-600'
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

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <Link
              to={detailPath}
              className="min-w-0 text-inherit no-underline hover:text-[#1B5EF5] focus:outline-none focus-visible:underline"
            >
              <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-[#0B1F44] sm:text-base">
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

          <div className="mt-2 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="shrink-0 text-lg font-bold tracking-tight text-[#0B1F44]">
                {listingPrice}
              </p>

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
                    <span className="min-w-[1.75rem] text-center text-sm font-bold text-[#0B1F44]">
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
                        : 'bg-[#0B1F44] text-white hover:bg-[#1B5EF5]'
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
                className="font-semibold text-[#1B5EF5] hover:underline"
              >
                Details
              </Link>
              {isEbook ? (
                <button
                  type="button"
                  onClick={() => onHardcopyRequest(book)}
                  className="font-medium text-slate-500 transition hover:text-[#0B1F44]"
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
