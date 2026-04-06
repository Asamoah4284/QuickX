/**
 * Rewrites direct S3 object URLs to CloudFront when VITE_CLOUDFRONT_URL is set.
 * Use the distribution domain from AWS → CloudFront → Distributions (e.g. https://dxxxx.cloudfront.net).
 * No trailing slash. Keeps bucket private while browsers load via CDN.
 */
export function publicAssetUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const cdn = import.meta.env.VITE_CLOUDFRONT_URL?.trim().replace(/\/$/, '');
  if (!cdn) return url;

  const trimmed = url.trim();
  if (trimmed.includes('.cloudfront.net')) return trimmed;

  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    // Virtual-hosted style: bucket.s3.region.amazonaws.com/key (presigned PUT result)
    const isVirtualHostedS3 =
      host.endsWith('.amazonaws.com') && /\.s3[.-]/i.test(host);
    if (isVirtualHostedS3 && u.pathname && u.pathname !== '/') {
      return `${cdn}${u.pathname}`;
    }
  } catch {
    return url;
  }
  return url;
}
