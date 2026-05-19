/** @param {object} item */
export function normalizeCartItem(item) {
  const qty = Number(item?.quantity);
  return {
    ...item,
    quantity: Math.max(1, Math.min(99, Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1)),
  };
}

/** @param {object[]} items */
export function normalizeCart(items) {
  return (Array.isArray(items) ? items : []).map(normalizeCartItem);
}

/** @param {object} item */
export function getCartLineTotal(item) {
  const { quantity } = normalizeCartItem(item);
  return Number(item?.price || 0) * quantity;
}

/** @param {object[]} items */
export function getCartSubtotal(items) {
  return normalizeCart(items).reduce((sum, item) => sum + getCartLineTotal(item), 0);
}

/** Total units (sum of quantities). */
export function getCartItemCount(items) {
  return normalizeCart(items).reduce((sum, item) => sum + item.quantity, 0);
}

/** Repeat book ids for payment API (supports qty > 1 per title). */
export function expandCartItemsForPayment(items) {
  return normalizeCart(items).flatMap((item) => {
    const id = String(item.id ?? item._id ?? '');
    if (!id) return [];
    return Array(item.quantity).fill(id);
  });
}
