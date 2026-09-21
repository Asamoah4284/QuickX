const axios = require('axios');

const MOOLRE_PAYMENT_URL = 'https://api.moolre.com/open/transact/payment';
const MOOLRE_STATUS_URL = 'https://api.moolre.com/open/transact/status';

function isConfigured() {
    return Boolean(
        process.env.MOOLRE_API_USER &&
        process.env.MOOLRE_API_PUBKEY &&
        process.env.MOOLRE_ACCOUNT_NUMBER
    );
}

function networkToChannel(network) {
    const map = {
        MTN: '13',
        Vodafone: '6',
        AirtelTigo: '7',
    };
    return map[String(network || '').trim()] || '13';
}

function detectNetwork(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    const local = digits.length >= 9 ? digits.slice(-9) : digits;
    const prefix = local.slice(0, 2);
    if (['24', '54', '55', '59'].includes(prefix)) return 'MTN';
    if (['20', '50'].includes(prefix)) return 'Vodafone';
    if (['27', '57', '26', '56'].includes(prefix)) return 'AirtelTigo';
    return 'MTN';
}

function headers() {
    return {
        'X-API-USER': process.env.MOOLRE_API_USER,
        'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY,
        'Content-Type': 'application/json',
    };
}

async function initiateCollection({ amount, payer, network, externalref, otpcode, sessionid }) {
    if (!isConfigured()) {
        return {
            ok: true,
            simulated: true,
            externalref,
            message: 'Moolre not configured — payment will complete in verify step',
        };
    }

    const body = {
        type: 1,
        channel: networkToChannel(network),
        currency: 'GHS',
        payer,
        amount: Number(amount).toFixed(2),
        externalref,
        accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
    };
    if (otpcode) body.otpcode = String(otpcode);
    if (sessionid) body.sessionid = String(sessionid);

    const response = await axios.post(MOOLRE_PAYMENT_URL, body, {
        headers: headers(),
        timeout: 30000,
    });
    const payload = response.data || {};
    const sessionValue =
        typeof payload.data === 'string'
            ? payload.data
            : payload.data?.sessionid || payload.data?.sessionId || null;

    return {
        ok: Number(payload.status) === 1,
        code: payload.code,
        message: payload.message,
        sessionId: sessionValue,
        requiresOtp: payload.code === 'TP14',
        externalref,
    };
}

async function verifyCollection(externalref, expectedAmount) {
    if (!isConfigured()) {
        return { ok: true, simulated: true, status: 'completed' };
    }

    const response = await axios.post(
        MOOLRE_STATUS_URL,
        {
            type: 1,
            idtype: '1',
            id: externalref,
            accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
        },
        { headers: headers(), timeout: 15000 }
    );

    const root = response.data || {};
    const data = root.data && typeof root.data === 'object' ? root.data : root;
    const txstatus = data.txstatus ?? data.status ?? root.status;
    const statusText = String(txstatus ?? '').toLowerCase();
    const success =
        statusText === '1' ||
        statusText === 'success' ||
        statusText === 'successful' ||
        statusText === 'completed';
    const failed =
        statusText === '0' ||
        statusText === 'failed' ||
        statusText === 'failure' ||
        statusText === 'cancelled';

    const paidAmount = Number(data.amount ?? data.finalamount ?? data.value);
    const amountMatch =
        expectedAmount == null ||
        !Number.isFinite(paidAmount) ||
        Math.abs(paidAmount - Number(expectedAmount)) <= 0.02;

    return {
        ok: success && amountMatch,
        pending: !success && !failed,
        failed,
        raw: data,
    };
}

module.exports = {
    isConfigured,
    networkToChannel,
    detectNetwork,
    initiateCollection,
    verifyCollection,
};
