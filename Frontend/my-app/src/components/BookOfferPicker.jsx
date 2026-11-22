import { useMemo } from 'react';
import { FiCheck, FiLock, FiStar } from 'react-icons/fi';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyStore';

/** Starter | Bundle (center) | Advanced. The bundle is always in the middle when there are 3 tiers. */
function orderOptionsForDisplay(options) {
  const list = [...(options || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  if (list.length !== 3) return list;

  const bundleIndex = list.findIndex((o) => o.type === 'bundle' || o.highlighted);
  if (bundleIndex < 0) return list;

  const bundle = list[bundleIndex];
  const others = list.filter((_, i) => i !== bundleIndex);
  return [others[0], bundle, others[1]].filter(Boolean);
}

/** Sum individual plan tiers (starter + advanced) for bundle compare-at pricing. */
function getBundleCompareFromPlans(bundleOption, allOptions) {
  const singles = (allOptions || [])
    .filter((o) => o.id !== bundleOption.id && o.type !== 'bundle')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (singles.length < 2) return null;

  const parts = singles.map((o) => Number(o.price || 0));
  const total = parts.reduce((sum, price) => sum + price, 0);
  if (total <= Number(bundleOption.price || 0)) return null;

  return { parts, total };
}

function formatCompareLine(option, allOptions) {
  if (option.type === 'bundle') {
    const fromPlans = getBundleCompareFromPlans(option, allOptions);
    if (fromPlans) {
      const sym = getCurrencySymbol();
      const priceParts = fromPlans.parts.map((price) => `${sym}${price}`);
      return `${priceParts.join(' + ')} = ${sym}${fromPlans.total}`;
    }
  }

  if (!option.compareAtPrice || option.compareAtPrice <= option.price) return null;
  if (option.type === 'bundle' && option.books?.length > 1) {
    const sym = getCurrencySymbol();
    const parts = option.books.map((b) => `${sym}${Number(b.price || 0)}`);
    return `${parts.join(' + ')} = ${sym}${Number(option.compareAtPrice)}`;
  }
  return `${getCurrencySymbol()}${Number(option.compareAtPrice)}`;
}

function formatSavings(option, allOptions) {
  const fromPlans =
    option.type === 'bundle' ? getBundleCompareFromPlans(option, allOptions) : null;
  const compare = fromPlans?.total ?? Number(option.compareAtPrice || 0);
  const price = Number(option.price || 0);
  if (compare > price) return compare - price;
  return 0;
}

function getCtaLabel(option) {
  if (option.ctaLabel) {
    const custom = String(option.ctaLabel).trim();
    if (/^buy\s+(course|now)/i.test(custom) && !/^buy now$/i.test(custom)) {
      return 'Buy Now';
    }
    return custom;
  }
  if (option.type === 'bundle') {
    return `Buy now for ${formatCurrency(Number(option.price || 0))}`;
  }
  return 'Buy Now';
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
  const sym = getCurrencySymbol();
  if (savings > 0 && option.highlighted && option.type === 'bundle') {
    return `Save ${sym}${savings}. Course 1 is almost free!`;
  }
  if (savings > 0 && option.highlighted) {
    return `Save ${sym}${savings}`;
  }
  return null;
}

function TopBadge({ children, highlighted }) {
  return (
    <div
      className={`absolute -top-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wide shadow-md sm:text-[10px] ${
        highlighted
          ? 'border border-line bg-ink-850 text-fg'
          : 'bg-amber-400 text-fg'
      }`}
    >
      {highlighted ? <FiStar className="h-3 w-3 shrink-0 text-warn" aria-hidden /> : null}
      {children}
    </div>
  );
}

function PlanCard({ option, allOptions, onSelect }) {
  const highlighted = Boolean(option.highlighted) || option.type === 'bundle';
  const compareLine = formatCompareLine(option, allOptions);
  const savings = formatSavings(option, allOptions);
  const promoPill = getPromoPill(option, savings);
  const ctaLabel = getCtaLabel(option);
  const deliveryLine = getDeliveryLine(option, highlighted);
  const features = (option.features || []).slice(0, 8);

  return (
    <article
      className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${
        highlighted
          ? 'z-10 border border-line-strong bg-ink-800 text-fg shadow-xl shadow-[#0c2340]/25 lg:-mt-2 lg:mb-2 lg:scale-[1.03] lg:px-8 lg:py-9'
          : 'border border-line bg-ink-850 text-fg shadow-sm'
      }`}
    >
      {option.badge ? <TopBadge highlighted={highlighted}>{option.badge}</TopBadge> : null}

      {option.label ? (
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.22em] sm:text-xs ${
            highlighted ? 'text-brand-300' : 'text-fg-subtle'
          }`}
        >
          {option.label}
        </p>
      ) : null}

      <h3
        className={`mt-2 text-xl font-bold leading-snug sm:text-2xl ${
          'text-fg'
        }`}
      >
        {option.headline || option.cardTitle || 'Plan'}
      </h3>

      {compareLine ? (
        <p
          className={`mt-4 text-center text-xs sm:text-sm ${
            highlighted ? 'text-brand-300 line-through' : 'text-fg-subtle line-through'
          }`}
        >
          {compareLine}
        </p>
      ) : null}

      <p
        className={`font-black leading-none ${
          compareLine ? 'mt-2 text-center' : 'mt-4'
        } ${'text-4xl text-fg sm:text-5xl'}`}
      >
        {formatCurrency(Number(option.price || 0))}
      </p>

      <p
        className={`mt-2 text-center text-xs sm:text-sm ${
          highlighted ? 'text-brand-300' : 'text-fg-subtle'
        }`}
      >
        {deliveryLine}
      </p>

      {promoPill ? (
        <p
          className={`mx-auto mt-3 max-w-[280px] rounded-full border px-3 py-1.5 text-center text-[11px] font-semibold leading-snug sm:text-xs ${
            highlighted
              ? 'border-brand-500/40 bg-ink-800 text-brand-300'
              : 'border-warn/30 bg-warn/10 text-warn'
          }`}
        >
          ✨ {promoPill}
        </p>
      ) : null}

      {option.footnote ? (
        <p
          className={`mt-2 text-center text-xs font-medium ${
            highlighted ? 'text-warn' : 'text-warn'
          }`}
        >
          ⚠️ {option.footnote}
        </p>
      ) : null}

      <hr
        className={`my-5 border-t ${highlighted ? 'border-brand-500/25' : 'border-line'}`}
        aria-hidden
      />

      <ul className="flex-1 space-y-2.5 sm:space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-xs leading-snug sm:text-sm">
            <FiCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? 'text-brand-300' : 'text-brand-400'}`}
              aria-hidden
            />
            <span className={highlighted ? 'text-brand-300' : 'text-fg-muted'}>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(option)}
        className={`mt-6 w-full rounded-xl py-3.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          highlighted
            ? 'bg-ink-850 text-fg shadow-md hover:bg-brand-500/10 focus-visible:ring-ink-850'
            : 'border-2 border-line-strong bg-ink-850 text-fg hover:bg-ink-900 focus-visible:ring-line-strong'
        }`}
      >
        {highlighted ? '🚀 ' : '💳 '}
        {ctaLabel}
      </button>

      <p
        className={`mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] sm:text-xs ${
          highlighted ? 'text-brand-300' : 'text-fg-subtle'
        }`}
      >
        <FiLock className="h-3 w-3 shrink-0" aria-hidden />
        {highlighted ? 'Secure · MoMo · No subscription' : 'Secure · MoMo accepted'}
      </p>
    </article>
  );
}

/**
 * Plan picker with up to three options (Starter, Bundle, Advanced).
 */
export default function BookOfferPicker({ offerGroup, onSelectOption }) {
  const options = offerGroup?.options;
  const displayOptions = useMemo(() => (options?.length ? orderOptionsForDisplay(options) : []), [options]);
  if (!displayOptions.length) return null;

  const count = displayOptions.length;
  const gridClass =
    count === 1
      ? 'mx-auto max-w-md'
      : count === 2
        ? 'mx-auto max-w-4xl sm:grid-cols-2'
        : 'mx-auto max-w-6xl lg:grid-cols-3';

  return (
    <section
      className="mt-16 rounded-3xl bg-gradient-to-b from-ink-900 to-ink-850 px-4 py-14 sm:px-6 sm:py-16 lg:mt-20 lg:py-20"
      aria-labelledby="book-offer-picker-heading"
    >
      <div className="mx-auto max-w-6xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-400 ring-1 ring-brand-400/30 mb-3">
          <span>📱 Digital E-Book Edition</span>
          <span className="h-1 w-1 rounded-full bg-brand-600" />
          <span>Instant PDF Access</span>
        </div>
        <h2
          id="book-offer-picker-heading"
          className="text-xl font-black uppercase tracking-wide text-fg sm:text-2xl lg:text-3xl"
        >
          {offerGroup.heading ? `${offerGroup.heading} (Digital E-Book)` : 'DIGITAL E-BOOK EDITION PLANS (INSTANT DOWNLOAD)'}
        </h2>
        {offerGroup.subheading ? (
          <p className="mx-auto mt-2 max-w-2xl text-xs sm:text-sm text-fg-subtle">
            {offerGroup.subheading}
          </p>
        ) : (
          <p className="mx-auto mt-2 max-w-2xl text-xs sm:text-sm text-fg-subtle">
            Choose your preferred digital e-book package. Download immediately to your phone, tablet or PC upon payment.
          </p>
        )}
      </div>

      <div className={`mt-10 grid gap-6 sm:gap-7 lg:items-center ${gridClass}`}>
        {displayOptions.map((option) => (
          <PlanCard
            key={option.id}
            option={option}
            allOptions={displayOptions}
            onSelect={onSelectOption}
          />
        ))}
      </div>
    </section>
  );
}
