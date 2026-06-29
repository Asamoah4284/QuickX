import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  FiArrowLeft,
  FiBookOpen,
  FiCheckCircle,
  FiChevronRight,
  FiLayers,
  FiPackage,
  FiTarget,
  FiUploadCloud,
} from 'react-icons/fi';
import WizardStepper from '../../components/creator/WizardStepper';
import CurriculumBuilder from '../../components/creator/CurriculumBuilder';
import StatusBadge from '../../components/creator/StatusBadge';
import { uploadFileToS3 } from '../../utils/uploadToS3';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

const API_URL = import.meta.env.VITE_API_URL;

const steps = [
  { label: 'Landing page', description: 'Title, thumbnail, promo media, and description' },
  { label: 'Learning promise', description: 'Outcomes, audience, and prerequisites' },
  { label: 'Pricing', description: 'Monetization, discounting, and certificate setup' },
  { label: 'Curriculum', description: 'Modules, sections, lessons, and preview strategy' },
  { label: 'Resources', description: 'Downloads, worksheets, and supporting links' },
  { label: 'Review & publish', description: 'Quality check, readiness review, and submission' },
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

function StudioPanel({ title, description, children, tone = 'light' }) {
  const isDark = tone === 'dark';
  const styles = isDark
    ? 'border-white/10 bg-[#1B5EF5] text-white shadow-none ring-1 ring-white/10'
    : 'border-slate-200/80 bg-white text-slate-950';

  const padding = isDark ? 'p-4 sm:p-5' : 'p-6';

  return (
    <section className={`rounded-[28px] border ${padding} ${styles}`}>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? (
          <p className={`mt-1 text-sm ${isDark ? 'text-blue-100/85' : 'text-slate-500'}`}>
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function ChecklistRow({ done, label, hint }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div
        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
          done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <FiCheckCircle className="h-4 w-4" />
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'text-slate-950' : 'text-slate-700'}`}>{label}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function StepIntro({ eyebrow, title, description }) {
  return (
    <div className="mb-6 border-b border-slate-200 pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-semibold text-slate-950 sm:text-2xl">{title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

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
  const [uploadProgress, setUploadProgress] = useState({ thumbnail: 0, promoVideo: 0 });
  const [thumbnailPreviewFailed, setThumbnailPreviewFailed] = useState(false);
  const [subscriptionPricing, setSubscriptionPricing] = useState({ month1: 49, month2: 89, year1: 399 });
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
          month1: Number(sp?.month1 ?? 49) || 0,
          month2: Number(sp?.month2 ?? 89) || 0,
          year1: Number(sp?.year1 ?? 399) || 0,
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
          module.sections.reduce(
            (sectionCount, section) => sectionCount + section.lessons.length,
            0
          ),
        0
      ),
    [form.modules]
  );

  const sectionCount = useMemo(
    () => form.modules.reduce((count, module) => count + module.sections.length, 0),
    [form.modules]
  );

  const learningOutcomes = useMemo(() => textToList(form.learningOutcomes), [form.learningOutcomes]);
  const prerequisites = useMemo(() => textToList(form.requirements), [form.requirements]);
  const targetAudience = useMemo(() => textToList(form.targetAudience), [form.targetAudience]);
  const skillsGained = useMemo(() => textToList(form.skillsGained), [form.skillsGained]);

  const checklist = useMemo(
    () => [
      {
        done: Boolean(form.title.trim()),
        label: 'Clear course title',
        hint: 'A strong title makes your course immediately understandable.',
      },
      {
        done: Boolean(form.description.trim()),
        label: 'Course description',
        hint: 'Explain the teaching style, journey, and why students should trust this course.',
      },
      {
        done: Boolean(form.thumbnail),
        label: 'Thumbnail uploaded',
        hint: 'Visual branding builds trust and improves click-through.',
      },
      {
        done: learningOutcomes.length > 0,
        label: 'Learning outcomes defined',
        hint: 'Show students exactly what they will achieve.',
      },
      {
        done: lessonCount > 0,
        label: 'Curriculum contains lessons',
        hint: 'At least one real lesson should exist before review.',
      },
      {
        done: Boolean(form.category.trim()) && Boolean(form.level.trim()),
        label: 'Metadata completed',
        hint: 'Category and level help discovery and relevance.',
      },
    ],
    [form.category, form.description, form.level, form.thumbnail, form.title, learningOutcomes.length, lessonCount]
  );

  const completedChecklistCount = checklist.filter((item) => item.done).length;
  const readyToSubmit = Boolean(form.title.trim());

  const buildPayload = () => ({
    title: form.title,
    subtitle: form.subtitle,
    category: form.category,
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
      if (!silent) {
        setMessage('Draft saved successfully.');
      }

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
          month1: Math.max(0, Math.round(Number(subscriptionPricing.month1) || 0)),
          month2: Math.max(0, Math.round(Number(subscriptionPricing.month2) || 0)),
          year1: Math.max(0, Math.round(Number(subscriptionPricing.year1) || 0)),
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

  const handleUpload = async (field, file, type) => {
    if (!file) return;
    try {
      setError('');
      const uploadedUrl = await uploadFileToS3({
        file,
        token,
        type,
        onProgress: (progress) =>
          setUploadProgress((current) => ({ ...current, [field]: progress })),
      });

      setForm((current) => ({ ...current, [field]: uploadedUrl }));
      setMessage(`${field === 'thumbnail' ? 'Thumbnail' : 'Promo video'} uploaded successfully.`);
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message);
    } finally {
      setUploadProgress((current) => ({ ...current, [field]: 0 }));
    }
  };

  const addMaterial = () => {
    setForm((current) => ({
      ...current,
      additionalMaterials: [
        ...current.additionalMaterials,
        { title: '', type: 'file', url: '', thumbnail: '' },
      ],
    }));
  };

  const updateMaterial = (index, field, value) => {
    setForm((current) => ({
      ...current,
      additionalMaterials: current.additionalMaterials.map((material, currentIndex) =>
        currentIndex === index ? { ...material, [field]: value } : material
      ),
    }));
  };

  const removeMaterial = (index) => {
    setForm((current) => ({
      ...current,
      additionalMaterials: current.additionalMaterials.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const submitForReview = async (action = 'submit') => {
    try {
      setSubmitting(true);
      setError('');
      const savedCourse = await saveDraft(true);
      const courseIdToUse = savedCourse?._id || activeCourseId;

      if (!courseIdToUse) {
        setError('Save the course first before submitting it for review.');
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
      setMessage(data.message || 'Course updated successfully.');
    } catch (submitError) {
      setError(submitError.response?.data?.message || submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentStepMeta = steps[currentStep - 1];

  const stepContent = (() => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <StepIntro
            eyebrow="Landing page"
            title="Build a landing page students trust"
            description="Strong title, sharp thumbnail, clear description, and metadata that helps discovery."
          />

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <StudioPanel
              title="Course identity"
              description="Define the course title, track, and searchable metadata."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Course title</span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Example: Forex price action for beginner traders"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Subtitle</span>
                  <input
                    value={form.subtitle}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, subtitle: event.target.value }))
                    }
                    placeholder="Clarify the promise and audience"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Category</span>
                  <input
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value }))
                    }
                    placeholder="Forex"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Subcategory</span>
                  <input
                    value={form.subcategory}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, subcategory: event.target.value }))
                    }
                    placeholder="Price action"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Track</span>
                  <select
                    value={form.courseType}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, courseType: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
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
                    onChange={(event) =>
                      setForm((current) => ({ ...current, level: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>
                <label className="md:col-span-2 space-y-2 text-sm text-slate-600">
                  <span>Primary language</span>
                  <input
                    value={form.language}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, language: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </label>
              </div>
            </StudioPanel>

            <StudioPanel
              title="Media assets"
              description="Upload the visual and video assets that make the course page feel polished."
            >
              <div className="space-y-5">
                <div className="space-y-2 text-sm text-slate-600">
                  <span>Course thumbnail</span>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(event) => handleUpload('thumbnail', event.target.files?.[0], 'image')}
                    />
                    <FiUploadCloud className="h-6 w-6 text-slate-400" />
                    <span className="mt-3 font-medium text-slate-700">
                      {uploadProgress.thumbnail > 0
                        ? `Uploading ${uploadProgress.thumbnail}%`
                        : 'Upload thumbnail'}
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      Use a clean, high-contrast image that feels marketplace-ready.
                    </span>
                  </label>
                  {form.thumbnail ? (
                    <div className="space-y-2">
                      <img
                        src={publicAssetUrl(form.thumbnail)}
                        alt=""
                        className="h-44 w-full rounded-3xl object-cover"
                        onLoad={() => setThumbnailPreviewFailed(false)}
                        onError={() => setThumbnailPreviewFailed(true)}
                      />
                      {thumbnailPreviewFailed ? (
                        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          The file uploaded, but the preview URL is not readable in the browser. S3 objects are
                          private by default — add a bucket policy that allows <code className="text-[11px]">s3:GetObject</code>{' '}
                          for your bucket (see <code className="text-[11px]">Backend/s3-bucket-policy-public-read-example.json</code>
                          ) or open the URL in a new tab to confirm a 403.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <span>Promo video</span>
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                    <input
                      type="file"
                      className="hidden"
                      accept="video/*"
                      onChange={(event) => handleUpload('promoVideo', event.target.files?.[0], 'video')}
                    />
                    <FiUploadCloud className="h-6 w-6 text-slate-400" />
                    <span className="mt-3 font-medium text-slate-700">
                      {uploadProgress.promoVideo > 0
                        ? `Uploading ${uploadProgress.promoVideo}%`
                        : 'Upload promo video'}
                    </span>
                    <span className="mt-1 text-xs text-slate-500">
                      Introduce the instructor, outcomes, and transformation in under 2 minutes.
                    </span>
                  </label>
                  {form.promoVideo ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs break-all text-slate-500">
                      {form.promoVideo}
                    </p>
                  ) : null}
                </div>
              </div>
            </StudioPanel>
          </div>

          <StudioPanel
            title="Course description"
            description="Explain the teaching style, journey, and why students should trust this course."
          >
            <div className="space-y-4">
              <label className="space-y-2 text-sm text-slate-600">
                <span>Short description <span className="text-slate-400">(shown in search results &amp; cards)</span></span>
                <textarea
                  value={form.shortDescription}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, shortDescription: event.target.value }))
                  }
                  rows={2}
                  maxLength={250}
                  placeholder="One or two sentences that hook potential students — keep it punchy."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span>Full description</span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={8}
                  placeholder="Explain the teaching style, journey, and why students should trust this course."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>
          </StudioPanel>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <StepIntro
            eyebrow="Learning promise"
            title="Clarify the transformation students will buy into"
            description="Professional course pages make outcomes obvious. Use one line per idea so your value proposition becomes easy to scan."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <StudioPanel
              title="What students will learn"
              description="List concrete outcomes learners can achieve by the end of the course."
            >
              <textarea
                value={form.learningOutcomes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, learningOutcomes: event.target.value }))
                }
                rows={8}
                placeholder="One outcome per line"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
            </StudioPanel>

            <StudioPanel
              title="Requirements and target audience"
              description="Set expectations so the right learners enroll and complete the course."
            >
              <div className="grid gap-4">
                <textarea
                  value={form.requirements}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, requirements: event.target.value }))
                  }
                  rows={4}
                  placeholder="One prerequisite per line"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
                <textarea
                  value={form.targetAudience}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, targetAudience: event.target.value }))
                  }
                  rows={4}
                  placeholder="One audience type per line"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </div>
            </StudioPanel>
          </div>

          <StudioPanel
            title="Skills gained"
            description="Use this list as a quick scan summary for results-oriented learners."
          >
            <textarea
              value={form.skillsGained}
              onChange={(event) =>
                setForm((current) => ({ ...current, skillsGained: event.target.value }))
              }
              rows={5}
              placeholder="One skill per line"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </StudioPanel>
        </div>
      );
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-6">
          <StepIntro
            eyebrow="Pricing"
            title="Design the monetization layer"
            description="Set your subscription pricing for full access. Learners will subscribe to you and unlock all of your courses."
          />

          <StudioPanel
            title="Subscription pricing (full access)"
            description="Set the 3 prices learners see when subscribing to you."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-2 text-sm text-slate-600">
                <span>1 month (GHS)</span>
                <input
                  type="number"
                  min="0"
                  value={subscriptionPricing.month1}
                  onChange={(e) => setSubscriptionPricing((cur) => ({ ...cur, month1: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span>2 months (GHS)</span>
                <input
                  type="number"
                  min="0"
                  value={subscriptionPricing.month2}
                  onChange={(e) => setSubscriptionPricing((cur) => ({ ...cur, month2: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span>1 year (GHS)</span>
                <input
                  type="number"
                  min="0"
                  value={subscriptionPricing.year1}
                  onChange={(e) => setSubscriptionPricing((cur) => ({ ...cur, year1: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-medium text-slate-700">Preview</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  { label: '1 month', value: subscriptionPricing.month1 },
                  { label: '2 months', value: subscriptionPricing.month2 },
                  { label: '1 year', value: subscriptionPricing.year1 },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      GH{String.fromCharCode(0x20b5)}
                      {Number(item.value || 0).toLocaleString('en-GH', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Full access</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-600">
                Saved to your creator profile and shown on your instructor subscription drawer.
              </p>
              <button
                type="button"
                onClick={() => saveSubscriptionPricing(false)}
                disabled={subscriptionPricingSaving}
                className="rounded-xl bg-[#1B5EF5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1552D6] disabled:opacity-60"
              >
                {subscriptionPricingSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </StudioPanel>
        </div>
      );
    }

    if (currentStep === 4) {
      return (
        <div className="space-y-6">
          <StepIntro
            eyebrow="Curriculum"
            title="Build a studio-grade course structure"
            description="Design your curriculum the way large marketplaces do: chapter flow, section goals, lesson formats, preview strategy, and clear sequencing."
          />

          <CurriculumBuilder
            value={form.modules}
            authToken={token}
            onChange={(nextModules) => setForm((current) => ({ ...current, modules: nextModules }))}
          />
        </div>
      );
    }

    if (currentStep === 5) {
      return (
        <div className="space-y-6">
          <StepIntro
            eyebrow="Resources"
            title="Add support materials that improve completion"
            description="Worksheets, downloadable files, references, and links make the course feel more premium and more actionable."
          />

          <StudioPanel
            title="Additional materials"
            description="Every item should add practical value beyond the videos themselves."
          >
            <div className="space-y-4">
              {form.additionalMaterials.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                  No support materials added yet. Add templates, cheat sheets, files, or helpful links.
                </div>
              ) : null}

              {form.additionalMaterials.map((material, index) => (
                <div
                  key={`material-${index}`}
                  className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4"
                >
                  <input
                    value={material.title}
                    onChange={(event) => updateMaterial(index, 'title', event.target.value)}
                    placeholder="Material title"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                  <select
                    value={material.type}
                    onChange={(event) => updateMaterial(index, 'type', event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="file">Downloadable file</option>
                    <option value="worksheet">Worksheet</option>
                    <option value="link">External link</option>
                    <option value="reference">Reference</option>
                  </select>
                  <input
                    value={material.url}
                    onChange={(event) => updateMaterial(index, 'url', event.target.value)}
                    placeholder="URL"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      value={material.thumbnail}
                      onChange={(event) => updateMaterial(index, 'thumbnail', event.target.value)}
                      placeholder="Thumbnail URL"
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addMaterial}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Add material
              </button>
            </div>
          </StudioPanel>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <StepIntro
          eyebrow="Review & publish"
          title="Review the course like a marketplace quality reviewer"
          description="Before you submit, confirm the landing page, pricing, curriculum, and conversion essentials all work together."
        />

        <StudioPanel
          title="Course landing page preview"
          description="This summary mirrors the details students and reviewers care about most."
        >
          <div className="space-y-6">
            {form.thumbnail ? (
              <img src={publicAssetUrl(form.thumbnail)} alt="" className="h-72 w-full rounded-3xl object-cover" />
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
              <h3 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
                {form.title || 'Untitled course'}
              </h3>
              <p className="mt-2 text-lg text-slate-500">{form.subtitle}</p>
            </div>

            <p className="text-sm leading-7 text-slate-600">
              {form.description || 'Add a description to make the value clear.'}
            </p>

            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Price</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {form.pricingType === 'free'
                    ? 'Free'
                    : `GH${String.fromCharCode(0x20b5)}${Number(form.price || 0).toFixed(2)}`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Learning outcomes</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{learningOutcomes.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Sections</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{sectionCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Certificate</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {form.certificateEnabled ? 'Included' : 'No'}
                </p>
              </div>
            </div>
          </div>
        </StudioPanel>

        <StudioPanel
          title="Publishing actions"
          description="Save the draft, send it for moderation, or publish directly if admin auto-approval is enabled."
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Save drafts anytime. Submit for review when the course is ready, or publish now if
              auto-approval is enabled by admin.
            </div>

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
                {submitting ? 'Processing...' : 'Submit for review'}
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
          </div>
        </StudioPanel>
      </div>
    );
  })();

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-sm text-slate-500">
        Loading course studio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#1B5EF5] p-6 text-white ring-1 ring-white/10 sm:rounded-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-blue-100/90">
              Course studio
            </p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
              {activeCourseId ? 'Refine and publish your course' : 'Build your next premium course'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-blue-100/85">
              This studio is designed like a serious creator workspace: clean planning, strong
              landing page control, professional curriculum sequencing, and a clear publish path.
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
              Back to courses
            </button>
            <button
              type="button"
              onClick={() => saveDraft(false)}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#1B5EF5] hover:bg-blue-50"
            >
              {saving ? 'Saving...' : 'Save draft'}
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
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
              <button
                type="button"
                onClick={() => setCurrentStep(steps.length)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Jump to review
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (currentStep === 3) {
                    await saveSubscriptionPricing(true);
                  }
                  setCurrentStep((step) => Math.min(step + 1, steps.length));
                }}
                disabled={currentStep === steps.length}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1B5EF5] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1552D6] disabled:opacity-40"
              >
                Continue
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <StudioPanel
            title="Submission checklist"
            description="These are the minimum quality signals before launch."
          >
            <div className="space-y-3">
              {checklist.map((item) => (
                <ChecklistRow
                  key={item.label}
                  done={item.done}
                  label={item.label}
                  hint={item.hint}
                />
              ))}
            </div>
          </StudioPanel>
        </aside>
      </div>
    </div>
  );
}
