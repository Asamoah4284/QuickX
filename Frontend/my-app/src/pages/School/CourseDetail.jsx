import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
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
  const [isVideoAccessible, setIsVideoAccessible] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

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
          moduleIndex,
          sectionIndex,
          lessonIndex,
          completed: true
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update local state with the response data
      if (response.data) {
        setCourseData(response.data);
        
        // Dispatch event to notify other components about progress update
        window.dispatchEvent(new Event('course-progress-updated'));
      }
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
        
        setCourseData(data);
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

  // Check if video URL is valid
  const checkVideoUrl = (url) => {
    if (!url) {
      console.error('Video URL is empty');
      return false;
    }
    
    // If it's a relative path, it's valid
    if (url.startsWith('/')) {
      console.log('Valid relative video URL:', url);
      return true;
    }
    
    // If it's already a valid URL, return true
    try {
      const videoUrl = new URL(url);
      const isValid = videoUrl.protocol === 'http:' || videoUrl.protocol === 'https:';
      console.log('Video URL validation:', { url, isValid });
      return isValid;
    } catch (e) {
      // If it's not a valid URL, it might be a Cloudinary URL without protocol
      // Check if it looks like a Cloudinary URL
      if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
        // Add https:// if missing
        if (!url.startsWith('http')) {
          console.log('Adding https:// to Cloudinary URL:', url);
          return true; // We'll fix the URL when using it
        }
      }
      console.error('Invalid video URL:', { url, error: e.message });
      return false;
    }
  };

  // Ensure video URL is properly formatted
  const getFormattedVideoUrl = (url) => {
    if (!url) {
      console.error('Cannot format empty video URL');
      return '';
    }
    
    // If it's a relative path, prepend the base URL
    if (url.startsWith('/')) {
      const baseUrl = `${API_URL}`; // Replace with your actual backend URL
      const formattedUrl = `${baseUrl}${url}`;
      console.log('Formatted relative URL:', formattedUrl);
      return formattedUrl;
    }
    
    // If it's already a valid URL, return it
    try {
      new URL(url);
      console.log('Video URL is already properly formatted:', url);
      return url;
    } catch (e) {
      // If it's not a valid URL, it might be a Cloudinary URL without protocol
      if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
        // Add https:// if missing
        if (!url.startsWith('http')) {
          const formattedUrl = `https://${url}`;
          console.log('Formatted Cloudinary URL:', formattedUrl);
          return formattedUrl;
        }
      }
      console.error('Failed to format video URL:', { url, error: e.message });
      return url;
    }
  };

  // Check if video is accessible
  const checkVideoAccessibility = async (url) => {
    if (!url) {
      console.error('Cannot check accessibility of empty video URL');
      return false;
    }
    
    const formattedUrl = getFormattedVideoUrl(url);
    console.log('Checking video accessibility for URL:', formattedUrl);
    
    try {
      // Use HEAD request to check if the video is accessible
      const response = await fetch(formattedUrl);
      const isAccessible = response.ok;
      console.log(`Video accessibility check for ${formattedUrl}: ${isAccessible}`);
      setIsVideoAccessible(isAccessible);
      return isAccessible;
    } catch (error) {
      console.error('Error checking video accessibility:', { url: formattedUrl, error: error.message });
      setIsVideoAccessible(false);
      return false;
    }
  };

  // Optimize video URL handling
  const getOptimizedVideoUrl = async (url) => {
    if (!url) return null;
    
    try {
      // If it's already a valid URL with protocol, return it
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      // If it's an S3 URL, get a fresh signed URL
      if (url.includes('amazonaws.com')) {
        const token = localStorage.getItem('authToken');
        if (!token) return null;
        
        const response = await axios.get(`${API_URL}/api/courses/${courseId}/s3VideoUrl`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { videoUrl: url }
        });
        return response.data.url;
      }
      
      // If it's a relative path, prepend API URL
      if (url.startsWith('/')) {
        return `${API_URL}${url}`;
      }
      
      // If it's a Cloudinary URL without protocol
      if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
        return `https://${url}`;
      }
      
      return url;
    } catch (error) {
      console.error('Error optimizing video URL:', error);
      return url;
    }
  };

  // Update the useEffect that handles video URL
  useEffect(() => {
    if (currentLesson?.videoUrl) {
      const loadVideoUrl = async () => {
        setIsVideoLoading(true);
        try {
          const optimizedUrl = await getOptimizedVideoUrl(currentLesson.videoUrl);
          setVideoUrl(optimizedUrl);
          // Only check accessibility for non-S3 URLs
          if (!optimizedUrl?.includes('amazonaws.com')) {
            await checkVideoAccessibility(optimizedUrl);
          } else {
            setIsVideoAccessible(true);
          }
        } catch (error) {
          console.error('Error loading video:', error);
          setVideoError('Failed to load video. Please try again.');
        } finally {
          setIsVideoLoading(false);
        }
      };
      loadVideoUrl();
    }
  }, [currentLesson]);

  // Calculate progress
  const totalLessons = courseData?.modules.reduce((acc, module) => 
    acc + module.sections.reduce((sectionAcc, section) => 
      sectionAcc + section.lessons.length, 0), 0) || 0;
  const completedLessons = courseData?.modules.reduce((acc, module) => 
    acc + module.sections.reduce((sectionAcc, section) => 
      sectionAcc + section.lessons.filter(lesson => lesson.isCompleted).length, 0), 0) || 0;
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Handle lesson selection
  const handleLessonClick = (moduleIndex, sectionIndex, lessonIndex) => {
    setActiveModule(moduleIndex);
    setActiveSection(sectionIndex);
    setActiveLesson(lessonIndex);
    setVideoError(null);
  };

  // Handle video loading issues
  const handleVideoError = (e) => {
    console.error("Video playback error:", e);
    setIsVideoLoading(false);
    
    // Check for specific error types
    const videoElement = e.target;
    if (videoElement.error) {
      switch (videoElement.error.code) {
        case 1:
          setVideoError("Video loading was aborted. Please try again.");
          break;
        case 2:
          setVideoError("Network error occurred. Please check your internet connection.");
          break;
        case 3:
          setVideoError("Video decoding failed. The format may not be supported.");
          break;
        case 4:
          setVideoError("Video not supported. Please try a different browser.");
          break;
        default:
          setVideoError("Unable to play this video. Please try again later or contact support.");
      }
    } else {
      setVideoError("Unable to play this video. Please try again later or contact support.");
    }
  };

  // Handle video loading
  const handleVideoLoadStart = () => {
    setIsVideoLoading(true);
    setVideoError(null);
  };

  const handleVideoCanPlay = () => {
    setIsVideoLoading(false);
    setVideoError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
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

  const thumbSrc = courseData.thumbnail?.startsWith('http')
    ? courseData.thumbnail
    : courseData.thumbnail
      ? `${API_URL}${courseData.thumbnail}`
      : '/images/logo-1.jpg';

  const schoolBack =
    courseData.courseType === 'crypto'
      ? '/school/crypto'
      : courseData.courseType === 'webdev'
        ? '/school/webdev'
        : '/school/forex';

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
      <div className="flex flex-col xl:flex-row max-w-[1920px] mx-auto min-h-[calc(100vh-4rem)] w-full px-3 sm:px-4 xl:px-6">
        {/* Left: course nav (Coursera-style) */}
        <aside
          className="w-full xl:w-[360px] shrink-0 bg-white border-b xl:border-b-0 xl:border-r border-gray-200 xl:min-h-[calc(100vh-5rem)] xl:sticky xl:top-16 xl:self-start overflow-y-auto max-h-[50vh] xl:max-h-[calc(100vh-5rem)] [scrollbar-width:thin] [scrollbar-color:rgba(15,23,42,0.12)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/35 [&::-webkit-scrollbar-thumb]:hover:bg-slate-400/45"
        >
          <div className="p-4 border-b border-gray-100">
            <Link
              to={schoolBack}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-3"
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
                className="w-14 h-14 rounded object-cover border border-gray-200 shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3">
                  {courseData.title}
                </h1>
                <p className="text-xs text-gray-500 mt-1">{courseData.instructor}</p>
              </div>
            </div>
          </div>

          <div className="px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 px-2">
              Course material
            </h2>
          </div>

          <div className="pb-4">
            {courseData.modules.map((module, moduleIndex) => (
              <details key={module._id || moduleIndex} className="border-t border-gray-100 group" open={moduleIndex === 0}>
                <summary className="px-4 py-2.5 cursor-pointer text-sm font-medium text-gray-900 bg-gray-50 hover:bg-gray-100 list-none flex items-center justify-between [&::-webkit-details-marker]:hidden">
                  <span>
                    Module {moduleIndex + 1}: {module.title}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="bg-white">
                  {module.sections.map((section, sectionIndex) => (
                    <div key={section._id || `${moduleIndex}-${sectionIndex}`}>
                      <div className="px-4 py-2 text-xs font-medium text-gray-500 border-l-2 border-gray-200 ml-2">
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
                            onClick={() => handleLessonClick(moduleIndex, sectionIndex, lessonIndex)}
                            className={`w-full text-left pl-4 pr-3 py-2.5 flex items-start gap-2 border-l-4 transition-colors ${
                              isActive
                                ? 'border-blue-600 bg-blue-50'
                                : lesson.isCompleted
                                  ? 'border-transparent hover:bg-gray-50'
                                  : 'border-transparent hover:bg-gray-50'
                            }`}
                          >
                            <span
                              className={`mt-0.5 w-4 h-4 rounded-full shrink-0 border-2 flex items-center justify-center ${
                                lesson.isCompleted
                                  ? 'bg-blue-600 border-blue-600'
                                  : isActive
                                    ? 'border-blue-600 bg-white'
                                    : 'border-gray-300 bg-white'
                              }`}
                            >
                              {lesson.isCompleted && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              {isActive && !lesson.isCompleted && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              )}
                            </span>
                            <span
                              className={`text-sm flex-1 min-w-0 ${
                                isActive ? 'font-medium text-blue-900' : 'text-gray-800'
                              }`}
                            >
                              {lesson.title}
                            </span>
                            {lesson.duration && (
                              <span className="text-[10px] text-gray-400 shrink-0">{lesson.duration}</span>
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
        </aside>

        {/* Center: lesson */}
        <main className="flex-1 min-w-0 order-first xl:order-none p-4 md:p-6 xl:py-8 xl:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
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
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40"
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
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
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
                              const freshUrl = await getOptimizedVideoUrl(currentLesson.videoUrl);
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
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-10">
                        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {!isVideoAccessible && !videoError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-10">
                        <div className="text-center p-4">
                          <div className="text-yellow-500 text-xl mb-2">Video Not Accessible</div>
                          <div className="text-white mb-4">The video may be processing or unavailable. Please try again later.</div>
                          <button 
                            onClick={() => checkVideoAccessibility(currentLesson.videoUrl)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                          >
                            Check Again
                          </button>
                        </div>
                      </div>
                    )}
                    <video
                      key={videoUrl}
                      controls
                      className="w-full h-full"
                      autoPlay={false}
                      preload="metadata"
                      controlsList="nodownload"
                      onError={async (e) => {
                        console.error('Video playback error:', {
                          error: e.target.error,
                          videoUrl: videoUrl
                        });
                        handleVideoError(e);
                        // Try to refresh the URL on error
                        const freshUrl = await getOptimizedVideoUrl(currentLesson.videoUrl);
                        setVideoUrl(freshUrl);
                      }}
                      onLoadStart={handleVideoLoadStart}
                      onCanPlay={handleVideoCanPlay}
                      onEnded={() => {
                        console.log('Video ended');
                        const updatedModules = [...courseData.modules];
                        const currentModule = updatedModules[activeModule];
                        const currentSection = currentModule.sections[activeSection];
                        const lesson = currentSection.lessons[activeLesson];
                        lesson.isCompleted = true;
                        setCourseData({ ...courseData, modules: updatedModules });
                        
                        // Call the new function to update progress in backend
                        updateCourseProgress(activeModule, activeSection, activeLesson);
                      }}
                    >
                      <source src={videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <div className="text-white">
                        <div className="text-xl font-medium">
                          {currentLesson ? currentLesson.title : 'Select a lesson to start learning'}
                        </div>
                        <div className="text-sm text-gray-300 mt-1">
                          {currentLesson ? currentLesson.duration : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 md:p-6 space-y-6">
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
          <aside className="w-full xl:w-[320px] shrink-0 p-4 md:p-6 xl:py-8 xl:pl-0 xl:pr-6 space-y-4 order-last bg-white">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
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

            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
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
      </div>
    </div>
  );
};

export default CourseDetail; 