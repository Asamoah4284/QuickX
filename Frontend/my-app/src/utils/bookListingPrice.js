import { formatGhs } from './formatGhs';

/** Resolve listing price for store cards and book about sections. */
export function getBookListingPrice(book, offerGroup = null) {
  if (offerGroup?.options?.length) {
    const prices = offerGroup.options
      .map((option) => Number(option.price || 0))
      .filter((price) => price >= 0);
    const fromPrice = prices.length ? Math.min(...prices) : Number(book?.price || 0);
    const hasMultipleTiers = prices.length > 1 && new Set(prices).size > 1;
    const featured =
      offerGroup.options.find((option) => option.type === 'bundle' || option.highlighted) ||
      null;

    return {
      displayPrice: fromPrice,
      showFromLabel: hasMultipleTiers,
      featuredPrice: featured ? Number(featured.price || 0) : null,
      hasOfferPlans: true,
    };
  }

  if (book?.hasOfferPlans) {
    const displayPrice = Number(book.displayPrice ?? book.fromPrice ?? book.price ?? 0);
    return {
      displayPrice,
      showFromLabel: book.fromPrice != null,
      featuredPrice:
        book.featuredOfferPrice != null ? Number(book.featuredOfferPrice) : null,
      hasOfferPlans: true,
    };
  }

  return {
    displayPrice: Number(book?.displayPrice ?? book?.price ?? 0),
    showFromLabel: false,
    featuredPrice: null,
    hasOfferPlans: false,
  };
}

export function formatBookListingPrice(book, offerGroup = null) {
  const { displayPrice, showFromLabel } = getBookListingPrice(book, offerGroup);
  const formatted = formatGhs(displayPrice);
  return showFromLabel ? `From ${formatted}` : formatted;
}
