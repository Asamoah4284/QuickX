import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import axios from 'axios';
import { FiFileText, FiImage, FiPlus, FiTrash2 } from 'react-icons/fi';
import { uploadFileToS3 } from '../../utils/uploadToS3';

const API_URL = import.meta.env.VITE_API_URL;
export const CURRENT_BOOK_SENTINEL = '__CURRENT__';

function newPlanBook(overrides = {}) {
  return {
    bookId: overrides.bookId ?? null,
    title: overrides.title ?? '',
    fileUrl: overrides.fileUrl ?? '',
  };
}

const emptyOption = (bookId, type = 'single') => {
  const anchor = bookId ? String(bookId) : CURRENT_BOOK_SENTINEL;
  return {
    type,
    bookIds: bookId ? [String(bookId)] : [],
    planBooks: [newPlanBook({ bookId: anchor })],
    label: type === 'bundle' ? 'COMPLETE BUNDLE' : 'BOOK ONLY',
    headline: '',
    cardTitle: '',
    thumbnail: '',
    price: 0,
    compareAtPrice: '',
    badge: type === 'bundle' ? 'BEST VALUE' : '',
    footnote: '',
    features: '',
    highlighted: type === 'bundle',
    sortOrder: 0,
  };
};

function listToText(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.filter(Boolean).join('\n');
}

function resolveBookIds(bookIds, savedBookId) {
  const id = savedBookId ? String(savedBookId) : '';
  return (bookIds || []).map((bid) => (bid === CURRENT_BOOK_SENTINEL ? id : String(bid))).filter(Boolean);
}

function bookIdsFromPlanBooks(planBooks) {
  return (planBooks || [])
    .map((pb) => (pb.bookId ? String(pb.bookId) : ''))
    .filter((id) => id && id !== CURRENT_BOOK_SENTINEL);
}

function hydratePlanBooks(opt, bookId, currentBook, myBooks) {
  if (Array.isArray(opt.planBooks) && opt.planBooks.length) {
    return opt.planBooks.map((pb) =>
      newPlanBook({
        bookId: pb.bookId ? String(pb.bookId) : null,
        title: pb.title || '',
        fileUrl: pb.fileUrl || '',
      })
    );
  }

  const fromIds = (opt.bookIds || []).map((id) => {
    const sid = String(id);
    if (bookId && sid === String(bookId)) {
      return newPlanBook({
        bookId: sid,
        title: currentBook?.title || '',
        fileUrl: currentBook?.fileUrl || '',
      });
    }
    const found = myBooks.find((b) => String(b._id) === sid);
    return newPlanBook({
      bookId: sid,
      title: found?.title || '',
      fileUrl: found?.fileUrl || '',
    });
  });

  if (fromIds.length) {
    return fromIds;
  }

  if (opt.type === 'bundle') {
    return [
      newPlanBook({
        bookId: bookId || CURRENT_BOOK_SENTINEL,
        title: currentBook?.title ? `${currentBook.title} - BOOK 1` : 'Book 1',
        fileUrl: currentBook?.fileUrl || '',
      }),
      newPlanBook({ title: currentBook?.title ? `${currentBook.title} - BOOK 2` : 'Book 2' }),
    ];
  }

  return [
    newPlanBook({
      bookId: bookId || CURRENT_BOOK_SENTINEL,
      title: currentBook?.title || '',
      fileUrl: currentBook?.fileUrl || '',
    }),
  ];
}

function resolvePlanBookFileUrl(pb) {
  return String(pb.fileUrl || '').trim();
}

export function buildOfferApiPayload({ enabled, heading, subheading, options }, savedBookId) {
  return {
    enabled,
    heading,
    subheading,
    options: enabled
      ? options.map((opt, i) => ({
          type: opt.type,
          bookIds: resolveBookIds(opt.bookIds?.length ? opt.bookIds : bookIdsFromPlanBooks(opt.planBooks), savedBookId),
          planBooks: (opt.planBooks || []).map((pb) => ({
            bookId:
              pb.bookId === CURRENT_BOOK_SENTINEL
                ? savedBookId || undefined
                : pb.bookId && pb.bookId !== CURRENT_BOOK_SENTINEL
                  ? String(pb.bookId)
                  : undefined,
            title: String(pb.title || '').trim(),
            fileUrl: resolvePlanBookFileUrl(pb),
          })),
          label: opt.label,
          headline: opt.headline,
          cardTitle: opt.cardTitle,
          thumbnail: opt.thumbnail,
          price: Number(opt.price) || 0,
          compareAtPrice:
            opt.compareAtPrice !== '' && opt.compareAtPrice != null ? Number(opt.compareAtPrice) : null,
          badge: opt.badge,
          footnote: opt.footnote,
          features: String(opt.features || '')
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean),
          highlighted: Boolean(opt.highlighted),
          sortOrder: i,
        }))
      : [],
  };
}

/**
 * Purchase plans embedded in the book create/edit form.
 */
const CreatorBookOfferSection = forwardRef(function CreatorBookOfferSection(
  { bookId, token, currentBook, listingStatus, onCurrentBookFileChange },
  ref
) {
  const [enabled, setEnabled] = useState(Boolean(!bookId));
  const [heading, setHeading] = useState('PICK YOUR PLAN & START TODAY');
  const [subheading, setSubheading] = useState(
    "Whether you're starting from scratch or ready to go all-in — there's an option for you."
  );
  const [options, setOptions] = useState([]);
  const [myBooks, setMyBooks] = useState([]);
  const [loading, setLoading] = useState(Boolean(bookId));
  const [error, setError] = useState('');
  const [uploadingOptionIndex, setUploadingOptionIndex] = useState(null);
  const [uploadingPdfKey, setUploadingPdfKey] = useState(null);
  const optionFileRefs = useRef({});
  const planPdfRefs = useRef({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const booksRes = await axios.get(`${API_URL}/api/instructor/book-offers/my-books`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const books = booksRes.data || [];
      setMyBooks(books);

      if (bookId) {
        const offerRes = await axios.get(`${API_URL}/api/instructor/book-offers/by-book/${bookId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const group = offerRes.data?.offerGroup;
        if (group) {
          setEnabled(true);
          setHeading(group.heading || 'PICK YOUR PLAN & START TODAY');
          setSubheading(group.subheading || '');
          setOptions(
            (group.options || []).map((opt, i) => {
              const planBooks = hydratePlanBooks(opt, bookId, currentBook, books);
              return {
                ...opt,
                bookIds: (opt.bookIds || []).map(String),
                planBooks,
                features: listToText(opt.features),
                compareAtPrice: opt.compareAtPrice ?? '',
                sortOrder: opt.sortOrder ?? i,
              };
            })
          );
        }
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [bookId, token, currentBook?.title, currentBook?.fileUrl]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading && enabled && options.length === 0) {
      seedDefaultOption();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when plans are on but empty
  }, [loading]);

  const validatePlans = () => {
    if (!enabled) {
      return 'Enable purchase plans and upload a PDF for each book in your plan.';
    }
    for (const opt of options) {
      for (const pb of opt.planBooks || []) {
        const url = resolvePlanBookFileUrl(pb);
        if (!url) {
          const label = String(pb.title || 'each book').trim() || 'each book';
          return `Upload a PDF for "${label}" in your ${opt.type === 'bundle' ? 'bundle' : 'plan'} before saving.`;
        }
      }
    }
    if (!options.length) {
      return 'Add at least one purchase plan, or turn off the plan picker.';
    }
    return null;
  };

  useImperativeHandle(ref, () => ({
    getPayload: (savedBookId) =>
      buildOfferApiPayload({ enabled, heading, subheading, options }, savedBookId),
    validatePlans,
  }));

  const updateOption = (index, patch) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)));
  };

  const updatePlanBook = (optIndex, pbIndex, patch) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== optIndex) return opt;
        const planBooks = opt.planBooks.map((pb, j) => (j === pbIndex ? { ...pb, ...patch } : pb));
        return { ...opt, planBooks, bookIds: bookIdsFromPlanBooks(planBooks) };
      })
    );
  };

  const seedDefaultOption = () => {
    setOptions([
      {
        ...emptyOption(bookId ? String(bookId) : null, 'single'),
        cardTitle: currentBook?.title || 'This book',
        headline: currentBook?.title || '',
        price: Number(currentBook?.price) || 0,
        thumbnail: currentBook?.thumbnail || '',
        planBooks: [
          newPlanBook({
            bookId: bookId || CURRENT_BOOK_SENTINEL,
            title: currentBook?.title || '',
            fileUrl: currentBook?.fileUrl || '',
          }),
        ],
        sortOrder: 0,
      },
    ]);
  };

  const handleEnabledChange = (checked) => {
    setEnabled(checked);
    if (checked && options.length === 0) {
      seedDefaultOption();
    }
  };

  const addSingleOption = () => {
    setOptions((prev) => [
      ...prev,
      {
        ...emptyOption(null, 'single'),
        planBooks: [newPlanBook({ title: 'Book' })],
        cardTitle: '',
        price: Number(currentBook?.price) || 0,
        sortOrder: prev.length,
      },
    ]);
  };

  const addBundleOption = () => {
    setOptions((prev) => [
      ...prev,
      {
        ...emptyOption(null, 'bundle'),
        planBooks: [
          newPlanBook({
            bookId: bookId || CURRENT_BOOK_SENTINEL,
            title: currentBook?.title ? `${currentBook.title} - BOOK 1` : 'Book 1',
            fileUrl: currentBook?.fileUrl || '',
          }),
          newPlanBook({
            title: currentBook?.title ? `${currentBook.title} - BOOK 2` : 'Book 2',
          }),
        ],
        cardTitle: 'Complete bundle',
        headline: 'ALL BOOKS',
        price: Math.round(Number(currentBook?.price || 0) * 1.4) || 0,
        compareAtPrice: Number(currentBook?.price || 0) * 2,
        badge: 'BEST VALUE — SAVE 30%',
        highlighted: true,
        features: 'Everything in the series\nInstant PDF delivery for each book',
        sortOrder: prev.length,
      },
    ]);
  };

  const removeOption = (index) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const addBookToPlan = (optIndex) => {
    const opt = options[optIndex];
    const n = (opt?.planBooks?.length || 0) + 1;
    const planBooks = [...(opt.planBooks || []), newPlanBook({ title: `Book ${n}` })];
    updateOption(optIndex, { planBooks, bookIds: bookIdsFromPlanBooks(planBooks) });
  };

  const removeBookFromPlan = (optIndex, pbIndex) => {
    const opt = options[optIndex];
    const planBooks = opt.planBooks.filter((_, j) => j !== pbIndex);
    updateOption(optIndex, { planBooks, bookIds: bookIdsFromPlanBooks(planBooks) });
  };

  const ensureBookRecord = async (pb, title, fileUrl) => {
    if (pb.bookId && pb.bookId !== CURRENT_BOOK_SENTINEL) {
      return String(pb.bookId);
    }
    if (!bookId) {
      return CURRENT_BOOK_SENTINEL;
    }
    const { data } = await axios.post(
      `${API_URL}/api/instructor/book-offers/series-book`,
      { anchorBookId: bookId, title: title.trim(), fileUrl },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setMyBooks((prev) => [...prev, data]);
    return String(data._id);
  };

  const handlePlanPdfUpload = async (optIndex, pbIndex, file) => {
    if (!file) return;
    const key = `${optIndex}-${pbIndex}`;
    setUploadingPdfKey(key);
    setError('');
    try {
      const pb = options[optIndex].planBooks[pbIndex];
      const url = await uploadFileToS3({ file, token, type: 'file' });
      const title = pb.title || `Book ${pbIndex + 1}`;

      if (!pb.bookId || pb.bookId === CURRENT_BOOK_SENTINEL) {
        if (!bookId) {
          onCurrentBookFileChange?.(url);
          updatePlanBook(optIndex, pbIndex, {
            fileUrl: url,
            bookId: CURRENT_BOOK_SENTINEL,
            title: title || currentBook?.title,
          });
          return;
        }
        if (pb.bookId === CURRENT_BOOK_SENTINEL) {
          await axios.patch(
            `${API_URL}/api/instructor/books/${bookId}`,
            { fileUrl: url, type: 'ebook', title },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          onCurrentBookFileChange?.(url);
          updatePlanBook(optIndex, pbIndex, {
            bookId: String(bookId),
            fileUrl: url,
            title,
          });
          return;
        }
        const newId = await ensureBookRecord(pb, title, url);
        updatePlanBook(optIndex, pbIndex, { bookId: newId, fileUrl: url, title });
        return;
      }

      await axios.patch(
        `${API_URL}/api/instructor/books/${pb.bookId}`,
        { fileUrl: url, type: 'ebook' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updatePlanBook(optIndex, pbIndex, { fileUrl: url });
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setUploadingPdfKey(null);
    }
  };

  const handlePlanTitleBlur = async (optIndex, pbIndex, newTitle) => {
    const title = newTitle.trim();
    const pb = options[optIndex]?.planBooks?.[pbIndex];
    if (!pb || !title || title === pb.title) return;

    if (!pb.bookId || pb.bookId === CURRENT_BOOK_SENTINEL) {
      updatePlanBook(optIndex, pbIndex, { title });
      return;
    }

    try {
      await axios.patch(
        `${API_URL}/api/instructor/books/${pb.bookId}`,
        { title },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updatePlanBook(optIndex, pbIndex, { title });
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const handleThumbnailUpload = async (index, file) => {
    if (!file) return;
    setUploadingOptionIndex(index);
    setError('');
    try {
      const url = await uploadFileToS3({ file, token, type: 'image' });
      updateOption(index, { thumbnail: url });
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setUploadingOptionIndex(null);
    }
  };

  const inputCls =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
  const labelCls = 'block text-xs font-medium text-slate-600';

  if (loading) {
    return <p className="text-sm text-slate-500">Loading purchase plans…</p>;
  }

  const isPublished = listingStatus === 'published' || listingStatus === 'approved';

  return (
    <div className="space-y-4">
      {isPublished ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          This book is approved and live. You can add or change plans here anytime — save the form to update the
          store.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 sm:text-sm">
          Upload each book&apos;s PDF in your plans below. Optional cover image per plan. The store listing cover is set under Book cover.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          Show plan picker on store
        </label>
      </div>

      {enabled ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Section heading</label>
              <input value={heading} onChange={(e) => setHeading(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Subheading</label>
              <input value={subheading} onChange={(e) => setSubheading(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="space-y-4">
            {options.map((opt, index) => (
              <div key={`opt-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {opt.type === 'bundle' ? 'Bundle' : 'Single book'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      value={opt.type}
                      onChange={(e) => {
                        const type = e.target.value;
                        let planBooks = opt.planBooks || [];
                        if (type === 'single') {
                          planBooks = [planBooks[0] || newPlanBook()];
                        } else if (planBooks.length < 2) {
                          planBooks = [
                            planBooks[0] || newPlanBook({ title: 'Book 1' }),
                            newPlanBook({ title: 'Book 2' }),
                          ];
                        }
                        updateOption(index, {
                          type,
                          planBooks,
                          bookIds: bookIdsFromPlanBooks(planBooks),
                        });
                      }}
                      className={inputCls}
                    >
                      <option value="single">Single book</option>
                      <option value="bundle">Bundle</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-800">
                      {opt.type === 'bundle' ? 'Books in this bundle' : 'Book for this plan'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Name each book and upload its PDF here. Buyers get exactly these files.
                    </p>
                    <ul className="mt-3 space-y-3">
                      {(opt.planBooks || []).map((pb, pbIndex) => {
                        const pdfKey = `${index}-${pbIndex}`;
                        const hasPdf = Boolean(String(pb.fileUrl || '').trim());
                        return (
                          <li
                            key={pdfKey}
                            className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center"
                          >
                            <input
                              value={pb.title}
                              onChange={(e) => updatePlanBook(index, pbIndex, { title: e.target.value })}
                              onBlur={(e) => handlePlanTitleBlur(index, pbIndex, e.target.value)}
                              placeholder={opt.type === 'bundle' ? `Book ${pbIndex + 1} title` : 'Book title'}
                              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                            />
                            <div className="flex shrink-0 items-center gap-2">
                              <input
                                ref={(el) => {
                                  planPdfRefs.current[pdfKey] = el;
                                }}
                                type="file"
                                accept=".pdf,.epub,application/pdf,application/epub+zip"
                                className="sr-only"
                                onChange={(e) => {
                                  handlePlanPdfUpload(index, pbIndex, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                              <button
                                type="button"
                                disabled={uploadingPdfKey === pdfKey}
                                onClick={() => planPdfRefs.current[pdfKey]?.click()}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                              >
                                <FiFileText className="h-3.5 w-3.5" />
                                {uploadingPdfKey === pdfKey
                                  ? 'Uploading…'
                                  : hasPdf
                                    ? 'Replace PDF'
                                    : 'Upload PDF'}
                              </button>
                              {opt.type === 'bundle' && (opt.planBooks?.length || 0) > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeBookFromPlan(index, pbIndex)}
                                  className="rounded-xl border border-rose-100 px-2 py-2 text-xs text-rose-600 hover:bg-rose-50"
                                  aria-label="Remove book"
                                >
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                            {hasPdf ? (
                              <p className="text-xs text-emerald-600 sm:basis-full">PDF ready</p>
                            ) : (
                              <p className="text-xs text-rose-600 sm:basis-full">PDF required</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {opt.type === 'bundle' ? (
                      <button
                        type="button"
                        onClick={() => addBookToPlan(index)}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                      >
                        <FiPlus className="h-4 w-4" />
                        Add another book to bundle
                      </button>
                    ) : null}
                  </div>

                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-medium text-slate-800">Cover image for this plan (optional)</p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="shrink-0">
                        {opt.thumbnail ? (
                          <img
                            src={opt.thumbnail}
                            alt=""
                            className="h-24 w-20 rounded-lg object-contain bg-slate-50 ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-24 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                            <FiImage className="h-6 w-6" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={(el) => {
                            optionFileRefs.current[index] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            handleThumbnailUpload(index, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          disabled={uploadingOptionIndex === index}
                          onClick={() => optionFileRefs.current[index]?.click()}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {uploadingOptionIndex === index ? 'Uploading…' : 'Upload cover'}
                        </button>
                        {opt.thumbnail ? (
                          <button
                            type="button"
                            onClick={() => updateOption(index, { thumbnail: '' })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Label</label>
                    <input
                      value={opt.label}
                      onChange={(e) => updateOption(index, { label: e.target.value })}
                      className={inputCls}
                      placeholder="COURSE 1 ONLY"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Headline</label>
                    <input
                      value={opt.headline}
                      onChange={(e) => updateOption(index, { headline: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Card title</label>
                    <input
                      value={opt.cardTitle}
                      onChange={(e) => updateOption(index, { cardTitle: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Price (GH₵)</label>
                    <input
                      type="number"
                      min={0}
                      value={opt.price}
                      onChange={(e) => updateOption(index, { price: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  {opt.type === 'bundle' ? (
                    <div>
                      <label className={labelCls}>Compare-at price</label>
                      <input
                        type="number"
                        min={0}
                        value={opt.compareAtPrice}
                        onChange={(e) => updateOption(index, { compareAtPrice: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className={labelCls}>Badge</label>
                    <input
                      value={opt.badge}
                      onChange={(e) => updateOption(index, { badge: e.target.value })}
                      className={inputCls}
                      placeholder="BEST VALUE — SAVE 30%"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Features (one per line)</label>
                    <textarea
                      rows={3}
                      value={opt.features}
                      onChange={(e) => updateOption(index, { features: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(opt.highlighted)}
                        onChange={(e) => updateOption(index, { highlighted: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Highlight as best value
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addSingleOption}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FiPlus className="h-4 w-4" />
              Add single book plan
            </button>
            <button
              type="button"
              onClick={addBundleOption}
              className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            >
              <FiPlus className="h-4 w-4" />
              Add bundle plan
            </button>
          </div>
        </>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
});

export default CreatorBookOfferSection;
