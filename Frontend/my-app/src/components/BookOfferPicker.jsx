import { FiCheck, FiLock, FiStar } from 'react-icons/fi';

function formatCompareLine(option) {
  if (!option.compareAtPrice || option.compareAtPrice <= option.price) return null;
  if (option.type === 'bundle' && option.books?.length > 1) {
    const parts = option.books.map((b) => `GH₵${Number(b.price || 0)}`);
    return `${parts.join(' + ')} = GH₵${Number(option.compareAtPrice)}`;
  }
  return `GH₵${Number(option.compareAtPrice)}`;
}

function formatSavings(option) {
  const compare = Number(option.compareAtPrice || 0);
  const price = Number(option.price || 0);
  if (compare > price) return compare - price;
  return 0;
}

function getCtaLabel(option) {
  if (option.ctaLabel) return option.ctaLabel;
  if (option.type === 'bundle') {
    return `Get Both Courses — GH₵${Number(option.price || 0)}`;
  }
  const headline = option.headline || option.cardTitle || '';
  const courseMatch = headline.match(/course\s*(\d+)/i);
  if (courseMatch) return `Get Course ${courseMatch[1]}`;
  if (option.label) {
    const label = option.label.replace(/\s*only$/i, '').trim();
    if (label) return `Get ${label}`;
  }
  return option.cardTitle ? `Get ${option.cardTitle}` : 'Get this book';
}

function getDeliveryLine(option, highlighted) {
  if (option.deliveryNote) return option.deliveryNote;
  if (option.type === 'bundle') {
    return highlighted
      ? 'One-time · Both books · Instant PDF'
      : 'One-time · Instant PDF delivery · All books included';
  }
  return 'One-time · Instant PDF delivery';
}

function getPromoPill(option, savings) {
  if (option.promoBadge) return option.promoBadge;
  if (savings > 0 && option.highlighted && option.type === 'bundle') {
    return `Save GH₵${savings} — Course 1 almost free!`;
  }
  if (savings > 0 && option.highlighted) {
    return `Save GH₵${savings}`;
  }
  return null;
}

function TopBadge({ children, highlighted }) {
  return (
    <div
      className={`absolute -top-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide shadow-md sm:text-[10px] ${
        highlighted
          ? 'border border-slate-200 bg-white text-[#0c2340]'
          : 'bg-amber-400 text-slate-900'
      }`}
    >
      {highlighted ? <FiStar className="h-3 w-3 shrink-0 text-amber-500" aria-hidden /> : null}
      {children}
    </div>
  );
}

function PlanCard({ option, onSelect }) {
  const highlighted = Boolean(option.highlighted);
  const compareLine = formatCompareLine(option);
  const savings = formatSavings(option);
  const promoPill = getPromoPill(option, savings);
  const ctaLabel = getCtaLabel(option);
  const deliveryLine = getDeliveryLine(option, highlighted);
  const features = (option.features || []).slice(0, 8);

  return (
    <article
      className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${
        highlighted
          ? 'z-10 border border-[#0c2340] bg-[#0c2340] text-white shadow-xl shadow-[#0c2340]/25 lg:-mt-2 lg:mb-2 lg:scale-[1.03] lg:px-8 lg:py-9'
          : 'border border-slate-200/90 bg-white text-slate-900 shadow-sm'
      }`}
    >
      {option.badge ? <TopBadge highlighted={highlighted}>{option.badge}</TopBadge> : null}

      {option.label ? (
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.22em] sm:text-xs ${
            highlighted ? 'text-sky-200/90' : 'text-slate-500'
          }`}
        >
          {option.label}
        </p>
      ) : null}

      <h3
        className={`mt-2 text-xl font-bold leading-snug sm:text-2xl ${
          highlighted ? 'text-white' : 'text-[#0c2340]'
        }`}
      >
        {option.headline || option.cardTitle || 'Plan'}
      </h3>

      {compareLine ? (
        <p
          className={`mt-4 text-center text-xs sm:text-sm ${
            highlighted ? 'text-sky-200/80 line-through' : 'text-slate-400 line-through'
          }`}
        >
          {compareLine}
        </p>
      ) : null}

      <p
        className={`font-black leading-none ${
          compareLine ? 'mt-2 text-center' : 'mt-4'
        } ${highlighted ? 'text-4xl text-white sm:text-5xl' : 'text-4xl text-[#0c2340] sm:text-5xl'}`}
      >
        GH₵{Number(option.price || 0)}
      </p>

      <p
        className={`mt-2 text-center text-xs sm:text-sm ${
          highlighted ? 'text-sky-100/90' : 'text-slate-500'
        }`}
      >
        {deliveryLine}
      </p>

      {promoPill ? (
        <p
          className={`mx-auto mt-3 max-w-[280px] rounded-full border px-3 py-1.5 text-center text-[11px] font-semibold leading-snug sm:text-xs ${
            highlighted
              ? 'border-sky-400/40 bg-[#0a1c33] text-sky-100'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          ✨ {promoPill}
        </p>
      ) : null}

      {option.footnote ? (
        <p
          className={`mt-2 text-center text-xs font-medium ${
            highlighted ? 'text-amber-200' : 'text-amber-700'
          }`}
        >
          ⚠️ {option.footnote}
        </p>
      ) : null}

      <hr
        className={`my-5 border-t ${highlighted ? 'border-sky-400/25' : 'border-slate-100'}`}
        aria-hidden
      />

      <ul className="flex-1 space-y-2.5 sm:space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-xs leading-snug sm:text-sm">
            <FiCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? 'text-sky-300' : 'text-[#2563eb]'}`}
              aria-hidden
            />
            <span className={highlighted ? 'text-sky-50/95' : 'text-slate-700'}>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(option)}
        className={`mt-6 w-full rounded-xl py-3.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          highlighted
            ? 'bg-white text-[#0c2340] shadow-md hover:bg-sky-50 focus-visible:ring-white'
            : 'border-2 border-[#0c2340] bg-white text-[#0c2340] hover:bg-slate-50 focus-visible:ring-[#0c2340]'
        }`}
      >
        {highlighted ? '🚀 ' : '💳 '}
        {ctaLabel}
      </button>

      <p
        className={`mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] sm:text-xs ${
          highlighted ? 'text-sky-200/80' : 'text-slate-400'
        }`}
      >
        <FiLock className="h-3 w-3 shrink-0" aria-hidden />
        {highlighted ? 'Secure · MoMo · No subscription' : 'Secure · MoMo accepted'}
      </p>
    </article>
  );
}

/**
 * Plan picker — three-tier layout (Starter / Bundle / Advanced) on a light surface.
 */
export default function BookOfferPicker({ offerGroup, onSelectOption }) {
  if (!offerGroup?.options?.length) return null;

  const count = offerGroup.options.length;
  const gridClass =
    count === 1
      ? 'mx-auto max-w-md'
      : count === 2
        ? 'mx-auto max-w-4xl sm:grid-cols-2'
        : 'mx-auto max-w-6xl lg:grid-cols-3';

  return (
    <section
      className="mt-16 rounded-3xl bg-gradient-to-b from-slate-50 to-white px-4 py-14 sm:px-6 sm:py-16 lg:mt-20 lg:py-20"
      aria-labelledby="book-offer-picker-heading"
    >
      <div className="mx-auto max-w-6xl text-center">
        <h2
          id="book-offer-picker-heading"
          className="text-xl font-black uppercase tracking-wide text-[#0c2340] sm:text-2xl lg:text-3xl"
        >
          {offerGroup.heading || 'PICK YOUR PLAN & START TODAY'}
        </h2>
        {offerGroup.subheading ? (
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            {offerGroup.subheading}
          </p>
        ) : null}
      </div>

      <div className={`mt-10 grid gap-6 sm:gap-7 lg:items-stretch ${gridClass}`}>
        {offerGroup.options.map((option) => (
          <PlanCard key={option.id} option={option} onSelect={onSelectOption} />
        ))}
      </div>
    </section>
  );
}
