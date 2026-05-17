import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FiBookOpen, FiDownload, FiAlertCircle, FiCheck, FiExternalLink } from 'react-icons/fi';
import { publicAssetUrl } from '../utils/publicAssetUrl';

function resolveAssetUrl(raw, apiUrl) {
  if (!raw) return '';
  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
  if (!s) return '';
  if (s.startsWith('http')) return publicAssetUrl(s);
  if (s.startsWith('/') && apiUrl) return publicAssetUrl(`${apiUrl}${s}`);
  return publicAssetUrl(s);
}

function BookDownloadRow({ book, apiUrl }) {
  const fileHref = resolveAssetUrl(book.fileUrl, apiUrl);
  const thumbHref = resolveAssetUrl(book.thumbnail, apiUrl);

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex gap-5">
        <div className="shrink-0">
          {thumbHref ? (
            <img
              src={thumbHref}
              alt=""
              className="h-[7.5rem] w-[5.5rem] rounded-xl object-contain bg-slate-50 ring-1 ring-slate-100"
            />
          ) : (
            <div
              className="flex h-[7.5rem] w-[5.5rem] items-center justify-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-100"
              aria-hidden
            >
              <FiBookOpen className="h-9 w-9" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{book.title}</h2>
          {book.author ? (
            <p className="mt-1 text-sm text-slate-500">By {book.author}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <a
              href={fileHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <FiExternalLink className="h-4 w-4 opacity-60" aria-hidden />
              View
            </a>
            <a
              href={fileHref}
              download
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <FiDownload className="h-4 w-4" aria-hidden />
              Download
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BookGuestDownload() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || '';
  const email = searchParams.get('email') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [books, setBooks] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!reference) {
      setError('Missing payment reference. Use the link from your checkout confirmation.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const params = email ? { email } : {};
        const { data } = await axios.get(
          `${API_URL}/api/payments/guest-download/${encodeURIComponent(reference)}`,
          { params }
        );
        if (cancelled) return;
        if (!data?.success || !Array.isArray(data.books) || data.books.length === 0) {
          setError('No downloadable books were found for this purchase.');
          return;
        }
        setBooks(data.books);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Could not load your download. Check your email and payment reference.';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [API_URL, reference, email]);

  const subtitle = loading
    ? 'Preparing your download…'
    : books.length > 1
      ? 'Your ebooks are ready to download.'
      : 'Your ebook is ready to download.';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/60">
          {/* Header */}
          <header className="border-b border-slate-100 px-6 pb-8 pt-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <FiCheck className="h-6 w-6 stroke-[2.5]" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Payment successful
            </h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </header>

          <div className="px-6 pb-8 pt-6 sm:px-8">
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <div
                  className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
                  aria-hidden
                />
                <p className="mt-4 text-sm text-slate-500">Loading your book…</p>
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-center">
                <FiAlertCircle className="mx-auto h-8 w-8 text-amber-500" aria-hidden />
                <p className="mt-3 font-medium text-slate-900">Unable to load download</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{error}</p>
                {reference ? (
                  <p className="mt-3 break-all font-mono text-xs text-slate-400">{reference}</p>
                ) : null}
                <Link
                  to="/store"
                  className="mt-5 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Back to store
                </Link>
              </div>
            ) : null}

            {!loading && !error && books.length > 0 ? (
              <ul className="space-y-4">
                {books.map((book) => (
                  <li key={String(book.id)}>
                    <BookDownloadRow book={book} apiUrl={API_URL} />
                  </li>
                ))}
              </ul>
            ) : null}

            {!loading && !error ? (
              <footer className="mt-8 space-y-4 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm leading-relaxed text-slate-500">
                  Save this page or your payment reference to download again later.
                </p>
                <p className="text-sm text-slate-500">
                  <Link
                    to="/register"
                    className="font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                  >
                    Create an account
                  </Link>{' '}
                  to keep all purchases in your dashboard.
                </p>
                <Link
                  to="/store"
                  className="inline-block text-sm font-semibold text-slate-800 transition hover:text-slate-950"
                >
                  Browse more books
                </Link>
              </footer>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
