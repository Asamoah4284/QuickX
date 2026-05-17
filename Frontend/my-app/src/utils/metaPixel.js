/**
 * Meta (Facebook) Pixel — official loader + fbq API.
 * Default pixel: 1187997587726082 (override with VITE_META_PIXEL_ID).
 * Book pages: optional allowlist via VITE_META_PIXEL_BOOK_IDS (comma-separated Mongo ids).
 */

const PIXEL_ID =
  import.meta.env.VITE_META_PIXEL_ID?.trim() || '1187997587726082';

let scriptInjected = false;
let pixelInitialized = false;

export function getMetaPixelId() {
  return PIXEL_ID;
}

export function isMetaPixelConfigured() {
  return Boolean(PIXEL_ID);
}

/** When VITE_META_PIXEL_BOOK_IDS is empty, all /store/:bookId pages fire the pixel. */
export function isMetaPixelEnabledForBook(bookId) {
  if (!PIXEL_ID || bookId == null) return false;
  const allowlist = import.meta.env.VITE_META_PIXEL_BOOK_IDS?.trim();
  if (!allowlist) return true;
  const ids = allowlist.split(',').map((s) => s.trim()).filter(Boolean);
  return ids.includes(String(bookId));
}

/** Official Meta Pixel bootstrap (same as Facebook’s base snippet). */
function injectMetaPixelScript() {
  if (scriptInjected || typeof window === 'undefined' || !PIXEL_ID) return;
  scriptInjected = true;

  if (window.fbq) return;

  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
}

export function ensureMetaPixel() {
  if (!PIXEL_ID || typeof window === 'undefined') return false;

  injectMetaPixelScript();

  if (!pixelInitialized && typeof window.fbq === 'function') {
    window.fbq('init', PIXEL_ID);
    pixelInitialized = true;
  }

  return typeof window.fbq === 'function';
}

export function trackMetaEvent(eventName, params) {
  if (!ensureMetaPixel()) return;
  if (params != null) {
    window.fbq('track', eventName, params);
  } else {
    window.fbq('track', eventName);
  }
}

export function trackMetaPageView() {
  trackMetaEvent('PageView');
}

export function trackMetaViewContent(book) {
  if (!book) return;
  trackMetaEvent('ViewContent', {
    content_name: book.title || 'Book',
    content_ids: [String(book._id || book.id || '')],
    content_type: 'product',
    value: Number(book.price) || 0,
    currency: 'GHS',
  });
}

export function trackMetaInitiateCheckout(book) {
  if (!book) return;
  trackMetaEvent('InitiateCheckout', {
    content_name: book.title || 'Book',
    content_ids: [String(book._id || book.id || '')],
    content_type: 'product',
    value: Number(book.price) || 0,
    currency: 'GHS',
    num_items: 1,
  });
}
