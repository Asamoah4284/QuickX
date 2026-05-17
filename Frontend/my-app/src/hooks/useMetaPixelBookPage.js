import { useEffect } from 'react';
import {
  ensureMetaPixel,
  isMetaPixelEnabledForBook,
  trackMetaPageView,
  trackMetaViewContent,
} from '../utils/metaPixel';

/**
 * Fires Meta Pixel PageView + ViewContent when a book about page loads.
 * Only runs when VITE_META_PIXEL_ID is set and bookId passes allowlist (if configured).
 */
export function useMetaPixelBookPage(book, bookId) {
  useEffect(() => {
    if (!book || !isMetaPixelEnabledForBook(bookId)) return;

    ensureMetaPixel();
    trackMetaPageView();
    trackMetaViewContent(book);
  }, [book, bookId]);
}
