const mongoose = require('mongoose');
const Book = require('../models/Book');
const BookOfferGroup = require('../models/BookOfferGroup');

function parseBookObjectIds(ids) {
    return [...new Set((ids || []).map((id) => String(id).trim()))]
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
}

function normalizeStringArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    return String(value)
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function planBookPdfUrl(pb, anchorBook) {
    const fromRow = String(pb.fileUrl || '').trim();
    if (fromRow) return fromRow;
    const rawId = pb.bookId ? String(pb.bookId).trim() : '';
    if (rawId && String(anchorBook._id) === rawId) {
        return String(anchorBook.fileUrl || '').trim();
    }
    return '';
}

function missingPdfError(title) {
    const err = new Error(
        `Upload a PDF for "${title}" inside that purchase plan before saving.`
    );
    err.status = 400;
    return err;
}

async function loadPlanBooksFromBookIds(bookIds) {
    const ids = parseBookObjectIds(bookIds);
    if (!ids.length) return [];

    const books = await Book.find({ _id: { $in: ids } }).select('_id title fileUrl');
    const byId = new Map(books.map((b) => [String(b._id), b]));

    return ids.map((id) => {
        const book = byId.get(String(id));
        return {
            bookId: id,
            title: String(book?.title || '').trim(),
            fileUrl: String(book?.fileUrl || '').trim(),
        };
    });
}

function normalizePlanBooksEmbedded(rows) {
    return (rows || [])
        .map((pb) => {
            const rawId = pb.bookId ? String(pb.bookId).trim() : '';
            if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) return null;
            const fileUrl = String(pb.fileUrl || '').trim();
            if (!fileUrl) return null;
            return {
                bookId: new mongoose.Types.ObjectId(rawId),
                title: String(pb.title || '').trim(),
                fileUrl,
            };
        })
        .filter(Boolean);
}

/** Create or update books from inline plan rows (title + PDF per plan). */
async function upsertPlanBooksForOption(anchorBook, planBooks, userId) {
    const listingStatus =
        anchorBook.listingStatus === 'published' || anchorBook.listingStatus === 'approved'
            ? 'published'
            : 'draft';

    const ids = [];
    const embedded = [];
    for (const pb of planBooks || []) {
        const title = String(pb.title || anchorBook.title || 'Book').trim();
        if (!title) {
            continue;
        }

        const fileUrl = planBookPdfUrl(pb, anchorBook);

        let book = null;
        const rawId = pb.bookId ? String(pb.bookId).trim() : '';
        if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
            book = await Book.findOne({
                _id: rawId,
                createdBy: userId,
                source: 'instructor',
            });
        }

        if (book) {
            const existingUrl = String(book.fileUrl || '').trim();
            const effectiveUrl = fileUrl || existingUrl;
            if (!effectiveUrl) {
                throw missingPdfError(title);
            }
            const isStorefront =
                String(book._id) === String(anchorBook._id);
            book.title = title;
            book.type = 'ebook';
            book.fileUrl = effectiveUrl;
            book.isPlanDeliverable = !isStorefront;
            if (!isStorefront) {
                book.listingStatus = 'draft';
                book.offerGroupId = null;
            }
            await book.save();
            ids.push(book._id);
            embedded.push({
                bookId: book._id,
                title: book.title,
                fileUrl: String(book.fileUrl || '').trim(),
            });
            continue;
        }

        if (!fileUrl) {
            throw missingPdfError(title);
        }

        const siblingThumb = String(anchorBook.thumbnail || '').trim();
        book = new Book({
            title,
            author: String(anchorBook.author || '').trim() || 'Author',
            description: String(anchorBook.description || '').trim() || 'E-book',
            type: 'ebook',
            price: Number(anchorBook.price) || 0,
            category: anchorBook.category || 'general',
            fileUrl,
            thumbnail: siblingThumb || undefined,
            createdBy: userId,
            source: 'instructor',
            listingStatus: 'draft',
            isPlanDeliverable: true,
            offerGroupId: null,
        });
        await book.save();
        ids.push(book._id);
        embedded.push({
            bookId: book._id,
            title: book.title,
            fileUrl: String(book.fileUrl || '').trim(),
        });
    }

    return {
        bookIds: parseBookObjectIds(ids),
        planBooks: embedded,
    };
}

/** Backfill planBooks on older offer groups so Compass shows PDF URLs per plan. */
async function ensureOfferGroupPlanBooksEmbeds(offerGroup) {
    if (!offerGroup?.options?.length) return offerGroup;

    let dirty = false;
    for (const opt of offerGroup.options) {
        const hasEmbeds =
            Array.isArray(opt.planBooks) &&
            opt.planBooks.length > 0 &&
            opt.planBooks.every((pb) => String(pb.fileUrl || '').trim());
        if (hasEmbeds) continue;
        if (!opt.bookIds?.length) continue;

        opt.planBooks = normalizePlanBooksEmbedded(
            await loadPlanBooksFromBookIds(opt.bookIds)
        );
        if (opt.planBooks.length) dirty = true;
    }

    if (dirty) {
        offerGroup.markModified('options');
        await offerGroup.save();
    }
    return offerGroup;
}

async function resolveOfferOptionsWithPlanBooks(anchorBook, rawOptions, userId) {
    const resolved = [];
    for (const raw of rawOptions || []) {
        let bookIds = [];
        let planBooks = [];
        if (Array.isArray(raw.planBooks) && raw.planBooks.length) {
            const upserted = await upsertPlanBooksForOption(anchorBook, raw.planBooks, userId);
            bookIds = upserted.bookIds;
            planBooks = upserted.planBooks;
        } else {
            bookIds = parseBookObjectIds(raw.bookIds);
            planBooks = await loadPlanBooksFromBookIds(bookIds);
        }
        resolved.push({ ...raw, bookIds, planBooks });
    }
    return resolved;
}

function normalizeOfferOptions(rawOptions) {
    if (!Array.isArray(rawOptions)) return [];
    return rawOptions
        .map((opt, index) => {
            const type = opt.type === 'bundle' ? 'bundle' : 'single';
            const bookIds = parseBookObjectIds(
                Array.isArray(opt.bookIds) ? opt.bookIds : []
            );
            if (!bookIds.length) return null;

            const price = Number(opt.price);
            if (!Number.isFinite(price) || price < 0) return null;

            const compareRaw =
                opt.compareAtPrice != null && opt.compareAtPrice !== ''
                    ? Number(opt.compareAtPrice)
                    : null;
            const compareAtPrice =
                compareRaw != null && Number.isFinite(compareRaw) && compareRaw >= 0
                    ? compareRaw
                    : undefined;

            const planBooks = normalizePlanBooksEmbedded(opt.planBooks);
            if (!planBooks.length) return null;

            return {
                type,
                bookIds,
                planBooks,
                label: String(opt.label || '').trim(),
                headline: String(opt.headline || '').trim(),
                cardTitle: String(opt.cardTitle || '').trim(),
                thumbnail: String(opt.thumbnail || '').trim(),
                price,
                compareAtPrice,
                badge: String(opt.badge || '').trim(),
                footnote: String(opt.footnote || '').trim(),
                features: normalizeStringArray(opt.features),
                highlighted: Boolean(opt.highlighted),
                sortOrder: Number(opt.sortOrder) || index,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function assertBooksOwnedByCreator(bookIds, userId) {
    const unique = parseBookObjectIds(bookIds);
    if (!unique.length) {
        const err = new Error('Each purchase option must include at least one valid book');
        err.status = 400;
        throw err;
    }
    const books = await Book.find({
        _id: { $in: unique },
        createdBy: userId,
        source: 'instructor',
    }).select('_id title price thumbnail type fileUrl listingStatus');

    if (books.length !== unique.length) {
        const err = new Error('One or more books are invalid or not owned by you');
        err.status = 400;
        throw err;
    }
    return books;
}

function collectBookIdsFromGroupOptions(options) {
    const ids = new Set();
    for (const opt of options || []) {
        for (const id of opt.bookIds || []) {
            ids.add(String(id));
        }
    }
    return [...ids];
}

/** One marketplace card per product; plan PDF rows stay off the grid. */
async function migrateMarketplaceListings() {
    const groups = await BookOfferGroup.find({});
    let updated = 0;

    for (const group of groups) {
        const idList = collectBookIdsFromGroupOptions(group.options);
        if (!idList.length) continue;

        let storefrontId = group.storefrontBookId;
        if (!storefrontId) {
            const candidates = await Book.find({ _id: { $in: idList } }).select(
                '_id title thumbnail whatYoullLearn isPlanDeliverable'
            );
            const storefront =
                candidates.find(
                    (b) =>
                        !b.isPlanDeliverable &&
                        (b.thumbnail || (b.whatYoullLearn && b.whatYoullLearn.length > 0))
                ) || candidates.find((b) => !/^Book\s+\d+$/i.test(String(b.title || ''))) || candidates[0];
            if (!storefront) continue;
            storefrontId = storefront._id;
            group.storefrontBookId = storefrontId;
            await group.save();
        }

        await syncBooksToOfferGroup(group._id, idList, storefrontId);
        updated += 1;
    }

    return updated;
}

/** Fill missing thumbnails for plan PDF rows (Book 2, etc.) on download/library UIs. */
async function resolveDownloadThumbnails(books, hints = {}) {
    if (!books?.length) return [];

    const plain = books.map((b) => (b.toObject ? b.toObject() : { ...b }));
    const ids = plain.map((b) => b._id).filter(Boolean);

    let group = null;
    if (hints.offerGroupId && mongoose.Types.ObjectId.isValid(String(hints.offerGroupId))) {
        group = await BookOfferGroup.findById(hints.offerGroupId).lean();
    }
    if (!group) {
        const linked = plain.find((b) => b.offerGroupId);
        if (linked?.offerGroupId) {
            group = await BookOfferGroup.findById(linked.offerGroupId).lean();
        }
    }
    if (!group) {
        group = await BookOfferGroup.findOne({ 'options.bookIds': { $in: ids } }).lean();
    }

    let purchasedOptionThumb = '';
    if (group && hints.offerOptionId) {
        const purchased = (group.options || []).find(
            (opt) => String(opt._id) === String(hints.offerOptionId)
        );
        purchasedOptionThumb = String(purchased?.thumbnail || '').trim();
    }

    let storefrontThumb = '';
    if (group?.storefrontBookId) {
        const sf = await Book.findById(group.storefrontBookId).select('thumbnail').lean();
        storefrontThumb = String(sf?.thumbnail || '').trim();
    }

    const peerThumb = String(plain.find((b) => b.thumbnail)?.thumbnail || '').trim();

    const optionThumbForBook = (bookId) => {
        if (!group) return '';
        const opt = (group.options || []).find((o) =>
            (o.bookIds || []).some((id) => String(id) === String(bookId))
        );
        return String(opt?.thumbnail || '').trim();
    };

    return plain.map((b) => {
        const own = String(b.thumbnail || '').trim();
        const thumb =
            own ||
            optionThumbForBook(b._id) ||
            purchasedOptionThumb ||
            storefrontThumb ||
            peerThumb;
        return {
            id: b._id,
            title: b.title,
            author: b.author,
            thumbnail: thumb,
            fileUrl: b.fileUrl,
        };
    });
}

async function enrichDeliverableBookThumbnails() {
    const deliverables = await Book.find({
        isPlanDeliverable: true,
        $or: [{ thumbnail: { $exists: false } }, { thumbnail: '' }, { thumbnail: null }],
    }).select('_id');

    let updated = 0;
    for (const d of deliverables) {
        const group = await BookOfferGroup.findOne({ 'options.bookIds': d._id });
        if (!group?.storefrontBookId) continue;
        const sf = await Book.findById(group.storefrontBookId).select('thumbnail');
        const thumb = String(sf?.thumbnail || '').trim();
        if (!thumb) continue;
        await Book.updateOne({ _id: d._id }, { $set: { thumbnail: thumb } });
        updated += 1;
    }
    return updated;
}

async function syncBooksToOfferGroup(offerGroupId, bookIds, storefrontBookId) {
    const unique = parseBookObjectIds(bookIds);
    const storefront = parseBookObjectIds(
        storefrontBookId ? [storefrontBookId] : []
    )[0];

    if (storefront) {
        await Book.updateMany(
            { _id: storefront },
            {
                $set: {
                    offerGroupId,
                    isPlanDeliverable: false,
                },
            }
        );
    }

    const deliverableIds = unique.filter(
        (id) => !storefront || String(id) !== String(storefront)
    );
    if (deliverableIds.length) {
        await Book.updateMany(
            { _id: { $in: deliverableIds } },
            {
                $set: {
                    isPlanDeliverable: true,
                    listingStatus: 'draft',
                    offerGroupId: null,
                },
            }
        );
    }

    await Book.updateMany(
        {
            offerGroupId,
            isPlanDeliverable: true,
            _id: { $nin: unique },
        },
        { $set: { offerGroupId: null, isPlanDeliverable: false } }
    );
}

async function resolvePublishedOfferOption(offerGroupId, offerOptionId) {
    const group = await BookOfferGroup.findById(offerGroupId);
    if (!group || group.listingStatus !== 'published') {
        return null;
    }

    const option = group.options.id(offerOptionId);
    if (!option || !option.bookIds?.length) {
        return null;
    }

    const books = await Book.find({ _id: { $in: option.bookIds } });
    if (books.length !== option.bookIds.length) {
        return null;
    }
    if (books.some((b) => b.type !== 'ebook')) {
        return null;
    }

    return { group, option, books };
}

async function validateOfferPaymentAmount(offerGroupId, offerOptionId, amount) {
    const resolved = await resolvePublishedOfferOption(offerGroupId, offerOptionId);
    if (!resolved) {
        return { ok: false, message: 'Offer not found or unavailable' };
    }

    const { option } = resolved;
    const diff = Math.abs(Number(option.price) - Number(amount));
    if (diff > 0.02) {
        return {
            ok: false,
            message: 'Invalid amount. Price mismatch detected.',
            expected: option.price,
            received: amount,
        };
    }

    return { ok: true, ...resolved };
}

function bundleCompareFromPlanTiers(bundleOpt, allOptions) {
    const singles = (allOptions || [])
        .filter((o) => String(o._id) !== String(bundleOpt._id) && o.type !== 'bundle')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (singles.length < 2) return null;
    const total = singles.reduce((sum, o) => sum + Number(o.price || 0), 0);
    return total > Number(bundleOpt.price || 0) ? total : null;
}

function serializePublicOfferGroup(group, booksById) {
    const options = (group.options || [])
        .map((opt) => {
            const books = opt.bookIds
                .map((id) => booksById.get(String(id)))
                .filter(Boolean);
            if (!books.length) return null;

            const sumPrice = books.reduce((s, b) => s + Number(b.price || 0), 0);
            const planTierCompare =
                opt.type === 'bundle' ? bundleCompareFromPlanTiers(opt, group.options) : null;
            const compareAt =
                planTierCompare ??
                (opt.compareAtPrice != null && opt.compareAtPrice > 0
                    ? opt.compareAtPrice
                    : opt.type === 'bundle'
                      ? sumPrice
                      : null);

            return {
                id: opt._id,
                type: opt.type,
                bookIds: books.map((b) => b._id),
                label: opt.label,
                headline: opt.headline,
                cardTitle: opt.cardTitle || books.map((b) => b.title).join(' + '),
                thumbnail: opt.thumbnail || books[0]?.thumbnail || '',
                price: opt.price,
                compareAtPrice: compareAt,
                badge: opt.badge,
                footnote: opt.footnote,
                features:
                    opt.features?.length > 0
                        ? opt.features
                        : books.flatMap((b) => (b.whatYoullLearn || []).slice(0, 2)),
                highlighted: opt.highlighted,
                sortOrder: opt.sortOrder,
                books: books.map((b) => ({
                    id: b._id,
                    title: b.title,
                    author: b.author,
                    price: b.price,
                    thumbnail: b.thumbnail,
                    type: b.type,
                    fileUrl: b.fileUrl,
                })),
                planBooks: (opt.planBooks?.length
                    ? opt.planBooks
                    : books.map((b) => ({
                          bookId: b._id,
                          title: b.title,
                          fileUrl: b.fileUrl,
                      }))
                ).map((pb) => ({
                    bookId: pb.bookId,
                    title: pb.title,
                    fileUrl: pb.fileUrl,
                })),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
        id: group._id,
        heading: group.heading,
        subheading: group.subheading,
        options,
    };
}

/**
 * Validate book_cart `items` (array of book ids, duplicates allowed for quantity).
 * @param {string[]} itemIds
 * @param {number} finalAmount
 * @param {{ requireEbook?: boolean }} [opts]
 */
async function validateBookCartPayment(itemIds, finalAmount, opts = {}) {
    const ids = (Array.isArray(itemIds) ? itemIds : []).map((id) => String(id)).filter(Boolean);
    if (!ids.length) {
        return { ok: false, message: 'Cart is empty', expected: 0, received: finalAmount };
    }

    const uniqueIds = [...new Set(ids)];
    const books = await Book.find({ _id: { $in: uniqueIds } });
    const bookMap = new Map(books.map((b) => [String(b._id), b]));

    let total = 0;
    for (const id of ids) {
        const book = bookMap.get(id);
        if (!book) {
            return { ok: false, message: 'One or more books not found', expected: null, received: finalAmount };
        }
        if (opts.requireEbook && book.type !== 'ebook') {
            return {
                ok: false,
                message: 'Guest checkout is only for digital ebooks',
                expected: null,
                received: finalAmount,
            };
        }
        total += Number(book.price || 0);
    }

    const diff = Math.abs(total - Number(finalAmount));
    if (diff > 0.02) {
        return {
            ok: false,
            message: 'Invalid amount. Cart total mismatch.',
            expected: total,
            received: finalAmount,
            difference: diff,
        };
    }

    return { ok: true, books, uniqueIds, total };
}

/** Resolve listing cover for admin/creator UIs when thumbnail lives on offer plans. */
async function enrichAdminBookThumbnails(books) {
    if (!books?.length) return [];

    const plain = books.map((b) => (b.toObject ? b.toObject() : { ...b }));
    const bookIds = plain.map((b) => b._id).filter(Boolean);
    const offerGroupIds = plain.map((b) => b.offerGroupId).filter(Boolean);

    const groups = await BookOfferGroup.find({
        $or: [
            { _id: { $in: offerGroupIds } },
            { storefrontBookId: { $in: bookIds } },
            { 'options.bookIds': { $in: bookIds } },
        ],
    }).lean();

    const groupById = new Map(groups.map((g) => [String(g._id), g]));
    const groupByBookId = new Map();

    for (const group of groups) {
        if (group.storefrontBookId) {
            groupByBookId.set(String(group.storefrontBookId), group);
        }
        for (const opt of group.options || []) {
            for (const id of opt.bookIds || []) {
                if (!groupByBookId.has(String(id))) {
                    groupByBookId.set(String(id), group);
                }
            }
        }
    }

    const storefrontIds = [
        ...new Set(groups.map((g) => g.storefrontBookId).filter(Boolean).map(String)),
    ];
    const storefrontBooks = storefrontIds.length
        ? await Book.find({ _id: { $in: storefrontIds } }).select('_id thumbnail').lean()
        : [];
    const storefrontThumbById = new Map(
        storefrontBooks.map((b) => [String(b._id), String(b.thumbnail || '').trim()])
    );

    const pickOptionThumbnail = (group, bookId) => {
        if (!group?.options?.length) return '';
        const sorted = [...group.options].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );
        const matching = sorted.find((opt) =>
            (opt.bookIds || []).some((id) => String(id) === String(bookId))
        );
        const preferred = matching || sorted.find((opt) => String(opt.thumbnail || '').trim());
        return String(preferred?.thumbnail || sorted.find((opt) => opt.thumbnail)?.thumbnail || '').trim();
    };

    return plain.map((book) => {
        const own = String(book.thumbnail || '').trim();
        if (own) return book;

        const group =
            (book.offerGroupId && groupById.get(String(book.offerGroupId))) ||
            groupByBookId.get(String(book._id));
        if (!group) return book;

        const fromOption = pickOptionThumbnail(group, book._id);
        if (fromOption) return { ...book, thumbnail: fromOption };

        const fromStorefront = storefrontThumbById.get(String(group.storefrontBookId));
        if (fromStorefront) return { ...book, thumbnail: fromStorefront };

        return book;
    });
}

module.exports = {
    validateBookCartPayment,
    normalizeStringArray,
    normalizeOfferOptions,
    assertBooksOwnedByCreator,
    syncBooksToOfferGroup,
    migrateMarketplaceListings,
    enrichDeliverableBookThumbnails,
    enrichAdminBookThumbnails,
    resolveDownloadThumbnails,
    resolveOfferOptionsWithPlanBooks,
    ensureOfferGroupPlanBooksEmbeds,
    resolvePublishedOfferOption,
    validateOfferPaymentAmount,
    serializePublicOfferGroup,
};
