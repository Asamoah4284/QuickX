/**
 * In-app offline lesson video storage (OPFS preferred, IndexedDB fallback).
 * Keys: courseId + lessonId → blob/file + metadata.
 */

const DB_NAME = 'quickx-offline-lessons';
const DB_VERSION = 1;
const STORE_NAME = 'lessons';
const META_STORE = 'meta';
const OPFS_ROOT = 'offline-lessons';
const SOFT_CAP_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

function storageKey(courseId, lessonId) {
  return `${String(courseId)}::${String(lessonId)}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(record) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await idbRequest(tx.objectStore(STORE_NAME).put(record));
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const result = await idbRequest(tx.objectStore(STORE_NAME).get(key));
  db.close();
  return result || null;
}

async function idbDelete(key) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await idbRequest(tx.objectStore(STORE_NAME).delete(key));
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGetAll() {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const result = await idbRequest(tx.objectStore(STORE_NAME).getAll());
  db.close();
  return result || [];
}

function supportsOpfs() {
  return typeof navigator !== 'undefined'
    && navigator.storage
    && typeof navigator.storage.getDirectory === 'function';
}

async function getOpfsLessonDir(create = false) {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_ROOT, { create });
}

async function opfsWrite(key, blob) {
  const dir = await getOpfsLessonDir(true);
  const safeName = key.replace(/[^a-zA-Z0-9._-]/g, '_');
  const handle = await dir.getFileHandle(safeName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return safeName;
}

async function opfsReadBlob(fileName) {
  const dir = await getOpfsLessonDir(false);
  const handle = await dir.getFileHandle(fileName);
  const file = await handle.getFile();
  return file;
}

async function opfsDelete(fileName) {
  try {
    const dir = await getOpfsLessonDir(false);
    await dir.removeEntry(fileName);
  } catch {
    // ignore missing
  }
}

export async function estimateQuota() {
  if (!navigator?.storage?.estimate) {
    return { usage: 0, quota: 0, remaining: Infinity, softCapBytes: SOFT_CAP_BYTES };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return {
    usage,
    quota,
    remaining: Math.max(0, quota - usage),
    softCapBytes: SOFT_CAP_BYTES,
  };
}

export async function isDownloaded(courseId, lessonId) {
  const record = await idbGet(storageKey(courseId, lessonId));
  return Boolean(record?.blob || record?.opfsFileName);
}

export async function getLessonRecord(courseId, lessonId) {
  return idbGet(storageKey(courseId, lessonId));
}

/**
 * @returns {Promise<string|null>} blob: or file object URL for <video>
 */
export async function getBlobUrl(courseId, lessonId) {
  const record = await idbGet(storageKey(courseId, lessonId));
  if (!record) return null;

  if (record.offlineLicenseExpiresAt) {
    const exp = Date.parse(record.offlineLicenseExpiresAt);
    if (Number.isFinite(exp) && Date.now() > exp) {
      return null;
    }
  }

  try {
    if (record.opfsFileName && supportsOpfs()) {
      const file = await opfsReadBlob(record.opfsFileName);
      return URL.createObjectURL(file);
    }
    if (record.blob instanceof Blob) {
      return URL.createObjectURL(record.blob);
    }
  } catch (err) {
    console.error('getBlobUrl failed:', err);
  }
  return null;
}

export function revokeBlobUrl(url) {
  if (url && String(url).startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
}

/**
 * Save a downloaded lesson video.
 * @param {object} opts
 * @param {string} opts.courseId
 * @param {string} opts.lessonId
 * @param {Blob} opts.blob
 * @param {string} [opts.courseTitle]
 * @param {string} [opts.lessonTitle]
 * @param {string} [opts.remoteUrl]
 * @param {string} [opts.mimeType]
 * @param {string} [opts.offlineLicense]
 * @param {string} [opts.offlineLicenseExpiresAt]
 * @param {(pct: number) => void} [opts.onProgress] — only used by callers during fetch; here marks 100
 */
export async function saveLesson({
  courseId,
  lessonId,
  blob,
  courseTitle = '',
  lessonTitle = '',
  remoteUrl = '',
  mimeType = '',
  offlineLicense = '',
  offlineLicenseExpiresAt = '',
}) {
  if (!(blob instanceof Blob)) {
    throw new Error('Invalid video blob');
  }

  const key = storageKey(courseId, lessonId);
  const size = blob.size;
  const quota = await estimateQuota();
  if (quota.remaining < size + 5 * 1024 * 1024) {
    throw new Error('Not enough device storage for this download. Free up space and try again.');
  }
  if (quota.usage + size > SOFT_CAP_BYTES) {
    throw new Error('Offline library is near the 2 GB limit. Remove older downloads first.');
  }

  let opfsFileName = null;
  let storedBlob = null;

  if (supportsOpfs()) {
    try {
      opfsFileName = await opfsWrite(key, blob);
    } catch (err) {
      console.warn('OPFS write failed, falling back to IndexedDB:', err);
      storedBlob = blob;
    }
  } else {
    storedBlob = blob;
  }

  const record = {
    key,
    courseId: String(courseId),
    lessonId: String(lessonId),
    courseTitle,
    lessonTitle,
    remoteUrl,
    mimeType: mimeType || blob.type || 'video/mp4',
    size,
    downloadedAt: new Date().toISOString(),
    offlineLicense,
    offlineLicenseExpiresAt,
    opfsFileName,
    blob: storedBlob,
  };

  await idbPut(record);
  return {
    key,
    courseId: record.courseId,
    lessonId: record.lessonId,
    courseTitle,
    lessonTitle,
    size,
    downloadedAt: record.downloadedAt,
    mimeType: record.mimeType,
  };
}

export async function deleteLesson(courseId, lessonId) {
  const key = storageKey(courseId, lessonId);
  const existing = await idbGet(key);
  if (existing?.opfsFileName && supportsOpfs()) {
    await opfsDelete(existing.opfsFileName);
  }
  await idbDelete(key);
}

export async function listDownloads() {
  const rows = await idbGetAll();
  return rows
    .map((r) => ({
      key: r.key,
      courseId: r.courseId,
      lessonId: r.lessonId,
      courseTitle: r.courseTitle || '',
      lessonTitle: r.lessonTitle || '',
      size: r.size || 0,
      downloadedAt: r.downloadedAt,
      mimeType: r.mimeType,
      offlineLicenseExpiresAt: r.offlineLicenseExpiresAt || null,
    }))
    .sort((a, b) => String(b.downloadedAt || '').localeCompare(String(a.downloadedAt || '')));
}

export async function listDownloadsForCourse(courseId) {
  const all = await listDownloads();
  return all.filter((r) => String(r.courseId) === String(courseId));
}

/**
 * Fetch a remote video into a Blob with progress callbacks.
 * Prefers streaming read; falls back to arrayBuffer for stubborn browsers.
 * @param {string} url
 * @param {(pct: number, loaded: number, total: number) => void} [onProgress]
 * @param {RequestInit} [fetchOptions]
 */
export async function fetchVideoBlob(url, onProgress, fetchOptions = {}) {
  const headers = { ...(fetchOptions.headers || {}) };
  const signal = fetchOptions.signal;

  // Prefer axios when available in the app — better progress + auth on large bodies.
  // Dynamic import keeps this util usable outside React.
  try {
    const axiosMod = await import('axios');
    const axios = axiosMod.default || axiosMod;
    const res = await axios.get(url, {
      responseType: 'blob',
      timeout: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers,
      signal,
      onDownloadProgress: (event) => {
        if (!onProgress) return;
        const total = Number(event.total) || 0;
        const loaded = Number(event.loaded) || 0;
        const pct = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
        onProgress(pct, loaded, total);
      },
      validateStatus: (s) => s >= 200 && s < 300,
    });
    const blob = res.data instanceof Blob
      ? res.data
      : new Blob([res.data], { type: res.headers['content-type'] || 'video/mp4' });
    if (!blob || blob.size < 64) {
      throw new Error('Download returned an empty file. Try again on Wi‑Fi.');
    }
    if (onProgress) onProgress(100, blob.size, blob.size);
    return blob;
  } catch (axiosErr) {
    if (
      axiosErr?.code === 'ERR_CANCELED' ||
      axiosErr?.name === 'CanceledError' ||
      axiosErr?.name === 'AbortError' ||
      signal?.aborted
    ) {
      const err = new Error('Download cancelled');
      err.name = 'AbortError';
      err.cancelled = true;
      throw err;
    }
    // If axios missing or network error, fall through to fetch
    if (axiosErr?.response?.data instanceof Blob) {
      try {
        const text = await axiosErr.response.data.text();
        const parsed = JSON.parse(text);
        if (parsed?.message) {
          const err = new Error(parsed.message);
          err.status = axiosErr.response.status;
          throw err;
        }
      } catch (inner) {
        if (inner.status) throw inner;
      }
    }
    if (axiosErr?.response?.data?.message) {
      const err = new Error(axiosErr.response.data.message);
      err.status = axiosErr.response.status;
      throw err;
    }
    // Continue to fetch fallback only for non-HTTP axios failures / missing axios
    if (axiosErr?.response?.status) {
      throw new Error(
        axiosErr.response?.data?.message ||
          axiosErr.message ||
          `Download failed (${axiosErr.response.status}).`
      );
    }
  }

  const res = await fetch(url, {
    mode: 'cors',
    credentials: 'omit',
    ...fetchOptions,
    headers,
    signal,
  });
  if (!res.ok) {
    let message = `Download failed (${res.status}). Check your connection and try again.`;
    try {
      const data = await res.clone().json();
      if (data?.message) message = data.message;
    } catch {
      // ignore non-JSON
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || typeof res.body.getReader !== 'function') {
    const blob = await res.blob();
    if (!blob || blob.size < 64) {
      throw new Error('Download returned an empty file. Try again on Wi‑Fi.');
    }
    if (onProgress) onProgress(100, blob.size, blob.size);
    return blob;
  }

  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;

  try {
    while (true) {
      if (signal?.aborted) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }
        const err = new Error('Download cancelled');
        err.name = 'AbortError';
        err.cancelled = true;
        throw err;
      }
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      if (onProgress) {
        const pct = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
        onProgress(pct, loaded, total);
      }
    }
  } catch (readErr) {
    if (readErr?.name === 'AbortError' || signal?.aborted || readErr?.cancelled) {
      const err = new Error('Download cancelled');
      err.name = 'AbortError';
      err.cancelled = true;
      throw err;
    }
    throw readErr;
  }

  const contentType = res.headers.get('content-type') || 'video/mp4';
  const blob = new Blob(chunks, { type: contentType });
  if (!blob || blob.size < 64) {
    throw new Error('Download returned an empty file. Try again on Wi‑Fi.');
  }
  if (onProgress) onProgress(100, loaded, total || loaded);
  return blob;
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export { SOFT_CAP_BYTES };
