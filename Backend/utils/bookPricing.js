/**
 * The prices a buyer may pay for one book.
 * A delivered hardcopy (shippingAddress.deliveryType set) costs the hardcopy price plus delivery,
 * so the cheaper ebook price can't be used to order a printed copy.
 */
function allowedBookPrices(book, deliveryType) {
    const ebookPrice = Number(book.price || 0);
    const fee = Number(book.deliveryOptions?.deliveryFee ?? book.deliveryFee ?? 0) || 0;
    if (deliveryType) {
        const base =
            book.type === 'hardcopy'
                ? ebookPrice
                : book.hardcopyPrice != null && book.hardcopyPrice !== ''
                ? Number(book.hardcopyPrice)
                : null;
        if (base == null) return [];
        return deliveryType === 'pickup' ? [base] : [base + fee];
    }
    if (book.type === 'hardcopy') return [ebookPrice, ebookPrice + fee];
    return [ebookPrice];
}

function bookPriceMatches(book, amount, deliveryType) {
    return allowedBookPrices(book, deliveryType).some((p) => Math.abs(p - Number(amount)) <= 0.05);
}

module.exports = { allowedBookPrices, bookPriceMatches };
