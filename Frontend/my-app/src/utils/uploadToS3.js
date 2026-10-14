import axios from 'axios';
import { publicAssetUrl } from './publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getHeaders(token) {
  const resolvedToken =
    token ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('token');
  return {
    Authorization: `Bearer ${resolvedToken}`,
  };
}

function getPublicUrlFromSignedUrl(url) {
  return url.split('?')[0];
}

/**
 * Mobile phones (especially iPhones) take 10-25MB photos or HEIC/HEIF files.
 * This helper resizes oversized camera photos and converts them to crisp, web-safe JPEGs
 * so mobile uploads are fast, reliable, and never trigger timeout/network aborts.
 */
async function optimizeImageForUpload(file) {
  if (!file || typeof window === 'undefined') return file;

  const rawType = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  // Keep GIF animations or SVG vector as is
  if (rawType === 'image/gif' || rawType === 'image/svg+xml' || name.endsWith('.gif') || name.endsWith('.svg')) {
    return file;
  }

  // If not an image (e.g. video, pdf), return unchanged
  const isImage = rawType.startsWith('image/') || /\.(png|jpe?g|webp|heic|heif|bmp|tiff)$/i.test(name);
  if (!isImage) {
    return file;
  }

  try {
    return await new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDimension = 2048; // crisp 2K for book covers and gallery
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = (file.name || 'photo.jpg').replace(/\.[^/.]+$/, '') + '.jpg';
            const optimized = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimized);
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  } catch {
    return file;
  }
}

/**
 * Presigned PUT must use the exact same Content-Type as S3 was signed with.
 * Videos are often WebM/MOV/MP4 — backend signs per MIME (not only video/mp4).
 */
function resolveContentType(file, type) {
  const name = (file.name || '').toLowerCase();
  const raw = (file.type || '').trim().toLowerCase();

  if (type === 'file') {
    if (raw.length > 0 && raw !== 'application/octet-stream') {
      return raw;
    }
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.epub')) return 'application/epub+zip';
    if (name.endsWith('.zip')) return 'application/zip';
    return 'application/octet-stream';
  }

  if (type === 'video') {
    if (raw.startsWith('video/')) {
      return raw;
    }
    if (raw === 'application/octet-stream' || !raw) {
      if (name.endsWith('.webm')) return 'video/webm';
      if (name.endsWith('.mov')) return 'video/quicktime';
      if (name.endsWith('.avi')) return 'video/x-msvideo';
      if (name.endsWith('.mkv')) return 'video/x-matroska';
      if (name.endsWith('.ogv')) return 'video/ogg';
      if (name.endsWith('.mp4')) return 'video/mp4';
    }
    return 'video/mp4';
  }

  // Normal image types
  if (raw === 'image/png' || name.endsWith('.png')) return 'image/png';
  if (raw === 'image/webp' || name.endsWith('.webp')) return 'image/webp';
  if (raw === 'image/gif' || name.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * PUT file to presigned S3 URL using XHR (only Content-Type header — required for SigV4).
 * Avoids axios adding headers that break the signature.
 */
function putToPresignedUrl(url, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('S3 upload network error'));
    xhr.send(file);
  });
}

export async function uploadFileToS3({ file, token, type = 'image', onProgress }) {
  if (!file) {
    return '';
  }

  // Optimize mobile and large images to avoid mobile network drops
  const uploadableFile = type === 'image' ? await optimizeImageForUpload(file) : file;
  const contentType = resolveContentType(uploadableFile, type);
  const endpoint = type === 'video' ? '/s3VideoUrl' : '/s3Url';

  const { data } = await axios.get(`${API_URL}${endpoint}`, {
    params: { contentType },
    headers: getHeaders(token),
  });

  if (!data?.url) {
    throw new Error('Failed to retrieve secure upload URL from server');
  }

  await putToPresignedUrl(data.url, uploadableFile, contentType, onProgress);

  // Return the public CloudFront CDN URL (never direct S3 bucket which is private)
  return publicAssetUrl(getPublicUrlFromSignedUrl(data.url));
}
