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
  { label: 'Access', description: 'Who can watch it' },
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
    <section className="rounded-2xl border border-line bg-ink-850 p-5 sm:rounded-[28px] sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-fg">{title}</h3>
        {description ? <p className="mt-1 text-sm text-fg-subtle">{description}</p> : null}
      </div>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

function ChecklistRow({ done, label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink-850 px-4 py-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          done ? 'bg-up/10 text-up' : 'bg-ink-800 text-fg-subtle'
        }`}
      >
        <FiCheckCircle className="h-4 w-4" />
      </div>
      <p className={`text-sm font-medium ${done ? 'text-fg' : 'text-fg-muted'}`}>{label}</p>
    </div>
  );
}

const inputCls = 'w-full rounded-2xl border border-line px-4 py-3 text-sm';

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
  const [uploadProgress, setUploadProgress] = useState({ thumbnail: 0 });
  const [thumbnailPreviewFailed, setThumbnailPreviewFailed] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    setThumbnailPreviewFailed(false);
  }, [form.thumbnail]);

  useEffect(() => {
    async function loadCourse() {
      try {
        const courseResponse = courseId
          ? await axios.get(`${API_URL}/api/instructor/courses/${courseId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : { data: null };

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

  const submitForReview = async () => {
    try {
      setSubmitting(true);
      setError('');
      const savedCourse = await saveDraft(true);
      const courseIdToUse = savedCourse?._id || activeCourseId;

      if (!courseIdToUse) {
        setError('Save the course first before submitting.');
        return;
      }

      // `/submit` publishes straight away now that the owner is the only creator.
      const { data } = await axios.post(
        `${API_URL}/api/instructor/courses/${courseIdToUse}/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourseStatus(
        data.course?.listingStatus ||
          data.listingStatus ||
          'published'
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
            <label className="space-y-2 text-sm text-fg-muted md:col-span-2">
              <span>
                Title <span className="text-down">*</span>
              </span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Forex price action for beginners"
                className={inputCls}
              />
            </label>

            <label className="space-y-2 text-sm text-fg-muted">
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

            <label className="space-y-2 text-sm text-fg-muted md:col-span-2">
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
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-ink-900 px-4 py-10 text-center">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(event) => handleUpload(event.target.files?.[0])}
            />
            <FiUploadCloud className="h-6 w-6 text-fg-subtle" />
            <span className="mt-3 font-medium text-fg-muted">
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
                <p className="rounded-2xl border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
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
            className="text-sm font-semibold text-brand-400 hover:underline"
          >
            {showMoreDetails ? 'Hide optional details' : 'Add optional details'}
          </button>

          {showMoreDetails ? (
            <div className="mt-4 space-y-6">
              <StudioPanel title="Optional extras" description="Skip these if you like. You can add them later.">
                <div className="grid gap-4">
                  <label className="space-y-2 text-sm text-fg-muted">
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
                  <label className="space-y-2 text-sm text-fg-muted">
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
                  <label className="space-y-2 text-sm text-fg-muted">
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

      </div>
    );
  } else if (currentStep === 2) {
    stepContent = (
      <div className="space-y-6">
        <StudioPanel
          title="Who can watch this course?"
          description="Courses aren't sold one by one. Members get every course through the Courses plan (or All-Access). Set that price in Admin → Pricing."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                value: 'paid',
                title: 'Courses members',
                body: 'Anyone with Courses or All-Access. Lessons you tick as preview stay open to everyone.',
              },
              {
                value: 'free',
                title: 'Free for everyone',
                body: 'Any signed-in user can watch every lesson. Good for an intro course.',
              },
            ].map((opt) => {
              const active = form.pricingType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, pricingType: opt.value, price: 0 }))}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active ? 'border-brand-500 bg-brand-500/10' : 'border-line bg-ink-900 hover:border-fg-subtle'
                  }`}
                >
                  <p className="text-sm font-semibold text-fg">{opt.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-fg-muted">{opt.body}</p>
                </button>
              );
            })}
          </div>
        </StudioPanel>
      </div>
    );
  } else if (currentStep === 3) {
    stepContent = (
      <div className="space-y-4">
        <p className="text-sm text-fg-subtle">
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
              <span className="rounded-full bg-ink-800 px-3 py-1 text-xs font-medium text-fg-muted">
                {lessonCount} lessons
              </span>
              <span className="rounded-full bg-ink-800 px-3 py-1 text-xs font-medium text-fg-muted">
                {form.level}
              </span>
              <span className="rounded-full bg-ink-800 px-3 py-1 text-xs font-medium text-fg-muted">
                {form.courseType}
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-fg">{form.title || 'Untitled course'}</h3>
              {form.subtitle ? <p className="mt-1 text-fg-subtle">{form.subtitle}</p> : null}
            </div>

            <p className="text-sm leading-7 text-fg-muted">
              {form.description || 'No description yet.'}
            </p>

            <p className="rounded-2xl border border-line p-4 text-sm text-fg-muted">
              Access:{' '}
              <span className="font-semibold text-fg">
                {form.pricingType === 'free' ? 'Free for everyone' : 'Courses members'}
              </span>
            </p>
          </div>
        </StudioPanel>

        <StudioPanel title="Publish" description="Save anytime. Publishing makes it live straight away.">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveDraft(false)}
              className="rounded-2xl border border-line px-4 py-3 text-sm font-medium text-fg-muted"
            >
              Save as draft
            </button>
            <button
              type="button"
              onClick={() => submitForReview()}
              disabled={submitting || !form.title.trim()}
              className="rounded-2xl bg-ink-950 px-5 py-3 text-sm font-semibold text-fg disabled:opacity-50"
            >
              {submitting ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </StudioPanel>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-line bg-ink-850 p-8 text-sm text-fg-subtle">
        Loading course studio…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-brand-600 p-6 text-white ring-1 ring-fg/10 sm:rounded-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-300">
              Course studio
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              {activeCourseId ? 'Edit course' : 'Create a course'}
            </h2>
            <p className="mt-2 text-sm text-brand-300">
              Basics, access, curriculum, then publish.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={courseStatus} />
            <button
              type="button"
              onClick={() => navigate('/creator/dashboard/courses')}
              className="inline-flex items-center gap-2 rounded-2xl border border-fg/25 bg-fg/10 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm hover:bg-fg/15"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => saveDraft(false)}
              className="rounded-2xl bg-ink-850 px-4 py-3 text-sm font-semibold text-brand-400 hover:bg-brand-500/10"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-up bg-emerald-500/10 px-4 py-3 text-sm text-up">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-down bg-rose-500/10 px-4 py-3 text-sm text-down">
            {error}
          </div>
        ) : null}
      </div>

      <WizardStepper steps={steps} currentStep={currentStep} onStepSelect={setCurrentStep} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-ink-850 p-4 sm:rounded-[32px] sm:p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div>
              <p className="text-sm font-medium text-fg-subtle">
                Step {currentStep} of {steps.length}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-fg sm:text-xl">
                {currentStepMeta.label}
              </h3>
            </div>
            <div className="rounded-full bg-ink-800 px-3 py-1 text-xs font-medium text-fg-muted">
              {currentStepMeta.description}
            </div>
          </div>

          {stepContent}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <button
              type="button"
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 1))}
              disabled={currentStep === 1}
              className="rounded-2xl border border-line px-4 py-3 text-sm font-medium text-fg-muted disabled:opacity-40"
            >
              Back
            </button>

            <div className="flex flex-wrap gap-3">
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((step) => Math.min(step + 1, steps.length))}
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Continue
                  <FiChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => submitForReview()}
                  disabled={submitting || !form.title.trim()}
                  className="rounded-2xl bg-ink-950 px-5 py-3 text-sm font-semibold text-fg disabled:opacity-50"
                >
                  {submitting ? 'Publishing…' : 'Publish'}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <StudioPanel title="Quick checklist" description="Nice to have. Only the title is required to publish.">
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
