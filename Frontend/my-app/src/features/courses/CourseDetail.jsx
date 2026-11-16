import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiCheck, FiChevronDown, FiLock, FiPlay } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { cx, durationLabel, money } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { Alert, Badge, Button, Card, Container, PageLoader } from '../../ui/primitives';
import { Modal } from '../../ui/overlays';
import { Reveal } from '../../ui/motion';

const LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function isImage(url) {
  return typeof url === 'string' && /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url);
}

/** Flatten modules → sections into one list of sections, each with its lessons. */
function toSections(course) {
  return (course.modules || []).flatMap((mod) =>
    (mod.sections || []).map((sec) => ({
      id: String(sec._id || `${mod.title}-${sec.title}`),
      title: sec.title || mod.title,
      lessons: (sec.lessons || []).map((lesson) => ({
        id: String(lesson._id),
        title: lesson.title,
        duration: lesson.duration,
        isPreview: lesson.isPreview === true,
        videoUrl: lesson.isPreview === true ? lesson.videoUrl || lesson.filePath || '' : '',
      })),
    }))
  );
}

function Section({ section, open, onToggle, onPlay, unlocked }) {
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
      >
        <span className="font-semibold text-fg">{section.title}</span>
        <span className="flex items-center gap-3 text-sm text-fg-subtle">
          {section.lessons.length} lessons
          <FiChevronDown className={cx('h-4 w-4 transition-transform duration-300', open && 'rotate-180')} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {section.lessons.map((lesson) => {
              const playable = lesson.isPreview && lesson.videoUrl;
              return (
                <li key={lesson.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-3 text-fg-muted">
                    {unlocked || lesson.isPreview ? (
                      <FiPlay className="h-4 w-4 shrink-0 text-brand-400" />
                    ) : (
                      <FiLock className="h-4 w-4 shrink-0 text-fg-subtle" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {lesson.duration ? <span className="tabular text-xs text-fg-subtle">{lesson.duration}</span> : null}
                    {playable && !unlocked ? (
                      <button
                        type="button"
                        onClick={() => onPlay(lesson)}
                        className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/25"
                      >
                        Preview
                      </button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const { isSignedIn, has } = useAuth();
  const { data: course, loading, error } = useApi(`/api/courses/${courseId}/preview`);
  const owned = useApi(isSignedIn ? '/api/courses/user/purchased' : null);
  const products = useApi('/api/products');
  const [openSection, setOpenSection] = useState(0);
  const [playing, setPlaying] = useState(null);

  const sections = useMemo(() => (course ? toSections(course) : []), [course]);
  const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);
  const previewCount = sections.reduce((n, s) => n + s.lessons.filter((l) => l.isPreview).length, 0);

  if (loading) return <PageLoader label="Loading course" />;
  if (error || !course) {
    return (
      <Container className="py-16">
        <Alert className="mx-auto max-w-xl">{error?.message || 'Course not found.'}</Alert>
        <div className="mt-6 text-center">
          <Button to="/courses" variant="secondary">
            All courses
          </Button>
        </div>
      </Container>
    );
  }

  const free = course.pricingType === 'free' && Number(course.price || 0) <= 0;
  // Access: the Courses feature, a free course, or a course bought outright earlier.
  // (The server makes the final decision when the player loads.)
  const boughtBefore = (owned.data || []).some((c) => String(c.id) === String(course._id)) && !has('courses');
  const unlocked = isSignedIn && (has('courses') || free || boughtBefore);
  const plan = (products.data?.products || []).find((p) => p.grants.length === 1 && p.grants[0] === 'courses');
  const bundle = (products.data?.products || []).find((p) => p.grants.length > 1);
  const thumb = isImage(course.thumbnail) ? publicAssetUrl(course.thumbnail) : null;

  return (
    <>
      <Helmet>
        <title>{`${course.title} | QuickX`}</title>
      </Helmet>
      <Container className="py-10 sm:py-14">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-fg-muted transition hover:text-fg">
          <FiArrowLeft className="h-4 w-4" />
          All courses
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Reveal>
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{LEVELS[course.level] || 'All levels'}</Badge>
                <Badge>{lessonCount} lessons</Badge>
                {previewCount ? <Badge tone="up">{previewCount} free previews</Badge> : null}
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-fg sm:text-4xl">{course.title}</h1>
              {course.shortDescription || course.subtitle ? (
                <p className="mt-3 text-lg text-fg-muted">{course.shortDescription || course.subtitle}</p>
              ) : null}
            </Reveal>

            {course.learningOutcomes?.length ? (
              <Reveal delay={0.05}>
                <Card className="mt-8 p-6">
                  <h2 className="font-semibold text-fg">What you will learn</h2>
                  <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    {course.learningOutcomes.map((item) => (
                      <li key={item} className="flex gap-3 text-fg-muted">
                        <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            ) : null}

            <Reveal delay={0.1}>
              <h2 className="mb-4 mt-10 text-xl font-bold text-fg">Course content</h2>
              <Card className="overflow-hidden">
                {sections.map((section, i) => (
                  <Section
                    key={section.id}
                    section={section}
                    open={openSection === i}
                    onToggle={() => setOpenSection(openSection === i ? -1 : i)}
                    onPlay={setPlaying}
                    unlocked={unlocked}
                  />
                ))}
              </Card>
            </Reveal>

            {course.description ? (
              <Reveal delay={0.1}>
                <h2 className="mb-3 mt-10 text-xl font-bold text-fg">About this course</h2>
                <p className="whitespace-pre-line text-fg-muted">{course.description}</p>
              </Reveal>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Reveal delay={0.08}>
              <Card className="overflow-hidden">
                <div className="aspect-video bg-ink-700">
                  {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-6">
                  {unlocked ? (
                    <>
                      <p className="text-sm text-fg-muted">You have access to this course.</p>
                      <Button to={`/school/course/${course._id}`} size="lg" className="mt-4 w-full">
                        <FiPlay className="h-4 w-4" />
                        {boughtBefore || has('courses') ? 'Continue watching' : 'Start for free'}
                      </Button>
                    </>
                  ) : free ? (
                    <>
                      <p className="text-sm text-fg-muted">This course is free. Create an account to start.</p>
                      <Button to="/register" size="lg" className="mt-4 w-full">
                        Start for free
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-fg-muted">Included with Courses access, along with every other course.</p>
                      {plan ? (
                        <p className="mt-3 flex items-baseline gap-2">
                          <span className="tabular text-3xl font-bold text-fg">{money(plan.price)}</span>
                          <span className="text-sm text-fg-subtle">/ {durationLabel(plan.durationDays)}</span>
                        </p>
                      ) : null}
                      <Button to={`/checkout/plan/${plan?.key || 'courses'}`} size="lg" className="mt-4 w-full">
                        Get Courses access
                      </Button>
                      {bundle ? (
                        <Button to={`/checkout/plan/${bundle.key}`} variant="secondary" className="mt-3 w-full">
                          Or {bundle.name} · <span className="tabular">{money(bundle.price)}</span>
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </Card>
            </Reveal>
          </aside>
        </div>
      </Container>

      <Modal open={Boolean(playing)} onClose={() => setPlaying(null)} title={playing?.title} size="lg">
        {playing ? (
          <video
            key={playing.id}
            src={publicAssetUrl(playing.videoUrl)}
            controls
            autoPlay
            playsInline
            controlsList="nodownload"
            className="aspect-video w-full rounded-xl bg-black"
          />
        ) : null}
      </Modal>
    </>
  );
}
