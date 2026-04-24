import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiSave, FiSend } from 'react-icons/fi';
import { uploadFileToS3 } from '../../utils/uploadToS3';

const API_URL = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  title: '',
  author: '',
  description: '',
  type: 'ebook',
  price: 0,
  category: 'general',
  fileUrl: '',
  thumbnail: '',
  isbn: '',
  stock: 0,
  deliveryFee: 0,
};

const inputCls =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300';

export default function CreatorBookWizard() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const isEditing = Boolean(bookId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ ebook: 0, thumbnail: 0 });
  const thumbnailInputRef = useRef(null);
  const ebookInputRef = useRef(null);

  // Load existing book if editing
  useEffect(() => {
    if (!isEditing) return;
    axios
      .get(`${API_URL}/api/instructor/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        setForm({
          title: data.title || '',
          author: data.author || '',
          description: data.description || '',
          type: data.type || 'ebook',
          price: data.price ?? 0,
          category: data.category || 'general',
          fileUrl: data.fileUrl || '',
          thumbnail: data.thumbnail || '',
          isbn: data.isbn || '',
          stock: data.stock ?? 0,
          deliveryFee: data.deliveryFee ?? 0,
        });
      })
      .catch((e) => setError(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, [bookId, isEditing, token]);

  const handleChange = (e) => {
    const { name, value, type: inputType } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: inputType === 'number' ? Number(value) : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (isEditing) {
        await axios.patch(`${API_URL}/api/instructor/books/${bookId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Book saved successfully.');
      } else {
        const { data } = await axios.post(`${API_URL}/api/instructor/books`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccess('Draft created! You can now submit it for review.');
        navigate(`/creator/dashboard/books/${data._id}/edit`, { replace: true });
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEbookUpload = async (file) => {
    if (!file) return;
    setError('');
    setSuccess('');
    try {
      const url = await uploadFileToS3({
        file,
        token,
        type: 'file',
        onProgress: (pct) => setUploadProgress((cur) => ({ ...cur, ebook: pct })),
      });
      setForm((prev) => ({ ...prev, fileUrl: url }));
      setSuccess('E-book uploaded successfully.');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setUploadProgress((cur) => ({ ...cur, ebook: 0 }));
    }
  };

  const handleThumbnailUpload = async (file) => {
    if (!file) return;
    setError('');
    setSuccess('');
    try {
      const url = await uploadFileToS3({
        file,
        token,
        type: 'image',
        onProgress: (pct) => setUploadProgress((cur) => ({ ...cur, thumbnail: pct })),
      });
      setForm((prev) => ({ ...prev, thumbnail: url }));
      setSuccess('Thumbnail uploaded successfully.');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setUploadProgress((cur) => ({ ...cur, thumbnail: 0 }));
    }
  };

  const handleSubmitForReview = async () => {
    if (!isEditing) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await axios.post(
        `${API_URL}/api/instructor/books/${bookId}/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Submitted for admin review! We\'ll notify you once it\'s reviewed.');
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500">Loading book…</div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
        <button
          type="button"
          onClick={() => navigate('/creator/dashboard/books')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition"
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden />
          Back to My Books
        </button>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          {isEditing ? 'Edit Book' : 'Add New Book'}
        </h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Fill in the details below. Save as a draft first, then submit for review when ready.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Basic Information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Title <span className="text-rose-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputCls} placeholder="e.g. Mastering Forex Trading" />
            </div>
            <div>
              <label className={labelCls}>Author <span className="text-rose-500">*</span></label>
              <input name="author" value={form.author} onChange={handleChange} required className={inputCls} placeholder="Your full name or pen name" />
            </div>
            <div>
              <label className={labelCls}>ISBN (optional)</label>
              <input name="isbn" value={form.isbn} onChange={handleChange} className={inputCls} placeholder="978-3-16-148410-0" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description <span className="text-rose-500">*</span></label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={4}
                className={inputCls}
                placeholder="Describe what readers will learn from this book…"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Pricing & Type</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Book Type <span className="text-rose-500">*</span></label>
              <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                <option value="ebook">E-book</option>
                <option value="hardcopy">Hardcopy</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Price (GHS) <span className="text-rose-500">*</span></label>
              <input type="number" name="price" min={0} step={0.01} value={form.price} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                <option value="general">General</option>
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>

            {form.type === 'hardcopy' && (
              <>
                <div>
                  <label className={labelCls}>Stock (units)</label>
                  <input type="number" name="stock" min={0} value={form.stock} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Delivery Fee (GHS)</label>
                  <input type="number" name="deliveryFee" min={0} step={0.01} value={form.deliveryFee} onChange={handleChange} className={inputCls} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Media & Files</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Thumbnail image</label>
              <div className="mt-1 flex flex-col gap-2">
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleThumbnailUpload(e.target.files?.[0])}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Upload thumbnail
                </button>
                {uploadProgress.thumbnail > 0 ? (
                  <p className="text-xs font-medium text-slate-600">
                    Uploading… {uploadProgress.thumbnail}%
                  </p>
                ) : null}
                {form.thumbnail ? (
                  <div className="flex flex-col gap-2">
                    <img
                      src={form.thumbnail}
                      alt="Thumbnail preview"
                      className="h-28 w-24 rounded-xl border border-slate-200 object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, thumbnail: '' }))}
                      className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Remove thumbnail
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Upload a JPG/PNG/WebP. The URL will be filled in automatically.</p>
                )}
              </div>
              <input
                name="thumbnail"
                value={form.thumbnail}
                onChange={handleChange}
                className="sr-only"
                readOnly={uploadProgress.thumbnail > 0}
              />
            </div>
            {form.type === 'ebook' && (
              <div>
                <label className={labelCls}>E-book file <span className="text-rose-500">*</span></label>
                <div className="mt-1 flex flex-col gap-2">
                  <input
                    ref={ebookInputRef}
                    type="file"
                    accept=".pdf,.epub,application/pdf,application/epub+zip"
                    onChange={(e) => handleEbookUpload(e.target.files?.[0])}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => ebookInputRef.current?.click()}
                    className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Upload e-book
                  </button>
                  {uploadProgress.ebook > 0 ? (
                    <p className="text-xs font-medium text-slate-600">Uploading… {uploadProgress.ebook}%</p>
                  ) : null}
                  {form.fileUrl ? (
                    <div className="flex flex-col gap-2">
                      <a
                        href={form.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-xs font-medium text-blue-700 hover:underline"
                      >
                        {form.fileUrl}
                      </a>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, fileUrl: '' }))}
                        className="w-fit rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Upload a PDF or EPUB. Then click “Save Draft” to store it.</p>
                  )}
                </div>
                <input
                  name="fileUrl"
                  value={form.fileUrl}
                  onChange={handleChange}
                  required={form.type === 'ebook'}
                  className="sr-only"
                  readOnly={uploadProgress.ebook > 0}
                />
              </div>
            )}
          </div>
        </div>

        {/* Feedback messages */}
        {error   && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <FiSave className="h-4 w-4" aria-hidden />
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Draft'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <FiSend className="h-4 w-4" aria-hidden />
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/creator/dashboard/books')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
