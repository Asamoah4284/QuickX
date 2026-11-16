const axios = require('axios');
const { allowSimulatedPayments } = require('../config/paymentMode');

function secretKey() {
    const key = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
    return /^sk_(test|live)_/.test(key) ? key : null;
}

function isConfigured() {
    return Boolean(secretKey());
}

/**
 * Confirm with Paystack that `reference` is a successful GHS payment of at least
 * `expectedAmount` (in cedis). Never trusts the browser: access is only granted
 * when this returns ok.
 */
async function verifyPayment(reference, expectedAmount) {
    const key = secretKey();
    if (!key && allowSimulatedPayments()) {
        console.warn('ALLOW_SIMULATED_PAYMENTS is on. A payment was accepted without checking Paystack.');
        return { ok: true, simulated: true, paidAmount: Number(expectedAmount), channel: 'simulated', email: '' };
    }
    if (!key) {
        return { ok: false, code: 'NOT_CONFIGURED', message: 'Card payments are not available right now.' };
    }
    const ref = String(reference || '').trim();
    if (!ref) return { ok: false, code: 'NO_REFERENCE', message: 'Missing payment reference.' };

    let data;
    try {
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
            { headers: { Authorization: `Bearer ${key}` }, timeout: 15000 }
        );
        data = response.data?.data;
    } catch (err) {
        const status = err.response?.status;
        if (status === 400 || status === 404) {
            return { ok: false, code: 'NOT_FOUND', message: 'Payment reference not found.' };
        }
        console.error('Paystack verify failed:', status || err.message);
        return { ok: false, code: 'UNAVAILABLE', message: 'Could not confirm the payment. Please try again.' };
    }

    if (!data || data.status !== 'success') {
        return { ok: false, code: 'NOT_SUCCESSFUL', message: 'Payment was not completed.' };
    }
    if (String(data.currency || '').toUpperCase() !== 'GHS') {
        return { ok: false, code: 'WRONG_CURRENCY', message: 'Payment currency mismatch.' };
    }
    // Paystack reports amounts in pesewas.
    const paid = Number(data.amount);
    const expected = Math.round(Number(expectedAmount) * 100);
    if (!Number.isFinite(paid) || paid + 1 < expected) {
        return { ok: false, code: 'AMOUNT_MISMATCH', message: 'Amount paid does not match the price.' };
    }
    return { ok: true, paidAmount: paid / 100, channel: data.channel || 'card', email: data.customer?.email || '' };
}

/**
 * Start a Paystack checkout page (used by the phone app). The amount must already be
 * worked out on the server. Returns { ok, url, reference } or { ok: false, code, message }.
 */
async function initializePayment({ email, amount, reference, metadata = {}, callbackUrl }) {
    const key = secretKey();
    if (!key) return { ok: false, code: 'NOT_CONFIGURED', message: 'Payments are not available right now.' };
    const pesewas = Math.round(Number(amount) * 100);
    if (!(pesewas >= 100)) return { ok: false, code: 'BAD_AMOUNT', message: 'The amount must be at least GH₵1.' };

    try {
        const { data } = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email,
                amount: pesewas,
                currency: 'GHS',
                reference,
                channels: ['mobile_money', 'card'],
                metadata,
                ...(callbackUrl ? { callback_url: callbackUrl } : {}),
            },
            { headers: { Authorization: `Bearer ${key}` }, timeout: 15000 }
        );
        const url = data?.data?.authorization_url;
        if (!url) return { ok: false, code: 'UNAVAILABLE', message: 'Could not start the payment. Please try again.' };
        return { ok: true, url, reference: data.data.reference || reference };
    } catch (err) {
        console.error('Paystack initialize failed:', err.response?.status || err.message, err.response?.data?.message || '');
        return { ok: false, code: 'UNAVAILABLE', message: 'Could not start the payment. Please try again.' };
    }
}

module.exports = { verifyPayment, initializePayment, isConfigured };
