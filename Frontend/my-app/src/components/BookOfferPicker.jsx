import { FiCheck, FiShoppingBag } from 'react-icons/fi';
import { publicAssetUrl } from '../utils/publicAssetUrl';

function resolveThumb(raw, apiUrl) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (s.startsWith('http')) return publicAssetUrl(s);
  if (apiUrl && s.startsWith('/')) return publicAssetUrl(`${apiUrl}${s}`);
  return publicAssetUrl(s);
}

function formatCompareLine(option) {
  if (!option.compareAtPrice || option.compareAtPrice <= option.price) return null;
  if (option.type === 'bundle' && option.books?.length > 1) {
    const parts = option.books.map((b) => `GH₵${Number(b.price || 0)}`);
    return `${parts.join(' + ')} = GH₵${Number(option.compareAtPrice)}`;
  }
  return `GH₵${Number(option.compareAtPrice)}`;
}

/** Build unique cover images: plan upload first, then each book in the plan. */
function getPlanCovers(option, apiUrl) {
  const seen = new Set();
  const covers = [];

  const add = (raw, title) => {
    const src = resolveThumb(raw, apiUrl);
    if (!src || seen.has(src)) return;
    seen.add(src);
    covers.push({ src, title: title || '' });
  };

  add(option.thumbnail, option.cardTitle);
  for (const book of option.books || []) {
    add(book.thumbnail, book.title);
  }

  return covers;
}

function PlanCoverVisual({ covers }) {
  if (!covers.length) {
    return (
      <div className="mt-5 flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 ring-1 ring-slate-200/90">
        <FiShoppingBag className="h-14 w-14 text-slate-300" aria-hidden />
      </div>
    );
  }

  if (covers.length === 1) {
    const { src, title } = covers[0];
    return (
      <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-white p-3 ring-1 ring-slate-200/90 sm:p-4">
        <img
          src={src}
          alt={title ? `Cover: ${title}` : 'Book cover'}
          className="mx-auto h-auto max-h-52 w-full object-contain object-center sm:max-h-60 lg:max-h-64"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={`mt-5 grid gap-2.5 sm:gap-3 ${
        covers.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
      }`}
    >
      {covers.map((cover) => (
        <div
          key={cover.src}
          className="overflow-hidden rounded-xl bg-gradient-to-b from-slate-100 to-white p-2 ring-1 ring-slate-200/90"
        >
          <img
            src={cover.src}
            alt={cover.title ? `Cover: ${cover.title}` : 'Book cover'}
            className="mx-auto aspect-[2/3] h-full w-full max-h-44 object-contain object-center sm:max-h-48"
            loading="lazy"
            decoding="async"
          />
          {cover.title ? (
            <p className="mt-1.5 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-slate-600 sm:text-xs">
              {cover.title}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Three-column plan picker (singles + bundle) on a light surface matching BookDetails.
 */
export default function BookOfferPicker({ offerGroup, apiUrl, onSelectOption }) {
  if (!offerGroup?.options?.length) return null;

  return (
    <section
      className="mt-16 border-t border-slate-100 pt-14 sm:pt-16 lg:mt-20 lg:pt-20"
      aria-labelledby="book-offer-picker-heading"
    >
      <div className="mx-auto max-w-6xl text-center">
        <h2
          id="book-offer-picker-heading"
          className="text-xl font-black uppercase tracking-wide text-slate-950 sm:text-2xl lg:text-3xl"
        >
          {offerGroup.heading || 'PICK YOUR PLAN & START TODAY'}
        </h2>
        {offerGroup.subheading ? (
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            {offerGroup.subheading}
          </p>
        ) : null}
      </div>

      <div
        className={`mx-auto mt-10 grid max-w-6xl gap-6 sm:gap-7 ${
          offerGroup.options.length === 1
            ? 'max-w-md'
            : offerGroup.options.length === 2
              ? 'sm:grid-cols-2'
              : 'lg:grid-cols-3'
        }`}
      >
        {offerGroup.options.map((option) => {
          const covers = getPlanCovers(option, apiUrl);
          const compareLine = formatCompareLine(option);
          const highlighted = option.highlighted;

          return (
            <article
              key={option.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-5 sm:p-6 ${
                highlighted ? 'border-amber-400/90 lg:scale-[1.02]' : 'border-slate-200/80'
              }`}
            >
              {option.badge ? (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-900 sm:text-xs">
                  {option.badge}
                </div>
              ) : null}

              {option.label ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 sm:text-xs">
                  {option.label}
                </p>
              ) : null}

              {option.headline ? (
                <h3 className="mt-2 text-lg font-black uppercase leading-tight text-slate-950 sm:text-xl">
                  {option.headline}
                </h3>
              ) : null}

              <PlanCoverVisual covers={covers} />

              {option.cardTitle ? (
                <p className="mt-3 text-center text-sm font-semibold text-slate-800 sm:text-base">
                  {option.cardTitle}
                </p>
              ) : null}

              {compareLine ? (
                <p className="mt-4 text-center text-xs text-slate-400 line-through">{compareLine}</p>
              ) : null}

              <p className="mt-2 text-center text-3xl font-black text-amber-600 sm:text-4xl">
                GH₵{Number(option.price || 0)}
              </p>
              <p className="mt-1 text-center text-xs text-slate-500">
                One-time · Instant PDF delivery
                {option.type === 'bundle' ? ' · All books included' : ''}
              </p>

              {option.footnote ? (
                <p className="mt-2 text-center text-xs font-medium text-rose-600">{option.footnote}</p>
              ) : null}

              <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-100 pt-5">
                {(option.features || []).slice(0, 6).map((feature) => (
                  <li key={feature} className="flex gap-2 text-xs leading-snug text-slate-700 sm:text-sm">
                    <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => onSelectOption(option)}
                className={`mt-6 w-full rounded-xl py-3.5 text-sm font-bold transition ${
                  highlighted
                    ? 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {option.type === 'bundle' ? 'Get bundle' : 'Get this book'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
