/**
 * Works out what the phone app is about to pay for, and how much, before a Paystack
 * checkout page is opened. The amount always comes from the server. After paying, the
 * app confirms through the same endpoints the website uses, which check the amount again.
 */

const PURPOSES = ['product', 'event', 'pie', 'book'];
const round2 = (n) => Math.round(Number(n) * 100) / 100;

function fail(message, status = 400) {
    const err = new Error(message);
    err.status = status;
    return err;
}

/** "QX-APP-PIE-1731745000000-a1b2c3". (Pure, unit tested.) */
function newReference(purpose, now = Date.now(), rand = Math.random()) {
    return `QX-APP-${String(purpose).toUpperCase()}-${now}-${rand.toString(36).slice(2, 8)}`;
}

/** Paystack needs an email. Phone-only accounts get a stable placeholder. (Pure, unit tested.) */
function payerEmail(user) {
    const email = String(user?.email || '').trim();
    if (/^\S+@\S+\.\S+$/.test(email)) return email;
    const phone = String(user?.phone || '').replace(/\D/g, '');
    return `${phone || String(user?._id || 'member')}@phone.quickxlearn.com`;
}

/**
 * Returns { amount, label, metadata } for a checkout, or throws an error with .status.
 * `deps` holds the database lookups so this can be tested without a database.
 */
async function resolveCheckout({ purpose, body = {}, user }, deps) {
    if (!PURPOSES.includes(purpose)) throw fail('Unknown payment type');

    if (purpose === 'product') {
        const quote = await deps.quoteProduct(body.key, body.couponCode);
        if (quote.amount < 0.01) throw fail('This coupon covers the full price. Use Redeem instead.');
        return {
            amount: round2(quote.amount),
            label: quote.product.name,
            metadata: { item_type: 'product', product_key: quote.product.key, coupon: quote.couponCode || '' },
        };
    }

    if (purpose === 'event') {
        const event = await deps.findEvent(body.id);
        if (!event) throw fail('Event not found', 404);
        if (event.status !== 'published') throw fail('This event is not open for ticket sales');
        if (new Date(event.endDate || event.startDate) < new Date()) throw fail('This event has already ended.');
        const price = round2(event.price);
        if (event.isFree || !(price > 0)) throw fail('This event is free. Register instead.');
        if (event.capacity > 0 && (event.ticketsSold || 0) >= event.capacity) throw fail('This event is fully booked.');
        if (await deps.hasTicket(event._id, user._id)) throw fail('You already have a ticket for this event.');
        return { amount: price, label: event.title, metadata: { item_type: 'event', event_id: String(event._id) } };
    }

    if (purpose === 'pie') {
        const amount = round2(body.amount);
        if (!(amount > 0)) throw fail('Enter how much you want to put in');
        const pie = await deps.findPie(body.id);
        const problem = await deps.sliceProblem(pie, user._id, amount);
        if (problem) throw fail(problem.message, problem.status || 400);
        return { amount, label: `Pie slice: ${pie.title}`, metadata: { item_type: 'pie', pie_id: String(pie._id) } };
    }

    // Books: same checks as the website checkout. The amount sent must be one of the
    // book's real prices (ebook, pickup, delivery, offer or cart total) or it is refused.
    if (!['book', 'book_cart', 'book_offer'].includes(body.itemType)) throw fail('Unknown book order');
    const validated = await deps.validatePurchaseIntent({ ...body, transactionId: 'pending' }, user._id);
    return {
        amount: round2(validated.amount),
        label: 'Book order',
        metadata: { item_type: validated.itemType, item_id: validated.itemId ? String(validated.itemId) : '' },
    };
}

module.exports = { PURPOSES, newReference, payerEmail, resolveCheckout };
