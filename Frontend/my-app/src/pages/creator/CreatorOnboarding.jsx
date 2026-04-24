import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import WizardStepper from '../../components/creator/WizardStepper';
import StatusBadge from '../../components/creator/StatusBadge';
import { uploadFileToS3 } from '../../utils/uploadToS3';

const API_URL = import.meta.env.VITE_API_URL;

const steps = [
  { label: 'Basic account', description: 'Creator identity and contact details' },
  { label: 'Tutor profile', description: 'Professional background and trust signals' },
  { label: 'Teaching preferences', description: 'What and how you want to teach' },
  { label: 'Review and submit', description: 'Check everything before you apply' },
];

const emptyState = {
  fullName: '',
  email: '',
  phone: '',
  country: '',
  avatar: '',
  headline: '',
  bio: '',
  expertise: '',
  experienceYears: 0,
  languages: '',
  socialLinks: {
    website: '',
    youtube: '',
  },
  /** Not shown in UI; kept for API compatibility / existing records */
  certificates: [],
  idDocumentUrl: '',
  teachingCategories: '',
  preferredCourseLanguage: 'English',
  teachesFreeCourses: true,
  teachesPaidCourses: true,
  offersMentorship: false,
};

export default function CreatorOnboarding() {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creatorStatus, setCreatorStatus] = useState('not_applied');
  const [uploadProgress, setUploadProgress] = useState({ avatar: 0 });
  const hydratedRef = useRef(false);

  const summary = useMemo(
    () => [
      { label: 'Full name', value: form.fullName || 'Not provided' },
      { label: 'Email', value: form.email || 'Not provided' },
      { label: 'Phone', value: form.phone || 'Not provided' },
      { label: 'Country', value: form.country || 'Not provided' },
      { label: 'Headline', value: form.headline || 'Not provided' },
      { label: 'Expertise', value: form.expertise || 'Not provided' },
      { label: 'Languages', value: form.languages || 'Not provided' },
      { label: 'Teaching categories', value: form.teachingCategories || 'Not provided' },
      { label: 'Preferred language', value: form.preferredCourseLanguage || 'Not provided' },
    ],
    [form]
  );

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await axios.get(`${API_URL}/api/users/creator/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const nextState = {
          ...emptyState,
          fullName: data.user?.fullName || '',
          email: data.user?.email || '',
          phone: data.user?.phone || '',
          country: data.user?.country || '',
          avatar: data.user?.avatar || '',
          headline: data.tutorProfile?.headline || '',
          bio: data.tutorProfile?.bio || '',
          expertise: (data.tutorProfile?.expertise || []).join(', '),
          experienceYears: data.tutorProfile?.experienceYears || 0,
          languages: (data.tutorProfile?.languages || []).join(', '),
          socialLinks: {
            website: data.tutorProfile?.socialLinks?.website || '',
            youtube: data.tutorProfile?.socialLinks?.youtube || '',
          },
          certificates: data.tutorProfile?.certificates || [],
          teachingCategories: (data.tutorProfile?.teachingCategories || []).join(', '),
          preferredCourseLanguage: data.tutorProfile?.preferredCourseLanguage || 'English',
          teachesFreeCourses: data.tutorProfile?.teachesFreeCourses ?? true,
          teachesPaidCourses: data.tutorProfile?.teachesPaidCourses ?? true,
          offersMentorship: data.tutorProfile?.offersMentorship ?? false,
          idDocumentUrl: data.tutorProfile?.idDocumentUrl || '',
        };

        setForm(nextState);
        setCreatorStatus(data.user?.creatorStatus || data.tutorProfile?.applicationStatus || 'not_applied');
        localStorage.setItem('user', JSON.stringify(data.user));
        hydratedRef.current = true;
      } catch (loadError) {
        setError(loadError.response?.data?.message || loadError.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadProfile();
    }
  }, [token]);

  useEffect(() => {
    if (!hydratedRef.current || !token) return undefined;

    const timeoutId = setTimeout(() => {
      saveDraft(true);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [form]);

  const saveDraft = async (silent = false) => {
    try {
      setSaving(true);
      setError('');
      const [accountResponse, profileResponse] = await Promise.all([
        axios.patch(
          `${API_URL}/api/users/me/account`,
          {
            fullName: form.fullName,
            phone: form.phone,
            country: form.country,
            avatar: form.avatar,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.put(
          `${API_URL}/api/users/creator/profile`,
          {
            headline: form.headline,
            bio: form.bio,
            expertise: form.expertise.split(',').map((item) => item.trim()).filter(Boolean),
            experienceYears: Number(form.experienceYears || 0),
            languages: form.languages.split(',').map((item) => item.trim()).filter(Boolean),
            socialLinks: form.socialLinks,
            certificates: form.certificates,
            teachingCategories: form.teachingCategories.split(',').map((item) => item.trim()).filter(Boolean),
            preferredCourseLanguage: form.preferredCourseLanguage,
            teachesFreeCourses: form.teachesFreeCourses,
            teachesPaidCourses: form.teachesPaidCourses,
            offersMentorship: form.offersMentorship,
            idDocumentUrl: form.idDocumentUrl,
            avatar: form.avatar,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      localStorage.setItem('user', JSON.stringify(accountResponse.data.user));
      setCreatorStatus(profileResponse.data.user?.creatorStatus || creatorStatus);
      if (!silent) {
        setMessage('Draft saved');
      }
    } catch (saveError) {
      const data = saveError.response?.data;
      const validationMsg = Array.isArray(data?.errors)
        ? data.errors.map((e) => e.msg || e.message).filter(Boolean).join(' ')
        : '';
      setError(validationMsg || data?.message || saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (field, file, type = 'image') => {
    if (!file) return;

    try {
      const uploadedUrl = await uploadFileToS3({
        file,
        token,
        type,
        onProgress: (progress) =>
          setUploadProgress((current) => ({ ...current, [field]: progress })),
      });

      if (field === 'avatar') {
        setForm((current) => ({ ...current, avatar: uploadedUrl }));
      }
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message);
    } finally {
      setUploadProgress((current) => ({ ...current, [field]: 0 }));
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      await saveDraft(true);
      const { data } = await axios.post(
        `${API_URL}/api/users/creator/profile/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem('user', JSON.stringify(data.user));
      setCreatorStatus(data.user?.creatorStatus || 'pending');
      setMessage(data.message);

      if (data.user?.creatorStatus === 'approved') {
        navigate('/creator/dashboard');
      }
    } catch (submitError) {
      setError(submitError.response?.data?.message || submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateSocialLink = (field, value) => {
    setForm((current) => ({
      ...current,
      socialLinks: {
        ...current.socialLinks,
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center">
            <div className="mx-auto h-10 w-10 rounded-full border-4 border-blue-700 border-t-transparent animate-spin" />
            <p className="mt-4 text-sm text-slate-500">Loading your creator onboarding workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-[32px] bg-blue-900 p-8 text-white ring-1 ring-white/10">
          <p className="text-sm font-medium text-blue-100">Creator onboarding</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Become a tutor on Quick X</h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
                Build a polished public instructor profile, get approved by the team, and start publishing
                courses with a step-by-step workflow designed for serious creators.
              </p>
            </div>
            <StatusBadge status={creatorStatus} />
          </div>
        </div>

        <div className="mt-6">
          <WizardStepper steps={steps} currentStep={currentStep} />
        </div>

        <div className="mt-6 rounded-[32px] border border-slate-200/80 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{steps[currentStep - 1].label}</h2>
              <p className="mt-1 text-sm text-slate-500">{steps[currentStep - 1].description}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => saveDraft(false)}
                disabled={saving}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                {saving ? 'Saving...' : 'Save draft'}
              </button>
              <Link
                to={creatorStatus === 'approved' ? '/creator/dashboard' : '/'}
                className="text-sm font-medium text-blue-800"
              >
                Exit
              </Link>
            </div>
          </div>

          {message ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          {currentStep === 1 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600">
                <span>Full name</span>
                <input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span>Email</span>
                <input value={form.email} disabled className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span>Phone number</span>
                <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span>Country</span>
                <input value={form.country} onChange={(event) => updateField('country', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>

              <div className="md:col-span-2 rounded-3xl border border-dashed border-slate-300 p-5">
                <p className="text-sm font-medium text-slate-700">Profile picture</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="relative group overflow-hidden h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200">
                    {form.avatar ? (
                      <img 
                        src={form.avatar} 
                        alt="" 
                        className="h-full w-full object-cover" 
                        onError={() => setForm(f => ({ ...f, avatar: '' }))}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer rounded-2xl bg-blue-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600">
                        {form.avatar ? 'Change photo' : 'Upload photo'}
                        <input type="file" className="hidden" accept="image/*" onChange={(event) => handleUpload('avatar', event.target.files?.[0], 'image')} />
                      </label>
                      
                      {form.avatar && (
                        <button 
                          type="button" 
                          onClick={() => updateField('avatar', '')}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {uploadProgress.avatar > 0 ? <p className="text-xs font-medium text-blue-800">Uploading {uploadProgress.avatar}%</p> : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="mt-6 space-y-5">
              <label className="block space-y-2 text-sm text-slate-600">
                <span>Professional headline</span>
                <input value={form.headline} onChange={(event) => updateField('headline', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <label className="block space-y-2 text-sm text-slate-600">
                <span>Bio / about instructor</span>
                <textarea value={form.bio} onChange={(event) => updateField('bio', event.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>
              <div className="grid gap-5 md:grid-cols-3">
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Areas of expertise</span>
                  <input value={form.expertise} onChange={(event) => updateField('expertise', event.target.value)} placeholder="Forex, risk management" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Years of experience</span>
                  <input type="number" min="0" value={form.experienceYears} onChange={(event) => updateField('experienceYears', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                </label>
                <label className="space-y-2 text-sm text-slate-600">
                  <span>Languages spoken</span>
                  <input value={form.languages} onChange={(event) => updateField('languages', event.target.value)} placeholder="English, French" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                </label>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700">Social links</p>
                <p className="mt-1 text-sm text-slate-500">Optional — share your website or YouTube channel if you want.</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>Website (optional)</span>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="https://"
                      value={form.socialLinks.website}
                      onChange={(event) => updateSocialLink('website', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-600">
                    <span>YouTube (optional)</span>
                    <input
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="https://youtube.com/…"
                      value={form.socialLinks.youtube}
                      onChange={(event) => updateSocialLink('youtube', event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="mt-6 space-y-5">
              <label className="block space-y-2 text-sm text-slate-600">
                <span>Categories you want to teach in</span>
                <input value={form.teachingCategories} onChange={(event) => updateField('teachingCategories', event.target.value)} placeholder="Forex, crypto, web development" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              </label>

              <label className="block space-y-2 text-sm text-slate-600">
                <span>Preferred course language</span>
                <select value={form.preferredCourseLanguage} onChange={(event) => updateField('preferredCourseLanguage', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="English">English</option>
                  <option value="French">French</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="rounded-3xl border border-slate-200 p-4">
                  <input type="checkbox" checked={form.teachesFreeCourses} onChange={(event) => updateField('teachesFreeCourses', event.target.checked)} />
                  <p className="mt-3 font-semibold text-slate-950">Offer free courses</p>
                  <p className="mt-1 text-sm text-slate-500">Great for lead generation and trust-building.</p>
                </label>
                <label className="rounded-3xl border border-slate-200 p-4">
                  <input type="checkbox" checked={form.teachesPaidCourses} onChange={(event) => updateField('teachesPaidCourses', event.target.checked)} />
                  <p className="mt-3 font-semibold text-slate-950">Offer paid courses</p>
                  <p className="mt-1 text-sm text-slate-500">Unlock commission-based monetization on sales.</p>
                </label>
                <label className="rounded-3xl border border-slate-200 p-4">
                  <input type="checkbox" checked={form.offersMentorship} onChange={(event) => updateField('offersMentorship', event.target.checked)} />
                  <p className="mt-3 font-semibold text-slate-950">Offer mentorship</p>
                  <p className="mt-1 text-sm text-slate-500">Enable premium one-on-one or cohort support later.</p>
                </label>
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="mt-6 space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-950">Application summary</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {summary.map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white p-4">
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-2 font-medium text-slate-950">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-blue-900/15 bg-blue-900/[0.06] p-5">
                <p className="text-sm text-blue-900">
                  Once you submit, your application can be approved, rejected, or suspended by the admin team.
                  Approved creators get instant access to the full course dashboard and upload workflow.
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 1))}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 disabled:opacity-40"
            >
              Back
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep((step) => Math.min(step + 1, steps.length))}
                className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-600"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit tutor application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
