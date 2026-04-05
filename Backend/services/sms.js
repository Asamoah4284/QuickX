const axios = require('axios');

/**
 * Sends an OTP via Moolre SMS API
 * @param {string} phone - Recipient phone number (e.g., 055...)
 * @param {string} code - The 6-digit verification code
 * @returns {Promise<Object>} - API response
 */
const sendOTP = async (phone, code) => {
    const apiKey = process.env.MOOLRE_API_KEY;
    const senderId = process.env.MOOLRE_SENDER_ID || 'QuickX';

    if (!apiKey) {
        console.warn('MOOLRE_API_KEY is not configured. OTP will be logged to console only.');
        console.log(`[SMS MOCK] To: ${phone}, Message: Your QuickX verification code is: ${code}`);
        return { status: 1, message: 'Mock success (API key missing)' };
    }

    // Modern Moolre API expects international format or handles local, but we'll ensure it's clean
    // If it starts with 0 and has 10 digits, it's likely Ghana. Let's prepend 233 if needed or let Moolre handle it.
    // Based on the docs I found, standard format is preferred.
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
        formattedPhone = '233' + formattedPhone.substring(1);
    }

    const options = {
        method: 'POST',
        url: 'https://api.moolre.com/open/sms/send',
        headers: {
            'X-API-VASKEY': apiKey,
            'Content-Type': 'application/json'
        },
        data: {
            "type": 1,
            "senderid": senderId,
            "messages": [
                {
                    "recipient": formattedPhone,
                    "message": `Your QuickX verification code is: ${code}. It expires in 10 minutes.`,
                    "ref": `auth_verify_${Date.now()}`
                }
            ]
        }
    };

    try {
        const response = await axios.request(options);
        console.log('Moolre SMS response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Moolre SMS error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to send verification SMS');
    }
};

module.exports = {
    sendOTP
};
