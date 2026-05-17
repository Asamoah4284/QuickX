import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiBook,
  FiEdit3,
  FiEye,
  FiMoreHorizontal,
  FiSend,
  FiTrash2,
  FiPlus,
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL;

const STATUS_FILTERS = ['all', 'draft', 'pending_review', 'published', 'rejected'];

const STATUS_STYLES = {
  draft:          'bg-slate-100 text-slate-600',
  pending_review: 'bg-amber-100 text-amber-700',
  published:      'bg-emerald-100 text-emerald-700',
  rejected:       'bg-rose-100 text-rose-700',
};

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-500';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
      {(status || 'draft').replace('_', ' ')}
    </span>
  );
}

function BookThumb({ url }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
        <FiBook className="h-5 w-5" />
      </div>
    );
  }
  return <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}

function BookRowActions({ book, navigate, runAction }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
      <button
        type="button"
        onClick={() => navigate(`/creator/dashboard/books/${book._id}/edit`)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <FiEdit3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Edit
      </button>

      {book.type === 'ebook' &&
        ['published', 'approved'].includes(book.listingStatus) &&
        book.fileUrl && (
        <a
          href={book.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <FiEye className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Preview
        </a>
      )}

      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
          <FiMoreHorizontal className="h-4 w-4" aria-hidden />
          <span className="sr-only">More actions</span>
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 ring-1 ring-slate-900/5 max-[480px]:left-0 max-[480px]:right-auto">
          {['draft', 'rejected'].includes(book.listingStatus) && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
              onClick={() => runAction(book._id, 'submit')}
            >
              <FiSend className="h-4 w-4 shrink-0" aria-hidden />
              Submit for review
            </button>
          )}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
            onClick={() => {
              if (window.confirm('Delete this book permanently? This cannot be undone.')) {
                runAction(book._id, 'delete');
              }
            }}
          >
            <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
            Delete
          </button>
        </div>
      </details>
    </div>
  );
}

export default function CreatorBooks() {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const loadBooks = useCallback(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError('');
    axios
      .get(`${API_URL}/api/instructor/books`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { status: activeFilter },
      })
      .then(({ data }) => setBooks(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [token, activeFilter]);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  const runAction = async (bookId, action) => {
    try {
      setMessage('');
      setError('');
      if (action === 'delete') {
        await axios.delete(`${API_URL}/api/instructor/books/${bookId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessage('Book deleted.');
      } else if (action === 'submit') {
        await axios.post(
          `${API_URL}/api/instructor/books/${bookId}/submit`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage('Book submitted for review.');
      }
      loadBooks();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">My Books</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Publish ebooks or hardcopy books. Each book goes through admin review before going live.
            </p>
          </div>
          <Link
            to="/creator/dashboard/books/new"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
          >
            <FiPlus className="h-4 w-4" aria-hidden />
            Add Book
          </Link>
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-5 sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 snap-start rounded-full px-3 py-1.5 text-xs font-medium capitalize transition sm:px-4 sm:py-2 sm:text-sm ${
                activeFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {message && <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error   && <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white sm:rounded-3xl">
        {loading ? (
          <div className="p-6 text-sm text-slate-500 sm:p-8">Loading books…</div>
        ) : books.length === 0 ? (
          <div className="m-4 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 sm:m-6 sm:p-10">
            No books found.{' '}
            <Link to="/creator/dashboard/books/new" className="font-medium text-blue-600 hover:underline">
              Add your first book
            </Link>
            .
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-3 sm:space-y-4 sm:p-4 md:hidden">
              {books.map((book) => (
                <article key={book._id} className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-3 sm:p-4">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <BookThumb url={book.thumbnail} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-slate-900 line-clamp-2">{book.title}</p>
                        <StatusBadge status={book.listingStatus} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{book.author} · {book.type}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
                        <div>
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Price</dt>
                          <dd className="font-medium text-slate-800">GH₵{Number(book.price || 0).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Category</dt>
                          <dd className="capitalize text-slate-700">{book.category || '—'}</dd>
                        </div>
                      </dl>
                      {book.listingStatus === 'rejected' && book.rejectionReason && (
                        <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700">
                          Rejected: {book.rejectionReason}
                        </p>
                      )}
                      <div className="mt-3 border-t border-slate-200/80 pt-3">
                        <BookRowActions book={book} navigate={navigate} runAction={runAction} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[700px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 pl-5">Book</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Price</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-4 py-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {books.map((book) => (
                    <tr key={book._id} className="group transition-colors hover:bg-slate-50/80">
                      <td className="py-4 pl-5 pr-2">
                        <div className="flex max-w-xs items-start gap-3">
                          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            <BookThumb url={book.thumbnail} />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <p className="line-clamp-2 font-semibold leading-snug text-slate-900">{book.title}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{book.author}</p>
                            {book.listingStatus === 'rejected' && book.rejectionReason && (
                              <p className="mt-1 text-xs text-rose-600">↳ {book.rejectionReason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-xs capitalize text-slate-600">{book.type}</td>
                      <td className="px-3 py-4"><StatusBadge status={book.listingStatus} /></td>
                      <td className="px-3 py-4 text-right tabular-nums font-medium text-slate-800">
                        GH₵{Number(book.price || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-4 capitalize text-slate-600">{book.category || '—'}</td>
                      <td className="py-4 pr-5 pl-2">
                        <BookRowActions book={book} navigate={navigate} runAction={runAction} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
