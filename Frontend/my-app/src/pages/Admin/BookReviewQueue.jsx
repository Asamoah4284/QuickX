import { useEffect, useState } from 'react';
import axios from 'axios';
import { FiBook } from 'react-icons/fi';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import StatusBadge from '../../components/creator/StatusBadge';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL;

function resolveBookThumbnailUrl(thumbnail) {
  if (!thumbnail) return '';
  const raw = typeof thumbnail === 'string' ? thumbnail.trim() : String(thumbnail).trim();
  if (!raw) return '';
  if (raw.startsWith('http')) return publicAssetUrl(raw);
  if (raw.startsWith('/') && API_URL) return publicAssetUrl(`${API_URL}${raw}`);
  return publicAssetUrl(raw);
}

function BookReviewThumb({ thumbnail, title }) {
  const [failed, setFailed] = useState(false);
  const src = resolveBookThumbnailUrl(thumbnail);

  if (!src || failed) {
    return (
      <div className="-mt-1 flex h-14 w-10 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400">
        <FiBook className="h-4 w-4" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title ? `Cover: ${title}` : 'Book cover'}
      className="-mt-1 h-14 w-10 rounded-lg border border-slate-200 object-cover bg-slate-50"
      onError={() => setFailed(true)}
    />
  );
}

export default function BookReviewQueue() {
  const adminToken = localStorage.getItem('adminToken');
  const [books, setBooks] = useState([]);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending_review');

  const loadBooks = () => {
    axios
      .get(`${API_URL}/api/admin/books`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      .then(({ data }) => {
        const all = Array.isArray(data) ? data : [];
        // Admin books endpoint returns all books (admin + instructor). This screen is for instructor workflow.
        setBooks(all.filter((b) => b?.source === 'instructor'));
      });
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const reviewBook = async (bookId, action) => {
    const rejectionReason =
      action === 'reject'
        ? window.prompt('Reason for rejection (optional):', 'Does not meet guidelines') || ''
        : undefined;

    await axios.patch(
      `${API_URL}/api/admin/books/${bookId}/review`,
      { action, rejectionReason },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    setMessage(`Book ${action}d successfully.`);
    loadBooks();
  };

  const visibleBooks = books.filter((book) => book.listingStatus === activeTab);

  return (
    <>
      <AdminSectionHeader
        title="Book review queue"
        description="Review creator-submitted books. Approve to publish in the store, or reject with a reason so the creator can fix it."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-gray-900 shadow-sm">
        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { key: 'pending_review', label: 'Pending review' },
            { key: 'published', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'draft', label: 'Drafts' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {visibleBooks.map((book) => (
            <div key={book._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <BookReviewThumb thumbnail={book.thumbnail} title={book.title} />

                  <div>
                    <p className="text-lg font-semibold text-gray-900">{book.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {book.author} · {book.type} · {book.category || 'general'}
                      {' · '}
                      GH₵{Number(book.price || 0).toLocaleString()}
                      {book.type === 'ebook' && book.hardcopyPrice != null && book.hardcopyPrice !== ''
                        ? ` · Hardcopy GH₵${Number(book.hardcopyPrice).toLocaleString()}`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Submitted by {book.createdBy?.fullName || 'Creator'} ({book.createdBy?.email || '—'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={book.listingStatus} />
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-600">{book.description}</p>

              {book.type === 'ebook' && book.fileUrl ? (
                <a
                  href={book.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-blue-700 hover:underline break-all"
                >
                  View uploaded e-book file
                </a>
              ) : null}

              {book.listingStatus === 'pending_review' ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => reviewBook(book._id, 'approve')}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewBook(book._id, 'reject')}
                    className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          {visibleBooks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
              No books found for this tab.
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

