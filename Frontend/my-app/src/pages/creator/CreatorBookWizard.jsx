import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiImage, FiPlus, FiSave, FiSend, FiTrash2, FiX } from 'react-icons/fi';
import { uploadFileToS3 } from '../../utils/uploadToS3';
import CreatorBookOfferSection from '../../components/creator/CreatorBookOfferSection';

const API_URL = import.meta.env.VITE_API_URL;

const EMPTY_TESTIMONIAL = { tagline: '', quote: '', name: '', role: '', image: '' };

const EMPTY_FORM = {
  title: '',
  author: '',
  description: '',
  whatYoullLearn: '',
  afterReadingOutcomes: '',
  testimonials: [],
  type: 'ebook',
  price: 0,
  hardcopyPrice: '',
  category: 'general',
  fileUrl: '',
  thumbnail: '',
  isbn: '',
  stock: 0,
  deliveryFee: 0,
};

function textToList(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToText(value) {
  if (!Array.isArray(value)) return '';
  return value.filter(Boolean).join('\n');
}

function normalizeTestimonialsForSave(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((t) => ({
      tagline: String(t?.tagline || '').trim(),
      quote: String(t?.quote || '').trim(),
      name: String(t?.name || '').trim(),
      role: String(t?.role || '').trim(),
      image: String(t?.image || '').trim(),
    }))
    .filter((t) => t.quote);
}

function buildBookPayload(form) {
  const {
    whatYoullLearn,
    afterReadingOutcomes,
    testimonials,
    hardcopyPrice,
    fileUrl,
    stock,
    deliveryFee,
    ...rest
  } = form;
  const payload = {
    ...rest,
    whatYoullLearn: textToList(whatYoullLearn),
    afterReadingOutcomes: textToList(afterReadingOutcomes),
    testimonials: normalizeTestimonialsForSave(testimonials),
  };
  if (form.type === 'ebook') {
    if (fileUrl) payload.fileUrl = fileUrl;
    const hc = String(hardcopyPrice ?? '').trim();
    payload.hardcopyPrice = hc === '' ? null : Number(hardcopyPrice);
  } else {
    payload.stock = stock;
    payload.deliveryFee = deliveryFee;
  }
  return payload;
}

function readApiError(err) {
  return (
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    'Something went wrong'
  );
}

const inputCls =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-300';

export default function CreatorBookWizard() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const isEditing = Boolean(bookId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [listingStatus, setListingStatus] = useState('draft');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ thumbnail: 0 });
  const [testimonialUploads, setTestimonialUploads] = useState({});
  const thumbnailInputRef = useRef(null);
  const testimonialInputRefs = useRef({});
  const offerSectionRef = useRef(null);

  // Load existing book if editing
  useEffect(() => {
    if (!isEditing) return;
    axios
      .get(`${API_URL}/api/instructor/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        setListingStatus(data.listingStatus || 'draft');
        setForm({
          title: data.title || '',
          author: data.author || '',
          description: data.description || '',
          whatYoullLearn: listToText(data.whatYoullLearn),
          afterReadingOutcomes: listToText(data.afterReadingOutcomes),
          testimonials: Array.isArray(data.testimonials)
            ? data.testimonials.map((t) => ({
                tagline: t.tagline || '',
                quote: t.quote || '',
                name: t.name || '',
                role: t.role || '',
                image: t.image || '',
              }))
            : [],
          type: data.type || 'ebook',
          price: data.price ?? 0,
          hardcopyPrice: data.hardcopyPrice ?? '',
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

  const saveOfferPlans = async (savedBookId) => {
    if (!savedBookId || !offerSectionRef.current?.getPayload) return;

    if (form.type === 'ebook') {
      const planError = offerSectionRef.current.validatePlans?.();
      if (planError) {
        throw new Error(planError);
      }
    }

    const payload = offerSectionRef.current.getPayload(savedBookId);
    if (!payload?.enabled) {
      if (form.type === 'ebook') {
        throw new Error('Enable purchase plans and upload a PDF for each book.');
      }
      await axios.put(
        `${API_URL}/api/instructor/book-offers/by-book/${savedBookId}`,
        { enabled: false, options: [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return;
    }
    if (!payload.options?.length) {
      throw new Error('Turn off the plan picker or add at least one purchase option.');
    }
    await axios.put(`${API_URL}/api/instructor/book-offers/by-book/${savedBookId}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const handleChange = (e) => {
    const { name, value, type: inputType } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        inputType === 'number'
          ? value === '' && name === 'hardcopyPrice'
            ? ''
            : Number(value)
          : value,
    }));
  };

  const addTestimonial = () => {
    setForm((prev) => ({
      ...prev,
      testimonials: [...(prev.testimonials || []), { ...EMPTY_TESTIMONIAL }],
    }));
  };

  const updateTestimonial = (index, field, value) => {
    setForm((prev) => {
      const list = [...(prev.testimonials || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, testimonials: list };
    });
  };

  const removeTestimonial = (index) => {
    setForm((prev) => ({
      ...prev,
      testimonials: (prev.testimonials || []).filter((_, i) => i !== index),
    }));
    setTestimonialUploads((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleTestimonialImageUpload = async (index, file) => {
    if (!file) return;
    setError('');
    setSuccess('');
    try {
      const url = await uploadFileToS3({
        file,
        token,
        type: 'image',
        onProgress: (pct) =>
          setTestimonialUploads((prev) => ({ ...prev, [index]: pct })),
      });
      updateTestimonial(index, 'image', url);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setTestimonialUploads((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = buildBookPayload(form);
      let savedId = bookId;

      if (isEditing) {
        await axios.patch(`${API_URL}/api/instructor/books/${bookId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        try {
          await saveOfferPlans(bookId);
        } catch (offerErr) {
          setError(`Book saved, but purchase plans failed: ${readApiError(offerErr)}`);
          return;
        }
        setSuccess(
          listingStatus === 'published' || listingStatus === 'approved'
            ? 'Book and bundle plans updated.'
            : 'Book saved successfully.'
        );
      } else {
        const { data } = await axios.post(`${API_URL}/api/instructor/books`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        savedId = data._id;
        try {
          await saveOfferPlans(savedId);
        } catch (offerErr) {
          setError(`Book created, but purchase plans failed: ${readApiError(offerErr)}`);
          navigate(`/creator/dashboard/books/${savedId}/edit`, { replace: true });
          return;
        }
        setListingStatus(data.listingStatus || 'draft');
        setSuccess('Book and purchase plans saved.');
        navigate(`/creator/dashboard/books/${savedId}/edit`, { replace: true });
      }
    } catch (e) {
      setError(readApiError(e));
    } finally {
      setSaving(false);
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
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Reader testimonials</h3>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Optional quotes shown on your book&apos;s store page. Add one card per reader review.
              </p>
            </div>
            <button
              type="button"
              onClick={addTestimonial}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FiPlus className="h-4 w-4" aria-hidden />
              Add testimonial
            </button>
          </div>

          {(form.testimonials || []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
              No testimonials yet. Click &quot;Add testimonial&quot; to add a reader quote.
            </p>
          ) : (
            <ul className="space-y-4">
              {(form.testimonials || []).map((t, index) => (
                <li
                  key={`testimonial-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">Testimonial {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeTestimonial(index)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                      aria-label={`Remove testimonial ${index + 1}`}
                    >
                      <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Headline (optional)</label>
                      <input
                        value={t.tagline}
                        onChange={(e) => updateTestimonial(index, 'tagline', e.target.value)}
                        className={inputCls}
                        placeholder="e.g. The Beginner Who Almost Quit"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>
                        Quote <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={t.quote}
                        onChange={(e) => updateTestimonial(index, 'quote', e.target.value)}
                        rows={4}
                        className={inputCls}
                        placeholder="What did the reader say about your book?"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Reader name</label>
                      <input
                        value={t.name}
                        onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Kwame A."
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Location or role</label>
                      <input
                        value={t.role}
                        onChange={(e) => updateTestimonial(index, 'role', e.target.value)}
                        className={inputCls}
                        placeholder="e.g. Kumasi"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Reader photo (optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => {
                          testimonialInputRefs.current[index] = el;
                        }}
                        onChange={(e) =>
                          handleTestimonialImageUpload(index, e.target.files?.[0])
                        }
                        className="sr-only"
                      />
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        {t.image ? (
                          <img
                            src={t.image}
                            alt={t.name ? `${t.name} avatar` : 'Reader avatar'}
                            className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-100 text-slate-400">
                            <FiImage className="h-5 w-5" aria-hidden />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => testimonialInputRefs.current[index]?.click()}
                          disabled={Boolean(testimonialUploads[index])}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {t.image ? 'Replace photo' : 'Upload photo'}
                        </button>
                        {t.image ? (
                          <button
                            type="button"
                            onClick={() => updateTestimonial(index, 'image', '')}
                            className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                          >
                            <FiX className="h-3.5 w-3.5" aria-hidden />
                            Remove
                          </button>
                        ) : null}
                        {testimonialUploads[index] ? (
                          <span className="text-xs font-medium text-slate-600">
                            Uploading… {testimonialUploads[index]}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
          <h3 className="mb-1 text-base font-semibold text-slate-900">What readers will learn</h3>
          <p className="mb-4 text-xs text-slate-500 sm:text-sm">
            These appear on your book&apos;s store page. Add one point per line.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className={labelCls}>What you&apos;ll learn</label>
              <textarea
                name="whatYoullLearn"
                value={form.whatYoullLearn}
                onChange={handleChange}
                rows={6}
                className={inputCls}
                placeholder={'The basics of currency pairs\nWho uses the currency pairs\nWhy trade at Deriv'}
              />
            </div>
            <div>
              <label className={labelCls}>After reading, you&apos;ll be able to</label>
              <textarea
                name="afterReadingOutcomes"
                value={form.afterReadingOutcomes}
                onChange={handleChange}
                rows={6}
                className={inputCls}
                placeholder={'Understand fundamental concepts\nApply basic trading strategies\nAnalyse chart patterns'}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
          <h3 className="mb-1 text-base font-semibold text-slate-900">Pricing & Type</h3>
          {form.type === 'ebook' ? (
            <p className="mb-4 text-xs text-slate-500 sm:text-sm">
              Set your digital price and an optional separate price for printed copies.
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Book Type <span className="text-rose-500">*</span></label>
              <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                <option value="ebook">E-book</option>
                <option value="hardcopy">Hardcopy</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                {form.type === 'ebook' ? 'E-book price (GHS)' : 'Hardcopy price (GHS)'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input type="number" name="price" min={0} step={0.01} value={form.price} onChange={handleChange} className={inputCls} />
            </div>
            {form.type === 'ebook' ? (
              <div>
                <label className={labelCls}>Hardcopy price (GHS)</label>
                <input
                  type="number"
                  name="hardcopyPrice"
                  min={0}
                  step={0.01}
                  value={form.hardcopyPrice}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Optional — printed book"
                />
              </div>
            ) : (
              <div>
                <label className={labelCls}>Category</label>
                <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                  <option value="general">General</option>
                  <option value="forex">Forex</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
            )}
            {form.type === 'ebook' ? (
              <div>
                <label className={labelCls}>Category</label>
                <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                  <option value="general">General</option>
                  <option value="forex">Forex</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
            ) : null}

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
          <h3 className="mb-1 text-base font-semibold text-slate-900">Purchase plans &amp; bundles</h3>
          <p className="mb-4 text-xs text-slate-500 sm:text-sm">
            Upload each book&apos;s PDF here. Optional cover image per plan. Saved when you click Save below.
          </p>
          <CreatorBookOfferSection
            ref={offerSectionRef}
            embedded
            bookId={bookId}
            token={token}
            listingStatus={listingStatus}
            currentBook={{
              _id: bookId,
              title: form.title,
              price: form.price,
              thumbnail: form.thumbnail,
              type: form.type,
              fileUrl: form.fileUrl,
            }}
            onCurrentBookFileChange={(fileUrl) =>
              setForm((prev) => ({ ...prev, ...(fileUrl ? { fileUrl, type: 'ebook' } : {}) }))
            }
          />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Book cover</h3>
          <p className="mb-4 text-xs text-slate-500">
            Listing image for the store. Upload each book&apos;s PDF under Purchase plans above.
          </p>
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
