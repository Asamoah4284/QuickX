import axios from 'axios';
import { publicAssetUrl } from './publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function getPublicUrlFromSignedUrl(url) {
  return url.split('?')[0];
}

/**
 * Presigned PUT must use the exact same Content-Type as S3 was signed with.
 * Videos are often WebM/MOV/MP4 — backend now signs per MIME (not only video/mp4).
 */
function resolveContentType(file, type) {
  const name = (file.name || '').toLowerCase();
  const raw = (file.type || '').trim();

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

  if (raw.length > 0) {
    return raw;
  }
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
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

  const contentType = resolveContentType(file, type);
  const endpoint = type === 'video' ? '/s3VideoUrl' : '/s3Url';
  const { data } = await axios.get(`${API_URL}${endpoint}`, {
    params: { contentType },
    headers: getHeaders(token),
  });

  await putToPresignedUrl(data.url, file, contentType, onProgress);

  return publicAssetUrl(getPublicUrlFromSignedUrl(data.url));
}
