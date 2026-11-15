/**
 * Payments are always confirmed with the provider (Paystack / Moolre) before
 * anything is granted. The only exception is local development, and it must be
 * switched on deliberately:
 *
 *   ALLOW_SIMULATED_PAYMENTS=true
 *
 * Never set this on a live server — it lets anyone complete a purchase without paying.
 */
function allowSimulatedPayments() {
    return String(process.env.ALLOW_SIMULATED_PAYMENTS || '').toLowerCase() === 'true';
}

module.exports = { allowSimulatedPayments };
