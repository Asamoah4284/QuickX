/**
 * Plans and their lengths.
 *
 * Every length (Signals for 1 month, Signals for 3 months...) is its own product with its
 * own price. Products that give the same features are lengths of one plan; the server sends
 * them as `group`. The list comes sorted by the admin's order, then shortest first.
 */

export function planGroupOf(product) {
  return product.group || [...new Set(product.grants || [])].sort().join('+');
}

/** [{ group, lengths: [shortest ... longest], first }] in the order the plans arrive. */
export function groupPlans(products = []) {
  const map = new Map();
  for (const p of products) {
    const g = planGroupOf(p);
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(p);
  }
  return [...map.entries()].map(([group, lengths]) => {
    const sorted = [...lengths].sort((a, b) => a.durationDays - b.durationDays || a.price - b.price);
    return { group, lengths: sorted, first: sorted[0], bundle: (sorted[0].grants || []).length > 1 };
  });
}

/** The plan that gives exactly one feature, e.g. Signals on its own. */
export function singlePlan(products, feature) {
  return groupPlans(products).find((p) => !p.bundle && p.first.grants[0] === feature) || null;
}

/** The first bundle that includes the feature, e.g. All-Access. */
export function bundlePlan(products, feature) {
  return groupPlans(products).find((p) => p.bundle && (!feature || p.first.grants.includes(feature))) || null;
}

/** Price per 30 days, for "That is GH₵83 a month" under longer lengths. */
export function monthlyPrice(product) {
  return product.durationDays >= 60 ? product.price / (product.durationDays / 30) : null;
}

/** How much cheaper per day than the shortest length, as a whole percent (0 when not cheaper). */
export function savingVs(product, shortest) {
  if (!shortest || product === shortest || !shortest.price || !shortest.durationDays) return 0;
  const perDay = product.price / product.durationDays;
  const basePerDay = shortest.price / shortest.durationDays;
  const pct = Math.round((1 - perDay / basePerDay) * 100);
  return pct >= 1 ? pct : 0;
}
