/** Format amount in Ghana Cedis (GH₵). */
export function formatGhs(value) {
  const n = Number(value || 0);
  return `GH\u20B5${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
