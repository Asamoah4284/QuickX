/**
 * Payments are always confirmed with the provider (Paystack / Moolre) before
 * anything is granted. The only exception is local development, and it must be
 * switched on deliberately:
 *
 *   ALLOW_SIMULATED_PAYMENTS=true
 *
 * Never set this on a live server, it lets anyone complete a purchase without paying.
 * It is ignored when NODE_ENV=production, so a forgotten setting cannot give things away.
 */
let warned = false;

function allowSimulatedPayments() {
    const requested = String(process.env.ALLOW_SIMULATED_PAYMENTS || '').toLowerCase() === 'true';
    if (!requested) return false;
    if (process.env.NODE_ENV === 'production') {
        if (!warned) {
            console.error('ALLOW_SIMULATED_PAYMENTS is ignored because NODE_ENV=production. Remove it from .env.');
            warned = true;
        }
        return false;
    }
    return true;
}

module.exports = { allowSimulatedPayments };
