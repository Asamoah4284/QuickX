import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import {
  deleteLesson,
  fetchVideoBlob,
  formatBytes,
  getBlobUrl,
  isDownloaded,
  listDownloadsForCourse,
  revokeBlobUrl,
  saveLesson,
} from '../../utils/offlineLessonStore';

const API_URL = import.meta.env.VITE_API_URL;

const buildLessonId = (moduleIndex, sectionIndex, lessonIndex) =>
  `${moduleIndex}-${sectionIndex}-${lessonIndex}`;

const stableLessonId = (lesson, moduleIndex, sectionIndex, lessonIndex) =>
  lesson?._id ? String(lesson._id) : buildLessonId(moduleIndex, sectionIndex, lessonIndex);

const byOrder = (a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0);

const applyEnrollmentToCourse = (course) => {
  const completedLessonIds = new Set(course?.enrollment?.completedLessonIds || []);
  const modules = [...(course.modules || [])]
    .sort(byOrder)
    .map((module, moduleIndex) => ({
      ...module,
      sections: [...(module.sections || [])]
        .sort(byOrder)
        .map((section, sectionIndex) => ({
          ...section,
          lessons: [...(section.lessons || [])]
            .sort(byOrder)
            .map((lesson, lessonIndex) => ({
              ...lesson,
              isCompleted: completedLessonIds.has(
                buildLessonId(moduleIndex, sectionIndex, lessonIndex)
              ),
            })),
        })),
    }));

  return {
    ...course,
    modules,
  };
};

/** Shared modules / lessons list — used in desktop sidebar and mobile slide-over (Udemy-style). */
function CourseCurriculumPanel({
  courseData,
  activeModule,
  activeSection,
  activeLesson,
  onLessonClick,
  thumbSrc,
  schoolBack,
}) {
  return (
    <>
      <div className="border-b border-gray-100 p-3 sm:p-4">
        <Link
          to={schoolBack}
          className="mb-3 flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to school
        </Link>
        <div className="flex gap-3">
          <img
            src={thumbSrc}
            alt=""
            className="h-14 w-14 shrink-0 rounded border border-gray-200 object-cover"
          />
          <div className="min-w-0">
            <h1 className="line-clamp-3 text-sm font-semibold leading-snug text-gray-900">
              {courseData.title}
            </h1>
            <p className="mt-1 text-xs text-gray-500">{courseData.instructor}</p>
          </div>
        </div>
      </div>

      <div className="px-2 py-2 sm:px-3">
        <h2 className="px-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-2">
          Course material
        </h2>
      </div>

      <div className="pb-3 sm:pb-4">
        {courseData.modules.map((module, moduleIndex) => (
          <details
            key={module._id || moduleIndex}
            className="group border-t border-gray-100"
            open={moduleIndex === 0}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 sm:px-4 sm:py-2.5 [&::-webkit-details-marker]:hidden">
              <span>
                Module {moduleIndex + 1}: {module.title}
              </span>
              <svg
                className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="bg-white">
              {module.sections.map((section, sectionIndex) => (
                <div key={section._id || `${moduleIndex}-${sectionIndex}`}>
                  <div className="ml-2 border-l-2 border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 sm:px-4">
                    {section.title}
                  </div>
                  {section.lessons.map((lesson, lessonIndex) => {
                    const isActive =
                      moduleIndex === activeModule &&
                      sectionIndex === activeSection &&
                      lessonIndex === activeLesson;
                    return (
                      <button
                        type="button"
                        key={lesson._id || `${moduleIndex}-${sectionIndex}-${lessonIndex}`}
                        onClick={() => onLessonClick(moduleIndex, sectionIndex, lessonIndex)}
                        className={`flex w-full items-start gap-2 border-l-4 py-2 pl-3 pr-2 text-left transition-colors sm:py-2.5 sm:pl-4 sm:pr-3 ${
                          isActive
                            ? 'border-blue-600 bg-blue-50'
                            : lesson.isCompleted
                              ? 'border-transparent hover:bg-gray-50'
                              : 'border-transparent hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            lesson.isCompleted
                              ? 'border-blue-600 bg-blue-600'
                              : isActive
                                ? 'border-blue-600 bg-white'
                                : 'border-gray-300 bg-white'
                          }`}
                        >
                          {lesson.isCompleted && (
                            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                          {isActive && !lesson.isCompleted && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          )}
                        </span>
                        <span
                          className={`min-w-0 flex-1 text-sm ${
                            isActive ? 'font-medium text-blue-900' : 'text-gray-800'
                          }`}
                        >
                          {lesson.title}
                        </span>
                        {lesson.duration && (
                          <span className="shrink-0 text-[10px] text-gray-400">{lesson.duration}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

const CourseDetail = () => {
  const { courseId } = useParams();
  const [activeModule, setActiveModule] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [courseData, setCourseData] = useState(null);
  const [error, setError] = useState(null);
  const [videoError, setVideoError] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [progressPercentage, setProgressPercentage] = useState(0);
  /** Mobile / tablet: curriculum opens in a slide-over (Udemy-style) instead of below the video. */
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);
  /** After a lesson ends, autoplay the next one */
  const [autoPlayLesson, setAutoPlayLesson] = useState(false);
  const [canDownloadOffline, setCanDownloadOffline] = useState(false);
  const [lessonDownloaded, setLessonDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null); // 0-100 or null
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [playingFromOffline, setPlayingFromOffline] = useState(false);
  const [courseDownloads, setCourseDownloads] = useState([]);
  const videoRef = useRef(null);
  const shouldAutoPlayRef = useRef(false);
  const blobUrlRef = useRef(null);
  const downloadAbortRef = useRef(null);

  const tryPlayCurrentVideo = useCallback(() => {
    const el = videoRef.current;
    if (!el || !shouldAutoPlayRef.current) return;

    const finish = () => {
      shouldAutoPlayRef.current = false;
      setAutoPlayLesson(false);
      setIsVideoLoading(false);
    };

    const attempt = () => {
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(finish).catch(() => {
          // Browser autoplay policy — try muted, then restore sound
          el.muted = true;
          el.play()
            .then(() => {
              el.muted = false;
              finish();
            })
            .catch(() => {
              finish();
            });
        });
      } else {
        finish();
      }
    };

    if (el.readyState >= 2) {
      attempt();
    } else {
      el.addEventListener('canplay', attempt, { once: true });
      el.addEventListener('loadeddata', attempt, { once: true });
    }
  }, []);


  // Add new function to update course progress
  const updateCourseProgress = async (moduleIndex, sectionIndex, lessonIndex) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Save last watched lesson for this course
      localStorage.setItem(
        `lastWatched_${courseId}`,
        JSON.stringify({ moduleIndex, sectionIndex, lessonIndex })
      );
      // Save last accessed courseId for Membership optimistic update
      localStorage.setItem('lastAccessedCourseId', courseId);

      const response = await axios.post(
        `${API_URL}/api/courses/${courseId}/progress`,
        {
          progressPercent: totalLessons > 0 ? Math.round((((completedLessons + 1) / totalLessons) * 100)) : 0,
          completedLessonId: buildLessonId(moduleIndex, sectionIndex, lessonIndex)
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data?.enrollment) {
        setProgressPercentage(response.data.enrollment.progressPercent || 0);
      }

      // Dispatch event to notify other components about progress update
      window.dispatchEvent(new Event('course-progress-updated'));
    } catch (error) {
      console.error('Error updating course progress:', error);
    }
  };

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Please log in to access this course');
          return;
        }
        const response = await axios.get(`${API_URL}/api/courses/${courseId}/full`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ensure instructor data is properly formatted
        const data = response.data;
        if (data.instructor && typeof data.instructor === 'object') {
          data.instructor = data.instructor.fullName || 'Unknown Instructor';
        } else if (!data.instructor) {
          data.instructor = 'Unknown Instructor';
        }
        
        const hydratedCourse = applyEnrollmentToCourse(data);
        setCourseData(hydratedCourse);
        setProgressPercentage(data.enrollment?.progressPercent || 0);
        setCanDownloadOffline(Boolean(data.canDownloadOffline));
        setError(null);
      } catch (err) {
        console.error('Error fetching course:', err);
        if (err.response?.status === 403) {
          setError('Please purchase this course to access its content');
        } else if (err.response?.status === 401) {
          setError('Please log in to access this course');
        } else {
          setError('Failed to load course data. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  // After fetching courseData, set initial lesson from localStorage if available
  useEffect(() => {
    if (courseData) {
      const lastWatched = localStorage.getItem(`lastWatched_${courseId}`);
      if (lastWatched) {
        const { moduleIndex, sectionIndex, lessonIndex } = JSON.parse(lastWatched);
        setActiveModule(moduleIndex);
        setActiveSection(sectionIndex);
        setActiveLesson(lessonIndex);
      } else {
        setActiveModule(0);
        setActiveSection(0);
        setActiveLesson(0);
      }
    }
  }, [courseData, courseId]);

  // Get current lesson
  const currentLesson = courseData?.modules[activeModule]?.sections[activeSection]?.lessons[activeLesson];
  const currentLessonMediaUrl = String(
    currentLesson?.videoUrl || currentLesson?.filePath || ''
  ).trim();
  const currentStableLessonId = currentLesson
    ? stableLessonId(currentLesson, activeModule, activeSection, activeLesson)
    : null;

  const refreshCourseDownloads = useCallback(async () => {
    if (!courseId) return;
    try {
      const rows = await listDownloadsForCourse(courseId);
      setCourseDownloads(rows);
    } catch (err) {
      console.error('list downloads:', err);
    }
  }, [courseId]);

  useEffect(() => {
    refreshCourseDownloads();
  }, [refreshCourseDownloads, courseData]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!courseId || !currentStableLessonId) {
        setLessonDownloaded(false);
        return;
      }
      const ok = await isDownloaded(courseId, currentStableLessonId);
      if (!cancelled) setLessonDownloaded(ok);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [courseId, currentStableLessonId, courseDownloads]);

  // Check if video URL is valid
  const checkVideoUrl = (url) => {
    if (!url) return false;
    if (String(url).startsWith('blob:')) return true;
    if (url.startsWith('/')) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
        return true;
      }
      return false;
    }
  };

  // Prefer CloudFront over direct S3 origin for faster playback.
  const getOptimizedVideoUrl = async (url) => {
    if (!url) return null;
    try {
      let resolved = String(url).trim();
      if (resolved.startsWith('/')) {
        resolved = `${API_URL}${resolved}`;
      } else if (
        !resolved.startsWith('http://') &&
        !resolved.startsWith('https://') &&
        (resolved.includes('cloudinary.com') || resolved.includes('res.cloudinary.com'))
      ) {
        resolved = `https://${resolved}`;
      }
      return publicAssetUrl(resolved) || resolved;
    } catch (error) {
      console.error('Error optimizing video URL:', error);
      return publicAssetUrl(url) || url;
    }
  };

  const isLikelyMov = (url) => /\.mov(\?|#|$)/i.test(String(url || ''));

  // Chrome/Edge often reject type="video/quicktime". Prefer mp4/webm hints; omit for .mov.
  const videoSourceType = (url) => {
    if (String(url || '').startsWith('blob:')) return null;
    const pathPart = String(url || '').split('?')[0].toLowerCase();
    if (pathPart.endsWith('.webm')) return 'video/webm';
    if (pathPart.endsWith('.ogg') || pathPart.endsWith('.ogv')) return 'video/ogg';
    if (pathPart.endsWith('.mov') || pathPart.endsWith('.qt')) return null;
    return 'video/mp4';
  };

  // Resolve playable URL — prefer offline cache, then stream CDN.
  useEffect(() => {
    if (!currentLessonMediaUrl && !currentStableLessonId) {
      setVideoUrl(null);
      setIsVideoLoading(false);
      setVideoError(null);
      setPlayingFromOffline(false);
      return undefined;
    }

    let cancelled = false;
    const loadVideoUrl = async () => {
      setIsVideoLoading(true);
      setVideoError(null);
      setPlayingFromOffline(false);
      if (blobUrlRef.current) {
        revokeBlobUrl(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      try {
        if (courseId && currentStableLessonId) {
          const localUrl = await getBlobUrl(courseId, currentStableLessonId);
          if (!cancelled && localUrl) {
            blobUrlRef.current = localUrl;
            setVideoUrl(localUrl);
            setPlayingFromOffline(true);
            setLessonDownloaded(true);
            return;
          }
        }

        if (!currentLessonMediaUrl) {
          if (!cancelled) {
            setVideoUrl(null);
            if (!navigator.onLine) {
              setVideoError('This lesson is not downloaded. Connect to Wi‑Fi and download it for offline viewing.');
            }
          }
          return;
        }

        // Always resolve the CDN/stream URL when we have media — even if the browser
        // reports offline incorrectly, <video> can still buffer from cache/CDN.
        const optimizedUrl = await getOptimizedVideoUrl(currentLessonMediaUrl);
        if (!cancelled) {
          setVideoUrl(optimizedUrl);
          if (!navigator.onLine) {
            setVideoError(
              'You appear offline. If playback fails, connect to Wi‑Fi and use Download for offline.'
            );
          }
        }
      } catch (error) {
        console.error('Error loading video:', error);
        if (!cancelled) setVideoError('Failed to load video. Please try again.');
      } finally {
        if (!cancelled) setIsVideoLoading(false);
      }
    };
    loadVideoUrl();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        revokeBlobUrl(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [currentLessonMediaUrl, courseId, currentStableLessonId]);

  const handleDownloadLesson = useCallback(async () => {
    if (downloadBusy) return;
    if (!courseId) {
      setDownloadMessage('Missing course. Refresh the page and try again.');
      return;
    }
    if (!currentStableLessonId) {
      setDownloadMessage('Select a lesson first, then download it for offline.');
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
      setDownloadMessage('Please log in to download lessons.');
      return;
    }

    if (downloadAbortRef.current) {
      downloadAbortRef.current.abort();
    }
    const abortController = new AbortController();
    downloadAbortRef.current = abortController;

    setDownloadBusy(true);
    setDownloadProgress(0);
    setDownloadMessage(
      isLikelyMov(currentLessonMediaUrl)
        ? 'Downloading… (.MOV plays offline best on Safari / iPhone)'
        : 'Preparing download…'
    );
    try {
      if (navigator?.storage?.persist) {
        try {
          await navigator.storage.persist();
        } catch {
          // ignore
        }
      }

      const { data } = await axios.get(
        `${API_URL}/api/courses/${courseId}/lessons/${encodeURIComponent(currentStableLessonId)}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000,
          signal: abortController.signal,
        }
      );

      if (abortController.signal.aborted) {
        throw Object.assign(new Error('Download cancelled'), { name: 'AbortError', cancelled: true });
      }

      if (!data?.allowed || !data?.url) {
        throw new Error(data?.message || 'Download not allowed');
      }

      const remoteUrl = publicAssetUrl(data.url) || data.url;
      const streamUrl = data.streamPath
        ? `${API_URL}${data.streamPath}`
        : remoteUrl;

      setDownloadMessage('Downloading video…');
      let blob;
      try {
        blob = await fetchVideoBlob(streamUrl, (pct) => setDownloadProgress(pct), {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });
      } catch (streamErr) {
        if (streamErr?.cancelled || streamErr?.name === 'AbortError' || abortController.signal.aborted) {
          throw streamErr;
        }
        if (streamUrl !== remoteUrl) {
          setDownloadMessage('Retrying via CDN…');
          blob = await fetchVideoBlob(remoteUrl, (pct) => setDownloadProgress(pct), {
            signal: abortController.signal,
          });
        } else {
          throw streamErr;
        }
      }

      if (abortController.signal.aborted) {
        throw Object.assign(new Error('Download cancelled'), { name: 'AbortError', cancelled: true });
      }

      const mimeType =
        blob.type && blob.type !== 'application/octet-stream'
          ? blob.type
          : isLikelyMov(remoteUrl)
            ? 'video/quicktime'
            : 'video/mp4';

      setDownloadMessage('Saving on this device…');
      await saveLesson({
        courseId,
        lessonId: data.lessonId || currentStableLessonId,
        blob,
        courseTitle: data.courseTitle || courseData?.title || '',
        lessonTitle: data.lessonTitle || currentLesson?.title || '',
        remoteUrl,
        mimeType,
        offlineLicense: data.offlineLicense || '',
        offlineLicenseExpiresAt: data.offlineLicenseExpiresAt || '',
      });

      setLessonDownloaded(true);
      setDownloadMessage(
        isLikelyMov(remoteUrl)
          ? 'Saved offline. On Chrome/Edge, .MOV may not play — use Safari/iPhone, or ask the tutor for MP4.'
          : 'Saved offline — you can watch without using mobile data.'
      );
      await refreshCourseDownloads();

      if (blobUrlRef.current) revokeBlobUrl(blobUrlRef.current);
      const localUrl = await getBlobUrl(courseId, data.lessonId || currentStableLessonId);
      if (localUrl) {
        blobUrlRef.current = localUrl;
        setVideoUrl(localUrl);
        setPlayingFromOffline(true);
        setVideoError(null);
      }
    } catch (err) {
      if (err?.cancelled || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
        setDownloadMessage('Download cancelled.');
      } else {
        console.error('Offline download failed:', err);
        const status = err.response?.status || err.status;
        const code = err.response?.data?.code;
        if (status === 403 && code === 'UPGRADE_REQUIRED') {
          setCanDownloadOffline(false);
          setDownloadMessage(
            err.response?.data?.message ||
              'Upgrade to Premium or Diamond to download lessons for offline viewing.'
          );
        } else if (status === 401) {
          setDownloadMessage('Session expired. Please log in again, then retry the download.');
        } else {
          const msg =
            err.response?.data?.message ||
            err.message ||
            'Download failed. Try again on Wi‑Fi.';
          setDownloadMessage(msg);
        }
      }
    } finally {
      if (downloadAbortRef.current === abortController) {
        downloadAbortRef.current = null;
      }
      setDownloadBusy(false);
      setDownloadProgress(null);
    }
  }, [
    courseId,
    currentStableLessonId,
    currentLessonMediaUrl,
    downloadBusy,
    courseData?.title,
    currentLesson?.title,
    refreshCourseDownloads,
  ]);

  const handleCancelDownload = useCallback(() => {
    if (!downloadAbortRef.current) return;
    downloadAbortRef.current.abort();
    setDownloadMessage('Cancelling…');
  }, []);

  useEffect(() => {
    return () => {
      downloadAbortRef.current?.abort();
    };
  }, []);

  const handleRemoveListedDownload = useCallback(
    async (lessonId) => {
      if (!courseId || !lessonId) return;
      try {
        await deleteLesson(courseId, lessonId);
        await refreshCourseDownloads();
        if (String(lessonId) === String(currentStableLessonId)) {
          setLessonDownloaded(false);
          setPlayingFromOffline(false);
          if (blobUrlRef.current) {
            revokeBlobUrl(blobUrlRef.current);
            blobUrlRef.current = null;
          }
          if (currentLessonMediaUrl && navigator.onLine) {
            const optimizedUrl = await getOptimizedVideoUrl(currentLessonMediaUrl);
            setVideoUrl(optimizedUrl);
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
    [courseId, currentStableLessonId, currentLessonMediaUrl, refreshCourseDownloads]
  );

  // Reliably start next lesson after URL is ready (state autoPlay is easy for browsers to ignore)
  useEffect(() => {
    if (!videoUrl || !shouldAutoPlayRef.current) return undefined;
    const id = window.requestAnimationFrame(() => {
      tryPlayCurrentVideo();
    });
    return () => window.cancelAnimationFrame(id);
  }, [videoUrl, tryPlayCurrentVideo]);

  // Calculate progress
  const totalLessons = courseData?.modules.reduce((acc, module) => 
    acc + module.sections.reduce((sectionAcc, section) => 
      sectionAcc + section.lessons.length, 0), 0) || 0;
  const completedLessons = courseData?.modules.reduce((acc, module) => 
    acc + module.sections.reduce((sectionAcc, section) => 
      sectionAcc + section.lessons.filter(lesson => lesson.isCompleted).length, 0), 0) || 0;

  // Handle lesson selection — start playback without requiring a second Play click
  const handleLessonClick = useCallback((moduleIndex, sectionIndex, lessonIndex) => {
    const sameLesson =
      moduleIndex === activeModule &&
      sectionIndex === activeSection &&
      lessonIndex === activeLesson;

    setActiveModule(moduleIndex);
    setActiveSection(sectionIndex);
    setActiveLesson(lessonIndex);
    setVideoError(null);
    shouldAutoPlayRef.current = true;
    setAutoPlayLesson(true);

    // Same lesson already loaded — videoUrl won't change, so play immediately
    if (sameLesson) {
      requestAnimationFrame(() => tryPlayCurrentVideo());
    }
  }, [activeModule, activeSection, activeLesson, tryPlayCurrentVideo]);

  const advanceToNextLesson = useCallback(() => {
    if (!courseData?.modules?.length) return false;

    const modules = courseData.modules;
    let m = activeModule;
    let s = activeSection;
    let l = activeLesson + 1;

    while (m < modules.length) {
      const sections = modules[m]?.sections || [];
      while (s < sections.length) {
        const lessons = sections[s]?.lessons || [];
        while (l < lessons.length) {
          const lesson = lessons[l];
          const hasVideo = Boolean(String(lesson?.videoUrl || lesson?.filePath || '').trim());
          if (hasVideo) {
            shouldAutoPlayRef.current = true;
            setAutoPlayLesson(true);
            setActiveModule(m);
            setActiveSection(s);
            setActiveLesson(l);
            setVideoError(null);
            return true;
          }
          l += 1;
        }
        s += 1;
        l = 0;
      }
      m += 1;
      s = 0;
      l = 0;
    }
    shouldAutoPlayRef.current = false;
    setAutoPlayLesson(false);
    return false;
  }, [courseData, activeModule, activeSection, activeLesson]);

  const handleLessonClickMobile = useCallback(
    (moduleIndex, sectionIndex, lessonIndex) => {
      handleLessonClick(moduleIndex, sectionIndex, lessonIndex);
      setMobileCurriculumOpen(false);
    },
    [handleLessonClick]
  );

  useEffect(() => {
    if (!mobileCurriculumOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileCurriculumOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileCurriculumOpen]);

  // Handle video loading issues
  const handleVideoError = (e) => {
    const videoElement = videoRef.current || e.currentTarget;
    const mediaError = videoElement?.error;
    console.error('Video playback error:', {
      code: mediaError?.code,
      message: mediaError?.message,
      videoUrl,
    });
    setIsVideoLoading(false);

    if (isLikelyMov(videoUrl || currentLessonMediaUrl)) {
      setVideoError(
        'This lesson uses a .MOV file, which most browsers (Chrome/Edge) cannot play. Ask the tutor to re-upload the lesson as MP4.'
      );
      return;
    }

    if (mediaError) {
      switch (mediaError.code) {
        case 1:
          setVideoError('Video loading was aborted. Please try again.');
          break;
        case 2:
          setVideoError('Network error. Please check your connection and try again.');
          break;
        case 3:
          setVideoError('Video decoding failed. The file may be corrupted or use an unsupported codec.');
          break;
        case 4:
          setVideoError(
            'This video format is not supported in your browser. Prefer MP4 (H.264). Try Chrome or Safari, or ask the tutor to re-upload as MP4.'
          );
          break;
        default:
          setVideoError('Unable to play this video. Please try again or contact support.');
      }
      return;
    }

    setVideoError('Unable to play this video. Please try again or contact support.');
  };

  // Handle video loading
  const handleVideoLoadStart = () => {
    setIsVideoLoading(true);
    setVideoError(null);
  };

  const handleVideoCanPlay = () => {
    setIsVideoLoading(false);
    setVideoError(null);
    if (shouldAutoPlayRef.current) {
      tryPlayCurrentVideo();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] pt-16 md:pt-20">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1920px] flex-col px-1.5 sm:px-3 xl:flex-row xl:px-6">
          <aside className="hidden w-full shrink-0 border-r border-slate-200/80 bg-white xl:block xl:w-[360px]">
            <div className="space-y-4 p-5">
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-3/4 animate-pulse rounded-lg bg-slate-200" />
              <div className="mt-6 space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
                    <div className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 p-3 sm:p-5 xl:p-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
                <div className="space-y-2">
                  <div className="h-5 w-48 animate-pulse rounded bg-slate-200 sm:w-64" />
                  <div className="h-3 w-36 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
                  <div className="h-8 w-16 animate-pulse rounded-md bg-slate-200" />
                </div>
              </div>

              <div className="relative aspect-video bg-slate-950">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 20% 20%, rgba(27,94,245,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(14,165,233,0.2), transparent 40%)',
                  }}
                  aria-hidden
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                    <span className="absolute inset-0 animate-ping rounded-full bg-[#1B5EF5]/25" aria-hidden />
                    <svg className="relative h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-white/90">Preparing your lesson…</p>
                  <p className="text-xs text-white/50">This usually takes a moment</p>
                </div>
              </div>

              <div className="space-y-3 px-4 py-5 sm:px-6">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-full max-w-xl animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 max-w-md animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Link to="/school" className="text-blue-600 hover:text-blue-700">
            Return to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return null;
  }

  const thumbSrc = publicAssetUrl(
    courseData.thumbnail?.startsWith('http')
      ? courseData.thumbnail
      : courseData.thumbnail
        ? `${API_URL}${courseData.thumbnail}`
        : '/images/logo-1.jpg'
  );

  const schoolBack =
    courseData.courseType === 'crypto'
      ? '/school/crypto'
      : courseData.courseType === 'webdev'
        ? '/school/webdev'
        : '/school';

  const lessonOrdinal = (() => {
    try {
      const mod = courseData.modules?.[activeModule];
      if (!mod?.sections?.length) return 1;
      return (
        courseData.modules.slice(0, activeModule).reduce((s, m) => s + m.sections.reduce((t, sec) => t + sec.lessons.length, 0), 0) +
        mod.sections.slice(0, activeSection).reduce((t, sec) => t + sec.lessons.length, 0) +
        activeLesson +
        1
      );
    } catch {
      return 1;
    }
  })();

  const timelineStart = courseData.startDate
    ? new Date(courseData.startDate)
    : new Date();
  const timelineEnd = courseData.endDate ? new Date(courseData.endDate) : null;

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      {/* Desktop: fixed curriculum — stays put; scrolls inside itself */}
      <aside
        className="fixed bottom-0 left-0 top-16 z-30 hidden w-[360px] flex-col overflow-y-auto overscroll-contain border-r border-gray-200 bg-white [scrollbar-color:rgba(15,23,42,0.12)_transparent] [scrollbar-width:thin] md:top-20 xl:flex [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/35 [&::-webkit-scrollbar-thumb]:hover:bg-slate-400/45 [&::-webkit-scrollbar-track]:bg-transparent"
        aria-label="Course curriculum"
      >
        <CourseCurriculumPanel
          courseData={courseData}
          activeModule={activeModule}
          activeSection={activeSection}
          activeLesson={activeLesson}
          onLessonClick={handleLessonClick}
          thumbSrc={thumbSrc}
          schoolBack={schoolBack}
        />
      </aside>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1920px] flex-col px-1.5 sm:px-3 xl:flex-row xl:pl-[360px] xl:pr-6">
        {/* Center: lesson */}
        <main className="order-first flex min-w-0 flex-1 px-0 pt-2 pb-2 sm:px-3 sm:py-4 md:p-6 xl:order-none xl:px-8 xl:py-8">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-3 py-3 sm:px-5 sm:py-4">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 pr-8">
                  {currentLesson?.title || 'Select a lesson'}
                </h2>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Lesson {lessonOrdinal} of {totalLessons}
                  </span>
                  {currentLesson?.duration && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {currentLesson.duration}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setMobileCurriculumOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 xl:hidden"
                  aria-expanded={mobileCurriculumOpen}
                  aria-controls="mobile-course-curriculum"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h7"
                    />
                  </svg>
                  Course content
                </button>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  disabled={activeLesson === 0 && activeSection === 0 && activeModule === 0}
                  onClick={() => {
                    if (activeLesson > 0) {
                      setActiveLesson(activeLesson - 1);
                    } else if (activeSection > 0) {
                      setActiveSection(activeSection - 1);
                      setActiveLesson(courseData.modules[activeModule].sections[activeSection - 1].lessons.length - 1);
                    } else if (activeModule > 0) {
                      setActiveModule(activeModule - 1);
                      const prevModule = courseData.modules[activeModule - 1];
                      setActiveSection(prevModule.sections.length - 1);
                      setActiveLesson(prevModule.sections[prevModule.sections.length - 1].lessons.length - 1);
                    }
                    setVideoError(null);
                    shouldAutoPlayRef.current = true;
                    setAutoPlayLesson(true);
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
                  disabled={
                    activeModule === courseData.modules.length - 1 &&
                    activeSection === courseData.modules[activeModule].sections.length - 1 &&
                    activeLesson === courseData.modules[activeModule].sections[activeSection].lessons.length - 1
                  }
                  onClick={() => {
                    const currentModule = courseData.modules[activeModule];
                    const currentSection = currentModule.sections[activeSection];
                    if (activeLesson < currentSection.lessons.length - 1) {
                      setActiveLesson(activeLesson + 1);
                    } else if (activeSection < currentModule.sections.length - 1) {
                      setActiveSection(activeSection + 1);
                      setActiveLesson(0);
                    } else if (activeModule < courseData.modules.length - 1) {
                      setActiveModule(activeModule + 1);
                      setActiveSection(0);
                      setActiveLesson(0);
                    }
                    setVideoError(null);
                    shouldAutoPlayRef.current = true;
                    setAutoPlayLesson(true);
                  }}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="aspect-video bg-gray-900 relative">
                {videoUrl && checkVideoUrl(videoUrl) ? (
                  <>
                    {videoError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-10">
                        <div className="text-center p-4">
                          <div className="text-red-500 text-xl mb-2">Video Playback Error</div>
                          <div className="text-white mb-4">{videoError}</div>
                          <button 
                            onClick={async () => {
                              const freshUrl = await getOptimizedVideoUrl(currentLessonMediaUrl);
                              setVideoUrl(freshUrl);
                              setVideoError(null);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    )}
                    {isVideoLoading && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/70">
                        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                          <span className="absolute inset-0 animate-ping rounded-full bg-[#1B5EF5]/30" aria-hidden />
                          <svg className="relative h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <p className="text-xs font-medium text-white/80">Loading video…</p>
                      </div>
                    )}
                    {playingFromOffline && (
                      <div className="absolute left-3 top-3 z-[5] rounded-md bg-emerald-600/90 px-2 py-1 text-[11px] font-semibold text-white shadow">
                        Playing offline
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      key={videoUrl}
                      controls
                      className="w-full h-full"
                      autoPlay={autoPlayLesson}
                      playsInline
                      preload="metadata"
                      controlsList="nodownload"
                      onError={async (e) => {
                        console.error('Video playback error:', {
                          error: e.target.error,
                          videoUrl: videoUrl
                        });
                        handleVideoError(e);
                        if (playingFromOffline) return;
                        const freshUrl = await getOptimizedVideoUrl(currentLessonMediaUrl);
                        if (freshUrl && freshUrl !== videoUrl) {
                          setVideoUrl(freshUrl);
                          setVideoError(null);
                        }
                      }}
                      onLoadStart={handleVideoLoadStart}
                      onLoadedData={() => {
                        if (shouldAutoPlayRef.current) tryPlayCurrentVideo();
                      }}
                      onCanPlay={handleVideoCanPlay}
                      onEnded={() => {
                        const updatedModules = [...courseData.modules];
                        const currentModule = updatedModules[activeModule];
                        const currentSection = currentModule.sections[activeSection];
                        const lesson = currentSection.lessons[activeLesson];
                        if (lesson) lesson.isCompleted = true;
                        setCourseData({ ...courseData, modules: updatedModules });
                        updateCourseProgress(activeModule, activeSection, activeLesson);
                        advanceToNextLesson();
                      }}
                    >
                      {videoSourceType(videoUrl) ? (
                        <source src={videoUrl} type={videoSourceType(videoUrl)} />
                      ) : (
                        <source src={videoUrl} />
                      )}
                      Your browser does not support the video tag.
                    </video>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <div className="text-white">
                        <div className="text-xl font-medium">
                          {videoError
                            ? 'Offline video unavailable'
                            : currentLesson
                              ? currentLesson.title
                              : 'Select a lesson to start learning'}
                        </div>
                        <div className="text-sm text-gray-300 mt-1">
                          {videoError || (currentLesson ? currentLesson.duration : '')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {currentLessonMediaUrl ? (
                <div className="border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-3 py-3 sm:px-4">
                  {downloadBusy ? (
                    <div className="overflow-hidden rounded-xl border border-[#1B5EF5]/20 bg-white shadow-sm">
                      <div className="flex items-center justify-between gap-3 px-3.5 pt-3 pb-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1B5EF5]/10 text-[#1B5EF5]">
                            <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0B1F44]">Saving for offline</p>
                            <p className="truncate text-xs text-slate-500">
                              {downloadMessage || 'Preparing download…'}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <span className="tabular-nums text-sm font-bold text-[#1B5EF5]">
                            {downloadProgress != null ? `${downloadProgress}%` : '…'}
                          </span>
                          <button
                            type="button"
                            onClick={handleCancelDownload}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <div className="mx-3.5 mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#1B5EF5] to-[#4B8BFF] transition-[width] duration-300 ease-out"
                          style={{ width: `${Math.max(downloadProgress ?? 2, 2)}%` }}
                        />
                      </div>
                    </div>
                  ) : canDownloadOffline ? (
                    lessonDownloaded ? (
                      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3.5 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-emerald-900">
                            {playingFromOffline ? 'Playing offline' : 'Saved on this device'}
                          </p>
                          <p className="text-xs text-emerald-700/80">
                            Watch without using mobile data
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8EEF8] text-[#0B1F44]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0B1F44]">Download for offline</p>
                            <p className="text-xs text-slate-500">
                              {isLikelyMov(currentLessonMediaUrl)
                                ? '.MOV — best offline on Safari / iPhone'
                                : 'Save this lesson to watch without data'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadLesson}
                          className="shrink-0 rounded-lg bg-[#1B5EF5] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1549c9] active:scale-[0.98]"
                        >
                          Download
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0B1F44]">Offline downloads</p>
                        <p className="text-xs text-slate-500">
                          Available on Premium or Diamond (or with a course purchase).
                        </p>
                      </div>
                      {courseData?.tutorId ? (
                        <Link
                          to={`/instructors/${courseData.tutorId}`}
                          className="shrink-0 rounded-lg bg-[#0B1F44] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1B5EF5]"
                        >
                          Upgrade
                        </Link>
                      ) : null}
                    </div>
                  )}
                  {downloadMessage && !downloadBusy ? (
                    <p
                      className={`mt-2 text-xs ${
                        /fail|error|expired|upgrade|cannot|empty|not enough|limit/i.test(downloadMessage)
                          ? 'font-medium text-rose-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {downloadMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-6 p-2.5 sm:p-4 md:p-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">About this lesson</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {currentLesson?.description || 'Select a lesson from the left to start learning.'}
                  </p>
                </div>
                {courseData.description && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Course overview</h4>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-6">
                      {courseData.description}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const currentModule = courseData.modules[activeModule];
                      const currentSection = currentModule.sections[activeSection];
                      if (activeLesson < currentSection.lessons.length - 1) {
                        setActiveLesson(activeLesson + 1);
                      } else if (activeSection < currentModule.sections.length - 1) {
                        setActiveSection(activeSection + 1);
                        setActiveLesson(0);
                      } else if (activeModule < courseData.modules.length - 1) {
                        setActiveModule(activeModule + 1);
                        setActiveSection(0);
                        setActiveLesson(0);
                      }
                      setVideoError(null);
                      shouldAutoPlayRef.current = true;
                      setAutoPlayLesson(true);
                    }}
                    disabled={
                      activeModule === courseData.modules.length - 1 &&
                      activeSection === courseData.modules[activeModule].sections.length - 1 &&
                      activeLesson === courseData.modules[activeModule].sections[activeSection].lessons.length - 1
                    }
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    {lessonOrdinal === 1 ? 'Get started' : 'Continue'}
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* Right: widgets */}
          <aside className="order-last w-full shrink-0 space-y-4 bg-white px-0 pt-0 pb-2 sm:px-3 sm:pb-4 md:p-6 xl:w-[320px] xl:py-8 xl:pl-0 xl:pr-6">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#0B1F44]">Downloads on this device</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Watch saved lessons without using mobile data.
                  </p>
                </div>
                <Link
                  to="/membership"
                  state={{ activeTab: 'offlineDownloads' }}
                  className="shrink-0 text-[11px] font-semibold text-[#1B5EF5] hover:underline"
                >
                  View all
                </Link>
              </div>
              {courseDownloads.length === 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  {canDownloadOffline
                    ? 'No lessons downloaded yet. Use Download under the player.'
                    : 'Upgrade to Premium or Diamond to save lessons offline.'}
                </p>
              ) : (
                <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {courseDownloads.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-900">
                            {item.lessonTitle || 'Lesson'}
                          </p>
                          <p className="text-[11px] text-slate-500">{formatBytes(item.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveListedDownload(item.lessonId)}
                        className="shrink-0 text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <h3 className="text-sm font-semibold text-gray-900">Your learning plan</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                Set a weekly goal to stay on track. You&apos;re {progressPercentage}% through this course.
              </p>
              <button
                type="button"
                className="mt-3 w-full rounded-lg border-2 border-blue-600 text-blue-600 text-sm font-medium py-2 hover:bg-blue-50 transition-colors"
              >
                Set your learning plan
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
              <h3 className="text-sm font-semibold text-gray-900">Course timeline</h3>
              <div className="mt-3 rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-900">
                Stay consistent — small sessions add up.
              </div>
              <ul className="mt-4 space-y-4 text-xs border-l-2 border-gray-200 ml-1.5 pl-4">
                <li className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                  <span className="text-gray-500">Start</span>
                  <p className="font-medium text-gray-900">{timelineStart.toLocaleDateString()}</p>
                </li>
                {timelineEnd && (
                  <li className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-gray-300 ring-4 ring-white" />
                    <span className="text-gray-500">Target end</span>
                    <p className="font-medium text-gray-900">{timelineEnd.toLocaleDateString()}</p>
                  </li>
                )}
                <li className="relative">
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                  <span className="text-gray-500">Progress</span>
                  <p className="font-medium text-blue-600">{progressPercentage}% complete</p>
                </li>
              </ul>
            </div>
          </aside>

        {/* Mobile / tablet: curriculum drawer — same pattern as Udemy (slide from right) & Coursera */}
        <div
          className={`fixed inset-0 z-[100] xl:hidden ${mobileCurriculumOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          aria-hidden={!mobileCurriculumOpen}
        >
          <button
            type="button"
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out ${
              mobileCurriculumOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setMobileCurriculumOpen(false)}
            tabIndex={mobileCurriculumOpen ? 0 : -1}
            aria-label="Close course content"
          />
          <div
            id="mobile-course-curriculum"
            className={`absolute right-0 top-0 flex h-[100dvh] w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
              mobileCurriculumOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-curriculum-heading"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 id="mobile-curriculum-heading" className="text-base font-semibold text-gray-900">
                Course content
              </h2>
              <button
                type="button"
                onClick={() => setMobileCurriculumOpen(false)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <CourseCurriculumPanel
                courseData={courseData}
                activeModule={activeModule}
                activeSection={activeSection}
                activeLesson={activeLesson}
                onLessonClick={handleLessonClickMobile}
                thumbSrc={thumbSrc}
                schoolBack={schoolBack}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail; 