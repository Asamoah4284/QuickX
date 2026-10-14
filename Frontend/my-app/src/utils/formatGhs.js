import { formatCurrency } from './currencyStore';

/** Format amount in active platform currency (USD $ or Ghana Cedis GH₵). */
export function formatGhs(value, options) {
  return formatCurrency(value, options);
}

