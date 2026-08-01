import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiCheckCircle, FiChevronRight, FiUploadCloud } from 'react-icons/fi';
import WizardStepper from '../../components/creator/WizardStepper';
import CurriculumBuilder from '../../components/creator/CurriculumBuilder';
import StatusBadge from '../../components/creator/StatusBadge';
import { uploadFileToS3 } from '../../utils/uploadToS3';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL;

const steps = [
  { label: 'Basics', description: 'Title, cover, and description' },
  { label: 'Pricing', description: 'Basic, Premium & Diamond' },
  { label: 'Curriculum', description: 'Modules and lessons' },
  { label: 'Review', description: 'Check and publish' },
];

const defaultModules = [
  {
    title: 'Getting started',
    description: '',
    level: 'beginner',
    price: 0,
    order: 1,
    sections: [
      {
        title: 'Welcome section',
        description: '',
        order: 1,
        lessons: [
          {
            title: 'Welcome lesson',
            description: '',
            lessonType: 'video',
            type: 'video',
            duration: '',
            videoUrl: '',
            pdfUrl: '',
            textContent: '',
            resourceUrl: '',
            resources: [],
            isPreview: true,
            isLocked: false,
            order: 1,
          },
        ],
      },
    ],
  },
];

const emptyCourse = {
  title: '',
  subtitle: '',
  category: '',
  subcategory: '',
  courseType: 'forex',
  level: 'beginner',
  language: 'English',
  thumbnail: '',
  promoVideo: '',
  shortDescription: '',
  description: '',
  learningOutcomes: '',
  requirements: '',
  targetAudience: '',
  skillsGained: '',
  pricingType: 'paid',
  price: 0,
  currency: 'GHS',
  discountPrice: '',
  certificateEnabled: false,
  modules: defaultModules,
  additionalMaterials: [],
};

function textToList(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function StudioPanel({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:rounded-[28px] sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

function ChecklistRow({ done, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <FiCheckCircle className="h-4 w-4" />
      </div>
      <p className={`text-sm font-medium ${done ? 'text-slate-950' : 'text-slate-700'}`}>{label}</p>
    </div>
  );
}

const inputCls = 'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm';

export default function CreatorCourseWizard() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(emptyCourse);
  const [loading, setLoading] = useState(Boolean(courseId));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeCourseId, setActiveCourseId] = useState(courseId || '');
  const [courseStatus, setCourseStatus] = useState('draft');
  const [settings, setSettings] = useState({ courseAutoApproval: false });
  const [uploadProgress, setUploadProgress] = useState({ thumbnail: 0 });
  const [thumbnailPreviewFailed, setThumbnailPreviewFailed] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [subscriptionPricing, setSubscriptionPricing] = useState({
    basic: 49,
    premium: 99,
    diamond: 599,
  });
  const [subscriptionPricingSaving, setSubscriptionPricingSaving] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    setThumbnailPreviewFailed(false);
  }, [form.thumbnail]);

  useEffect(() => {
    async function loadCourse() {
      try {
        const [profileResponse, courseResponse] = await Promise.all([
          axios.get(`${API_URL}/api/users/creator/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          courseId
            ? axios.get(`${API_URL}/api/instructor/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve({ data: null }),
        ]);

        setSettings(profileResponse.data.settings || { courseAutoApproval: false });
        const sp = profileResponse.data?.tutorProfile?.subscriptionPricing;
        setSubscriptionPricing({
          basic: Number(sp?.basic ?? sp?.month1 ?? 49) || 0,
          premium: Number(sp?.premium ?? sp?.premiumPlus ?? sp?.month3 ?? 99) || 0,
          diamond: Number(sp?.diamond ?? sp?.year1 ?? 599) || 0,
        });

        if (courseResponse.data) {
          const course = courseResponse.data;
          setForm({
            title: course.title || '',
            subtitle: course.subtitle || '',
            category: course.category || '',
            subcategory: course.subcategory || '',
            courseType: course.courseType || 'forex',
            level: course.level || 'beginner',
            language: course.language || 'English',
            thumbnail: course.thumbnail || '',
            promoVideo: course.promoVideo || '',
            shortDescription: course.shortDescription || '',
            description: course.description || '',
            learningOutcomes: listToText(course.learningOutcomes),
            requirements: listToText(course.requirements),
            targetAudience: listToText(course.targetAudience),
            skillsGained: listToText(course.skillsGained),
            pricingType: course.pricingType || (Number(course.price || 0) > 0 ? 'paid' : 'free'),
            price: course.price || 0,
            currency: course.currency || 'GHS',
            discountPrice: course.discountPrice ?? '',
            certificateEnabled: course.certificateEnabled || false,
            modules: course.modules?.length ? course.modules : defaultModules,
            additionalMaterials: course.additionalMaterials?.length ? course.additionalMaterials : [],
          });
          setCourseStatus(course.listingStatus || 'draft');
          setActiveCourseId(course._id);
          if (
            course.subtitle ||
            course.learningOutcomes?.length ||
            course.shortDescription ||
            course.promoVideo
          ) {
            setShowMoreDetails(true);
          }
        }

        hydratedRef.current = true;
      } catch (loadError) {
        setError(loadError.response?.data?.message || loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId, token]);

  useEffect(() => {
    if (!hydratedRef.current) return undefined;

    const hasMinimumDraftData = form.title || form.description;
    if (!hasMinimumDraftData) return undefined;

    const timeoutId = setTimeout(() => {
      saveDraft(true);
    }, 1400);

    return () => clearTimeout(timeoutId);
  }, [form]);

  const lessonCount = useMemo(
    () =>
      form.modules.reduce(
        (count, module) =>
          count +
          module.sections.reduce((sectionCount, section) => sectionCount + section.lessons.length, 0),
        0
      ),
    [form.modules]
  );

  const checklist = useMemo(
    () => [
      { done: Boolean(form.title.trim()), label: 'Course title' },
      { done: Boolean(form.description.trim()), label: 'Description' },
      { done: Boolean(form.thumbnail), label: 'Cover image' },
      { done: lessonCount > 0, label: 'At least one lesson' },
    ],
    [form.description, form.thumbnail, form.title, lessonCount]
  );

  const buildPayload = () => ({
    title: form.title,
    subtitle: form.subtitle,
    category: form.category || form.courseType,
    subcategory: form.subcategory,
    courseType: form.courseType,
    level: form.level,
    language: form.language,
    thumbnail: form.thumbnail,
    promoVideo: form.promoVideo,
    shortDescription: form.shortDescription,
    description: form.description,
    learningOutcomes: textToList(form.learningOutcomes),
    requirements: textToList(form.requirements),
    targetAudience: textToList(form.targetAudience),
    skillsGained: textToList(form.skillsGained),
    pricingType: form.pricingType,
    price: Number(form.pricingType === 'free' ? 0 : form.price || 0),
    currency: form.currency,
    discountPrice: form.discountPrice === '' ? null : Number(form.discountPrice),
    certificateEnabled: Boolean(form.certificateEnabled),
    modules: form.modules,
    additionalMaterials: form.additionalMaterials,
  });

  const saveDraft = async (silent = false) => {
    try {
      setSaving(true);
      setError('');

      const payload = buildPayload();
      const response = activeCourseId
        ? await axios.patch(`${API_URL}/api/instructor/courses/${activeCourseId}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.post(`${API_URL}/api/instructor/courses`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });

      const savedCourse = response.data;
      if (!activeCourseId && savedCourse?._id) {
        setActiveCourseId(savedCourse._id);
        navigate(`/creator/dashboard/courses/${savedCourse._id}/edit`, { replace: true });
      }

      setCourseStatus(savedCourse?.listingStatus || 'draft');
      if (!silent) setMessage('Draft saved.');
      return savedCourse;
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveSubscriptionPricing = async (silent = true) => {
    try {
      setSubscriptionPricingSaving(true);
      const payload = {
        subscriptionPricing: {
          basic: Math.max(0, Math.round(Number(subscriptionPricing.basic) || 0)),
          premium: Math.max(0, Math.round(Number(subscriptionPricing.premium) || 0)),
          diamond: Math.max(0, Math.round(Number(subscriptionPricing.diamond) || 0)),
        },
      };
      await axios.put(`${API_URL}/api/users/creator/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!silent) setMessage('Subscription pricing saved.');
      return true;
    } catch (e) {
      if (!silent) setError(e.response?.data?.message || e.message);
      return false;
    } finally {
      setSubscriptionPricingSaving(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setError('');
      const uploadedUrl = await uploadFileToS3({
        file,
        token,
        type: 'image',
        onProgress: (progress) => setUploadProgress({ thumbnail: progress }),
      });
      setForm((current) => ({ ...current, thumbnail: uploadedUrl }));
      setMessage('Cover image uploaded.');
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message);
    } finally {
      setUploadProgress({ thumbnail: 0 });
    }
  };

  const submitForReview = async (action = 'submit') => {
    try {
      setSubmitting(true);
      setError('');
      const savedCourse = await saveDraft(true);
      const courseIdToUse = savedCourse?._id || activeCourseId;

      if (!courseIdToUse) {
        setError('Save the course first before submitting.');
        return;
      }

      const endpoint = action === 'publish' ? 'publish' : 'submit';
      const { data } = await axios.post(
        `${API_URL}/api/instructor/courses/${courseIdToUse}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourseStatus(
        data.course?.listingStatus ||
          data.listingStatus ||
          (action === 'publish' ? 'published' : 'under_review')
      );
      setMessage(data.message || 'Course updated.');
    } catch (submitError) {
      setError(submitError.response?.data?.message || submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepMeta = steps[currentStep - 1];

  let stepContent = null;

  if (currentStep === 1) {
    stepContent = (
      <div className="space-y-6">
        <StudioPanel title="Course details" description="Only a title is required to save. Everything else helps students find and trust your course.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>
                Title <span className="text-rose-500">*</span>
              </span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Forex price action for beginners"
                className={inputCls}
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Track</span>
              <select
                value={form.courseType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    courseType: event.target.value,
                    category: current.category || event.target.value,
                  }))
                }
                className={inputCls}
              >
                <option value="forex">Forex</option>
                <option value="crypto">Crypto</option>
                <option value="webdev">Web development</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Level</span>
              <select
                value={form.level}
                onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
                className={inputCls}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                rows={5}
                placeholder="What will students learn? Keep it clear and short."
                className={inputCls}
              />
            </label>
          </div>
        </StudioPanel>

        <StudioPanel title="Cover image" description="Optional, but helps your course stand out.">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
            <FiUploadCloud className="h-6 w-6 text-slate-400" />
            <span className="mt-3 font-medium text-slate-700">
              {uploadProgress.thumbnail > 0
                ? `Uploading ${uploadProgress.thumbnail}%`
                : form.thumbnail
                  ? 'Replace cover image'
                  : 'Upload cover image'}
            </span>
          </label>
          {form.thumbnail ? (
            <div className="mt-4 space-y-2">
              <img
                src={publicAssetUrl(form.thumbnail)}
                alt=""
                className="h-44 w-full rounded-3xl object-cover"
                onLoad={() => setThumbnailPreviewFailed(false)}
                onError={() => setThumbnailPreviewFailed(true)}
              />
              {thumbnailPreviewFailed ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Uploaded, but the preview URL may be private in S3.
                </p>
              ) : null}
            </div>
          ) : null}
        </StudioPanel>

        <div>
          <button
            type="button"
            onClick={() => setShowMoreDetails((open) => !open)}
            className="text-sm font-semibold text-[#1B5EF5] hover:underline"
          >
            {showMoreDetails ? 'Hide optional details' : 'Add optional details'}
          </button>

          {showMoreDetails ? (
            <div className="mt-4 space-y-6">
              <StudioPanel title="Optional extras" description="Skip these if you want — you can add them later.">
                <div className="grid gap-4">
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>Subtitle</span>
                    <input
                      value={form.subtitle}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, subtitle: event.target.value }))
                      }
                      placeholder="Short tagline"
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>Short description (cards &amp; search)</span>
                    <textarea
                      value={form.shortDescription}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, shortDescription: event.target.value }))
                      }
                      rows={2}
                      maxLength={250}
                      placeholder="One or two punchy sentences"
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>What students will learn (one per line)</span>
                    <textarea
                      value={form.learningOutcomes}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, learningOutcomes: event.target.value }))
                      }
                      rows={4}
                      placeholder="Read charts with confidence&#10;Build a simple trading plan"
                      className={inputCls}
                    />
                  </label>
                </div>
              </StudioPanel>
            </div>
          ) : null}
        </div>

        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Next you&apos;ll set <span className="font-semibold text-slate-800">Basic / Premium / Diamond</span>{' '}
          subscription prices for access to your courses.
        </p>
      </div>
    );
  } else if (currentStep === 2) {
    stepContent = (
      <div className="space-y-6">
        <StudioPanel
          title="Subscription plan pricing"
          description="Set prices for Basic, Premium, and Diamond. Each plan unlocks different features."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-600">
              <span>Basic — 1 month · videos only (GHS)</span>
              <input
                type="number"
                min="0"
                value={subscriptionPricing.basic}
                onChange={(e) =>
                  setSubscriptionPricing((cur) => ({ ...cur, basic: e.target.value }))
                }
                className={inputCls}
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Premium — 3 months · community, offline, signals (GHS)</span>
              <input
                type="number"
                min="0"
                value={subscriptionPricing.premium}
                onChange={(e) =>
                  setSubscriptionPricing((cur) => ({ ...cur, premium: e.target.value }))
                }
                className={inputCls}
              />
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Diamond — 1 year · mentorship (GHS)</span>
              <input
                type="number"
                min="0"
                value={subscriptionPricing.diamond}
                onChange={(e) =>
                  setSubscriptionPricing((cur) => ({ ...cur, diamond: e.target.value }))
                }
                className={inputCls}
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-medium text-slate-700">Student preview</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Basic', value: subscriptionPricing.basic, note: 'Videos only · 1 mo' },
                { label: 'Premium', value: subscriptionPricing.premium, note: 'Full access · 3 mo' },
                { label: 'Diamond', value: subscriptionPricing.diamond, note: 'Mentorship · 1 yr' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    GH₵
                    {Number(item.value || 0).toLocaleString('en-GH', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Saved to your creator profile and used at checkout and on your public page.
            </p>
            <button
              type="button"
              onClick={() => saveSubscriptionPricing(false)}
              disabled={subscriptionPricingSaving}
              className="rounded-xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1552D6] disabled:opacity-60"
            >
              {subscriptionPricingSaving ? 'Saving…' : 'Save prices'}
            </button>
          </div>
        </StudioPanel>
      </div>
    );
  } else if (currentStep === 3) {
    stepContent = (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Add modules and lessons. You can start with one video and expand later.
        </p>
        <CurriculumBuilder
          value={form.modules}
          authToken={token}
          onChange={(nextModules) => setForm((current) => ({ ...current, modules: nextModules }))}
        />
      </div>
    );
  } else {
    stepContent = (
      <div className="space-y-6">
        <StudioPanel title="Preview" description="Quick check before you submit.">
          <div className="space-y-5">
            {form.thumbnail ? (
              <img
                src={publicAssetUrl(form.thumbnail)}
                alt=""
                className="h-56 w-full rounded-3xl object-cover"
              />
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={courseStatus} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {lessonCount} lessons
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {form.level}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {form.courseType}
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-slate-950">{form.title || 'Untitled course'}</h3>
              {form.subtitle ? <p className="mt-1 text-slate-500">{form.subtitle}</p> : null}
            </div>

            <p className="text-sm leading-7 text-slate-600">
              {form.description || 'No description yet.'}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Basic', value: subscriptionPricing.basic },
                { label: 'Premium', value: subscriptionPricing.premium },
                { label: 'Diamond', value: subscriptionPricing.diamond },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm text-slate-500">{item.label} access</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    GH₵{Number(item.value || 0).toLocaleString('en-GH', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </StudioPanel>

        <StudioPanel title="Publish" description="Save anytime. Submit when ready.">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveDraft(false)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
            >
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => submitForReview('submit')}
              disabled={submitting || !form.title.trim()}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Processing…' : 'Submit for review'}
            </button>
            {settings.courseAutoApproval ? (
              <button
                type="button"
                onClick={() => submitForReview('publish')}
                disabled={submitting || !form.title.trim()}
                className="rounded-2xl bg-[#1B5EF5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1552D6] disabled:opacity-50"
              >
                Publish now
              </button>
            ) : null}
          </div>
        </StudioPanel>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-sm text-slate-500">
        Loading course studio…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#1B5EF5] p-6 text-white ring-1 ring-white/10 sm:rounded-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-100/90">
              Course studio
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              {activeCourseId ? 'Edit course' : 'Create a course'}
            </h2>
            <p className="mt-2 text-sm text-blue-100/85">
              Basics, pricing, curriculum, then publish.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={courseStatus} />
            <button
              type="button"
              onClick={() => navigate('/creator/dashboard/courses')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/15"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => saveDraft(false)}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#1B5EF5] hover:bg-blue-50"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </div>

      <WizardStepper steps={steps} currentStep={currentStep} onStepSelect={setCurrentStep} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[32px] sm:p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Step {currentStep} of {steps.length}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950 sm:text-xl">
                {currentStepMeta.label}
              </h3>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {currentStepMeta.description}
            </div>
          </div>

          {stepContent}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 1))}
              disabled={currentStep === 1}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-40"
            >
              Back
            </button>

            <div className="flex flex-wrap gap-3">
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (currentStep === 2) {
                      await saveSubscriptionPricing(true);
                    }
                    setCurrentStep((step) => Math.min(step + 1, steps.length));
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#1B5EF5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1552D6]"
                >
                  Continue
                  <FiChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => submitForReview('submit')}
                  disabled={submitting || !form.title.trim()}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? 'Processing…' : 'Submit for review'}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <StudioPanel title="Quick checklist" description="Nice to have — only title is required to submit.">
            <div className="space-y-3">
              {checklist.map((item) => (
                <ChecklistRow key={item.label} done={item.done} label={item.label} />
              ))}
            </div>
          </StudioPanel>
        </aside>
      </div>
    </div>
  );
}
