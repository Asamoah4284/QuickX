import { useState } from 'react';
import { FiArrowDown, FiArrowUp, FiMenu, FiPlus, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { uploadFileToS3 } from '../../utils/uploadToS3';

const lessonTypes = ['video', 'text', 'pdf', 'resource', 'quiz', 'assignment'];

function createLesson(index = 0) {
  return {
    title: '',
    description: '',
    lessonType: 'video',
    type: 'video',
    duration: '',
    videoUrl: '',
    pdfUrl: '',
    textContent: '',
    resourceUrl: '',
    resources: [],
    isPreview: false,
    isLocked: true,
    order: index + 1,
  };
}

function createSection(index = 0) {
  return {
    title: '',
    description: '',
    order: index + 1,
    lessons: [createLesson()],
  };
}

function reindex(items) {
  return items.map((item, index) => ({ ...item, order: index + 1 }));
}

function getLessonContentKey(type) {
  switch (type) {
    case 'pdf':
      return 'pdfUrl';
    case 'text':
    case 'quiz':
    case 'assignment':
      return 'textContent';
    case 'resource':
      return 'resourceUrl';
    case 'video':
    default:
      return 'videoUrl';
  }
}

function getLessonContentLabel(type) {
  switch (type) {
    case 'pdf':
      return 'PDF file URL';
    case 'text':
      return 'Lesson notes';
    case 'quiz':
      return 'Quiz instructions';
    case 'assignment':
      return 'Assignment brief';
    case 'resource':
      return 'Resource URL';
    case 'video':
    default:
      return 'Video';
  }
}

function countLessons(modules) {
  return modules.reduce(
    (total, module) =>
      total +
      (module.sections || []).reduce(
        (sectionTotal, section) => sectionTotal + (section.lessons || []).length,
        0
      ),
    0
  );
}

function countSections(modules) {
  return modules.reduce((total, module) => total + (module.sections || []).length, 0);
}

function StudioStat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function lessonUploadKey(moduleIndex, sectionIndex, lessonIndex) {
  return `${moduleIndex}-${sectionIndex}-${lessonIndex}`;
}

export default function CurriculumBuilder({ value, onChange, authToken }) {
  const token = authToken ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
  const modules = Array.isArray(value) ? value : [];

  const [videoUploadProgress, setVideoUploadProgress] = useState({});
  const [videoUploadError, setVideoUploadError] = useState({});
  const [draggingLesson, setDraggingLesson] = useState(null);
  const [dropLessonTarget, setDropLessonTarget] = useState(null);

  const updateModules = (nextModules) => {
    onChange(reindex(nextModules));
  };

  const addModule = () => {
    updateModules([
      ...modules,
      {
        title: '',
        description: '',
        level: 'beginner',
        price: 0,
        order: modules.length + 1,
        sections: [createSection()],
      },
    ]);
  };

  const updateModule = (moduleIndex, patch) => {
    updateModules(
      modules.map((module, index) => (index === moduleIndex ? { ...module, ...patch } : module))
    );
  };

  const removeModule = (moduleIndex) => {
    updateModules(modules.filter((_, index) => index !== moduleIndex));
  };

  const moveModule = (moduleIndex, direction) => {
    const nextIndex = moduleIndex + direction;
    if (nextIndex < 0 || nextIndex >= modules.length) return;
    const nextModules = [...modules];
    [nextModules[moduleIndex], nextModules[nextIndex]] = [nextModules[nextIndex], nextModules[moduleIndex]];
    updateModules(nextModules);
  };

  const addSection = (moduleIndex) => {
    const module = modules[moduleIndex];
    updateModule(moduleIndex, {
      sections: [...(module.sections || []), createSection((module.sections || []).length)],
    });
  };

  const updateSection = (moduleIndex, sectionIndex, patch) => {
    const module = modules[moduleIndex];
    const sections = (module.sections || []).map((section, index) =>
      index === sectionIndex ? { ...section, ...patch } : section
    );
    updateModule(moduleIndex, { sections: reindex(sections) });
  };

  const removeSection = (moduleIndex, sectionIndex) => {
    const module = modules[moduleIndex];
    updateModule(moduleIndex, {
      sections: reindex((module.sections || []).filter((_, index) => index !== sectionIndex)),
    });
  };

  const moveSection = (moduleIndex, sectionIndex, direction) => {
    const module = modules[moduleIndex];
    const sections = [...(module.sections || [])];
    const nextIndex = sectionIndex + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    [sections[sectionIndex], sections[nextIndex]] = [sections[nextIndex], sections[sectionIndex]];
    updateModule(moduleIndex, { sections: reindex(sections) });
  };

  const addLesson = (moduleIndex, sectionIndex) => {
    const module = modules[moduleIndex];
    const section = (module.sections || [])[sectionIndex];
    const lessons = [...(section.lessons || []), createLesson((section.lessons || []).length)];
    updateSection(moduleIndex, sectionIndex, { lessons });
  };

  const updateLesson = (moduleIndex, sectionIndex, lessonIndex, patch) => {
    const module = modules[moduleIndex];
    const section = (module.sections || [])[sectionIndex];
    const lessons = (section.lessons || []).map((lesson, index) =>
      index === lessonIndex ? { ...lesson, ...patch, order: index + 1 } : lesson
    );
    updateSection(moduleIndex, sectionIndex, { lessons: reindex(lessons) });
  };

  const removeLesson = (moduleIndex, sectionIndex, lessonIndex) => {
    const module = modules[moduleIndex];
    const section = (module.sections || [])[sectionIndex];
    updateSection(moduleIndex, sectionIndex, {
      lessons: reindex((section.lessons || []).filter((_, index) => index !== lessonIndex)),
    });
  };

  const reorderLessonTo = (moduleIndex, sectionIndex, fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const module = modules[moduleIndex];
    const section = (module.sections || [])[sectionIndex];
    const lessons = [...(section.lessons || [])];
    if (toIndex >= lessons.length) return;
    const [item] = lessons.splice(fromIndex, 1);
    lessons.splice(toIndex, 0, item);
    updateSection(moduleIndex, sectionIndex, { lessons: reindex(lessons) });
  };

  const moveLesson = (moduleIndex, sectionIndex, lessonIndex, direction) => {
    reorderLessonTo(moduleIndex, sectionIndex, lessonIndex, lessonIndex + direction);
  };

  const handleLessonVideoUpload = async (moduleIndex, sectionIndex, lessonIndex, file) => {
    const key = lessonUploadKey(moduleIndex, sectionIndex, lessonIndex);
    setVideoUploadError((prev) => ({ ...prev, [key]: '' }));
    if (!file) return;
    if (!token) {
      setVideoUploadError((prev) => ({
        ...prev,
        [key]: 'You must be signed in to upload video.',
      }));
      return;
    }

    const name = (file.name || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();
    const isMov =
      name.endsWith('.mov') ||
      name.endsWith('.qt') ||
      mime === 'video/quicktime';
    const isWebFriendly =
      name.endsWith('.mp4') ||
      name.endsWith('.webm') ||
      mime === 'video/mp4' ||
      mime === 'video/webm';

    if (isMov || !isWebFriendly) {
      setVideoUploadError((prev) => ({
        ...prev,
        [key]:
          'Please upload MP4 (recommended) or WebM. .MOV and other camera formats often fail in Chrome/Edge.',
      }));
      return;
    }

    try {
      setVideoUploadProgress((prev) => ({ ...prev, [key]: 1 }));
      const url = await uploadFileToS3({
        file,
        token,
        type: 'video',
        onProgress: (pct) => setVideoUploadProgress((prev) => ({ ...prev, [key]: pct })),
      });
      updateLesson(moduleIndex, sectionIndex, lessonIndex, {
        videoUrl: url,
        type: 'video',
        lessonType: 'video',
      });
    } catch (err) {
      setVideoUploadError((prev) => ({
        ...prev,
        [key]: err.response?.data?.message || err.message || 'Upload failed',
      }));
    } finally {
      setVideoUploadProgress((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const moduleCount = modules.length;
  const sectionCount = countSections(modules);
  const lessonCount = countLessons(modules);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Curriculum designer</p>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Structure your course like a professional learning product: modules, sections, lesson
              assets, preview lectures, and clear sequencing.
            </p>
          </div>
          <button
            type="button"
            onClick={addModule}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            <FiPlus />
            Add module
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <StudioStat label="Modules" value={moduleCount} hint="Top-level chapters in your course." />
          <StudioStat label="Sections" value={sectionCount} hint="Grouped clusters inside each module." />
          <StudioStat label="Lessons" value={lessonCount} hint="Individual teaching units students consume." />
        </div>
      </div>

      {modules.map((module, moduleIndex) => {
        const sections = Array.isArray(module.sections) ? module.sections : [];
        const lessonTotal = sections.reduce(
          (total, section) => total + (Array.isArray(section.lessons) ? section.lessons.length : 0),
          0
        );

        return (
          <div
            key={module._id || `module-${moduleIndex}-${module.title || ''}`}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:rounded-[28px] sm:p-5 md:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Module {moduleIndex + 1}
                </p>
                <input
                  value={module.title}
                  onChange={(event) => updateModule(moduleIndex, { title: event.target.value })}
                  placeholder="Module title"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-lg font-semibold text-slate-950"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {sections.length} sections
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {lessonTotal} lessons
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveModule(moduleIndex, -1)}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-600"
                >
                  <FiArrowUp />
                </button>
                <button
                  type="button"
                  onClick={() => moveModule(moduleIndex, 1)}
                  className="rounded-2xl border border-slate-200 p-3 text-slate-600"
                >
                  <FiArrowDown />
                </button>
                <button
                  type="button"
                  onClick={() => removeModule(moduleIndex)}
                  className="rounded-2xl border border-rose-200 p-3 text-rose-600"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
              <textarea
                value={module.description}
                onChange={(event) => updateModule(moduleIndex, { description: event.target.value })}
                placeholder="Describe the promise of this module and how it moves students forward."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              />
              <select
                value={module.level || 'beginner'}
                onChange={(event) => updateModule(moduleIndex, { level: event.target.value })}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <input
                type="number"
                min="0"
                value={module.price || 0}
                onChange={(event) => updateModule(moduleIndex, { price: event.target.value })}
                placeholder="Module price"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
              />
            </div>

            <div className="mt-6 space-y-4">
              {sections.map((section, sectionIndex) => (
                <div
                  key={section._id || `section-${moduleIndex}-${sectionIndex}-${section.title || ''}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:rounded-3xl sm:p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          Section {sectionIndex + 1}
                        </span>
                        <span className="text-xs text-slate-400">
                          {(section.lessons || []).length} lessons
                        </span>
                      </div>
                      <input
                        value={section.title}
                        onChange={(event) =>
                          updateSection(moduleIndex, sectionIndex, { title: event.target.value })
                        }
                        placeholder="Section title"
                        className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-950"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveSection(moduleIndex, sectionIndex, -1)}
                        disabled={sectionIndex === 0}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Move section up"
                        aria-label="Move section up"
                      >
                        <FiArrowUp />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(moduleIndex, sectionIndex, 1)}
                        disabled={sectionIndex >= (sections.length || 0) - 1}
                        className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Move section down"
                        aria-label="Move section down"
                      >
                        <FiArrowDown />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSection(moduleIndex, sectionIndex)}
                        className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600"
                      >
                        Remove section
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={section.description}
                    onChange={(event) =>
                      updateSection(moduleIndex, sectionIndex, { description: event.target.value })
                    }
                    placeholder="Explain what students should accomplish in this section."
                    rows={2}
                    className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  />

                  {(section.lessons || []).length > 1 ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Drag the handle, use ↑↓, or pick a position — then save the course.
                    </p>
                  ) : null}

                  <div className="mt-3 space-y-3">
                    {(section.lessons || []).map((lesson, lessonIndex) => {
                      const contentKey = getLessonContentKey(lesson.lessonType);
                      const contentLabel = getLessonContentLabel(lesson.lessonType);
                      const contentValue = lesson[contentKey] || '';
                      const textLesson = ['text', 'quiz', 'assignment'].includes(lesson.lessonType);
                      const videoLesson = lesson.lessonType === 'video';
                      const uploadKey = lessonUploadKey(moduleIndex, sectionIndex, lessonIndex);
                      const uploadPct = videoUploadProgress[uploadKey];
                      const uploadErr = videoUploadError[uploadKey];
                      const lessonCountInSection = (section.lessons || []).length;
                      const isDropTarget =
                        dropLessonTarget?.moduleIndex === moduleIndex &&
                        dropLessonTarget?.sectionIndex === sectionIndex &&
                        dropLessonTarget?.lessonIndex === lessonIndex &&
                        draggingLesson &&
                        !(
                          draggingLesson.moduleIndex === moduleIndex &&
                          draggingLesson.sectionIndex === sectionIndex &&
                          draggingLesson.lessonIndex === lessonIndex
                        );

                      return (
                        <div
                          key={lesson._id || `lesson-${moduleIndex}-${sectionIndex}-${lessonIndex}-${lesson.videoUrl || lesson.title || ''}`}
                          onDragOver={(event) => {
                            if (
                              !draggingLesson ||
                              draggingLesson.moduleIndex !== moduleIndex ||
                              draggingLesson.sectionIndex !== sectionIndex
                            ) {
                              return;
                            }
                            event.preventDefault();
                            setDropLessonTarget({ moduleIndex, sectionIndex, lessonIndex });
                          }}
                          onDragLeave={() => {
                            setDropLessonTarget((current) =>
                              current?.moduleIndex === moduleIndex &&
                              current?.sectionIndex === sectionIndex &&
                              current?.lessonIndex === lessonIndex
                                ? null
                                : current
                            );
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (
                              !draggingLesson ||
                              draggingLesson.moduleIndex !== moduleIndex ||
                              draggingLesson.sectionIndex !== sectionIndex
                            ) {
                              return;
                            }
                            reorderLessonTo(
                              moduleIndex,
                              sectionIndex,
                              draggingLesson.lessonIndex,
                              lessonIndex
                            );
                            setDraggingLesson(null);
                            setDropLessonTarget(null);
                          }}
                          className={`min-w-0 overflow-hidden rounded-xl border bg-white p-3 transition sm:rounded-2xl sm:p-4 md:p-5 ${
                            isDropTarget
                              ? 'border-[#1B5EF5] ring-2 ring-[#1B5EF5]/20'
                              : 'border-slate-200/80'
                          } ${
                            draggingLesson?.moduleIndex === moduleIndex &&
                            draggingLesson?.sectionIndex === sectionIndex &&
                            draggingLesson?.lessonIndex === lessonIndex
                              ? 'opacity-60'
                              : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2.5">
                              {lessonCountInSection > 1 ? (
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={(event) => {
                                    setDraggingLesson({ moduleIndex, sectionIndex, lessonIndex });
                                    event.dataTransfer.effectAllowed = 'move';
                                    try {
                                      event.dataTransfer.setData('text/plain', String(lessonIndex));
                                    } catch {
                                      /* ignore */
                                    }
                                  }}
                                  onDragEnd={() => {
                                    setDraggingLesson(null);
                                    setDropLessonTarget(null);
                                  }}
                                  className="mt-0.5 cursor-grab touch-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
                                  title="Drag to reorder"
                                  aria-label={`Drag lesson ${lessonIndex + 1} to reorder`}
                                >
                                  <FiMenu className="h-4 w-4" />
                                </button>
                              ) : null}
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                                  Lesson {lessonIndex + 1}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  Decide the format, attach the teaching asset, and mark previews clearly.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {lesson.isPreview ? (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  Free preview
                                </span>
                              ) : null}
                              {lessonCountInSection > 1 ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveLesson(moduleIndex, sectionIndex, lessonIndex, -1)
                                    }
                                    disabled={lessonIndex === 0}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="Move lesson up"
                                    aria-label={`Move lesson ${lessonIndex + 1} up`}
                                  >
                                    <FiArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      moveLesson(moduleIndex, sectionIndex, lessonIndex, 1)
                                    }
                                    disabled={lessonIndex >= lessonCountInSection - 1}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="Move lesson down"
                                    aria-label={`Move lesson ${lessonIndex + 1} down`}
                                  >
                                    <FiArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                    <span className="hidden sm:inline">Position</span>
                                    <select
                                      value={lessonIndex}
                                      onChange={(event) =>
                                        reorderLessonTo(
                                          moduleIndex,
                                          sectionIndex,
                                          lessonIndex,
                                          Number(event.target.value)
                                        )
                                      }
                                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#1B5EF5]"
                                      aria-label={`Set position for lesson ${lessonIndex + 1}`}
                                    >
                                      {(section.lessons || []).map((_, optionIndex) => (
                                        <option key={optionIndex} value={optionIndex}>
                                          {optionIndex + 1}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => removeLesson(moduleIndex, sectionIndex, lessonIndex)}
                                className="text-sm font-medium text-rose-600"
                              >
                                Delete lesson
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_200px_180px]">
                            <input
                              value={lesson.title}
                              onChange={(event) =>
                                updateLesson(moduleIndex, sectionIndex, lessonIndex, {
                                  title: event.target.value,
                                })
                              }
                              placeholder="Lesson title"
                              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm sm:col-span-2 sm:px-4 sm:py-3 lg:col-span-1"
                            />
                            <select
                              value={lesson.lessonType}
                              onChange={(event) =>
                                updateLesson(moduleIndex, sectionIndex, lessonIndex, {
                                  lessonType: event.target.value,
                                  type: event.target.value,
                                  videoUrl: event.target.value === 'video' ? lesson.videoUrl || '' : '',
                                  pdfUrl: event.target.value === 'pdf' ? lesson.pdfUrl || '' : '',
                                  textContent: ['text', 'quiz', 'assignment'].includes(event.target.value)
                                    ? lesson.textContent || ''
                                    : '',
                                  resourceUrl: event.target.value === 'resource' ? lesson.resourceUrl || '' : '',
                                })
                              }
                              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm capitalize sm:px-4 sm:py-3"
                            >
                              {lessonTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            <input
                              value={lesson.duration}
                              onChange={(event) =>
                                updateLesson(moduleIndex, sectionIndex, lessonIndex, {
                                  duration: event.target.value,
                                })
                              }
                              placeholder="Duration (e.g. 08:30)"
                              className="min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm sm:px-4 sm:py-3"
                            />
                          </div>

                          <div className="mt-3">
                            {videoLesson ? (
                              <div className="min-w-0 space-y-3">
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/40 sm:px-5 sm:py-10">
                                  <FiUploadCloud className="h-8 w-8 text-slate-400 sm:h-9 sm:w-9" aria-hidden />
                                  <span className="mt-2 text-sm font-semibold text-slate-800">
                                    Upload video file
                                  </span>
                                  <span className="mt-1.5 w-full max-w-none px-0.5 text-left text-[11px] leading-relaxed text-slate-500 sm:max-w-xl sm:text-center sm:text-xs">
                                    Use <strong className="font-semibold text-slate-600">MP4</strong> (H.264)
                                    or WebM for best playback. .MOV files often fail in Chrome/Edge.
                                  </span>
                                  <input
                                    type="file"
                                    accept="video/mp4,video/webm,.mp4,.webm"
                                    className="sr-only"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      event.target.value = '';
                                      if (file) {
                                        void handleLessonVideoUpload(
                                          moduleIndex,
                                          sectionIndex,
                                          lessonIndex,
                                          file
                                        );
                                      }
                                    }}
                                  />
                                </label>
                                {typeof uploadPct === 'number' && uploadPct > 0 && uploadPct < 100 ? (
                                  <div>
                                    <div className="mb-1 flex justify-between text-xs text-slate-600">
                                      <span>Uploading…</span>
                                      <span>{uploadPct}%</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                      <div
                                        className="h-full rounded-full bg-blue-600 transition-all"
                                        style={{ width: `${uploadPct}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : null}
                                {uploadErr ? (
                                  <p className="text-sm text-rose-600">{uploadErr}</p>
                                ) : null}
                                {lesson.videoUrl ? (
                                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                                    <p className="text-xs font-medium text-emerald-900">Video ready</p>
                                    <div className="mt-2 max-w-full overflow-x-auto rounded-lg bg-white/80 px-2 py-2.5 ring-1 ring-emerald-100/80 [-webkit-overflow-scrolling:touch]">
                                      <code className="inline-block max-w-none whitespace-nowrap font-mono text-[10px] leading-normal text-slate-700 sm:text-[11px]">
                                        {lesson.videoUrl}
                                      </code>
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-500 sm:text-xs">
                                      Scroll horizontally if the URL is long. You can also trim it in the field
                                      below.
                                    </p>
                                  </div>
                                ) : null}
                                <div className="min-w-0">
                                  <p className="mb-1.5 text-xs font-medium text-slate-500">
                                    Or paste a hosted video URL
                                  </p>
                                  <input
                                    value={lesson.videoUrl || ''}
                                    onChange={(event) =>
                                      updateLesson(moduleIndex, sectionIndex, lessonIndex, {
                                        videoUrl: event.target.value,
                                        type: 'video',
                                        lessonType: 'video',
                                      })
                                    }
                                    placeholder="https://…"
                                    className="w-full min-w-0 rounded-2xl border border-slate-200 px-3 py-2.5 font-mono text-xs text-slate-800 placeholder:text-slate-400 sm:px-4 sm:py-3 sm:text-sm"
                                  />
                                </div>
                              </div>
                            ) : textLesson ? (
                              <textarea
                                value={contentValue}
                                onChange={(event) =>
                                  updateLesson(moduleIndex, sectionIndex, lessonIndex, {
                                    [contentKey]: event.target.value,
                                  })
                                }
                                placeholder={contentLabel}
                                rows={4}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                              />
                            ) : (
                              <input
                                value={contentValue}
                                onChange={(event) =>
                                  updateLesson(moduleIndex, sectionIndex, lessonIndex, {
                                    [contentKey]: event.target.value,
                                  })
                                }
                                placeholder={contentLabel}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                              />
                            )}
                          </div>

                          <textarea
                            value={lesson.description}
                            onChange={(event) =>
                              updateLesson(moduleIndex, sectionIndex, lessonIndex, {
                                description: event.target.value,
                              })
                            }
                            placeholder="Lesson description or instructor notes"
                            rows={3}
                            className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                          />

                          <div className="mt-3 flex flex-wrap gap-3">
                            <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={lesson.isPreview}
                                onChange={(event) =>
                                  updateLesson(moduleIndex, sectionIndex, lessonIndex, {
                                    isPreview: event.target.checked,
                                    isLocked: !event.target.checked,
                                  })
                                }
                              />
                              Preview lesson
                            </label>
                            <span className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600">
                              {lesson.isPreview ? 'Open to all students' : 'Locked until purchase'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => addLesson(moduleIndex, sectionIndex)}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    <FiPlus />
                    Add lesson
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addSection(moduleIndex)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              <FiPlus />
              Add section
            </button>
          </div>
        );
      })}
    </div>
  );
}
