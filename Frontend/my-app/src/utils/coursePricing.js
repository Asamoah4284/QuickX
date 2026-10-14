import { getCurrencySymbol } from './currencyStore';

/**
 * Helper to format course display prices consistently without undefined or NaN.
 */
export function formatCoursePriceLabel(course) {
  if (!course) return 'Free';
  const sym = getCurrencySymbol();

  // 1. Check tutor / course subscription pricing if available
  const basic = Number(course.subscriptionPricing?.basic ?? course.subscriptionPricing?.month1);
  if (Number.isFinite(basic) && basic > 0) {
    return `From ${sym}${basic.toFixed(0)}/mo`;
  }

  // 2. Explicit price on course
  const numPrice = Number(course.price);
  if (Number.isFinite(numPrice) && numPrice > 0) {
    return `${sym}${numPrice.toLocaleString('en-US')}`;
  }

  // 3. Min module price if course has modular pricing
  const minMod = Number(course.minModulePrice);
  if (Number.isFinite(minMod) && minMod > 0) {
    return `From ${sym}${minMod.toLocaleString('en-US')}`;
  }

  if (Array.isArray(course.modules) && course.modules.length > 0) {
    const prices = course.modules
      .map((m) => Number(m.price))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (prices.length > 0) {
      return `From ${sym}${Math.min(...prices).toLocaleString('en-US')}`;
    }
  }

  // 4. Default to Free if pricingType is 'free' or price is 0/null/undefined
  return 'Free';
}
