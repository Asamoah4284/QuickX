import { getMetaPixelId } from '../utils/metaPixel';

/** Noscript fallback — same URL as Meta’s base snippet. */
export default function MetaPixelNoscript() {
  const pixelId = getMetaPixelId();
  if (!pixelId) return null;

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        alt=""
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
