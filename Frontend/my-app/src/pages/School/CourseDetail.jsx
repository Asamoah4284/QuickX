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

  // Get current lesson
  const currentLesson = courseData?.modules[activeModule]?.sections[activeSection]?.lessons[activeLesson];

  // Calculate total sections across all modules
  const getTotalSections = () => {
    if (!courseData?.modules) return 0;
    return courseData.modules.reduce((total, module) => total + module.sections.length, 0);
  };

  // Get current section number
  const getCurrentSectionNumber = () => {
    if (!courseData?.modules) return 0;
    let sectionCount = 0;
    for (let i = 0; i < activeModule; i++) {
      sectionCount += courseData.modules[i].sections.length;
    }
    return sectionCount + activeSection + 1;
  };

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

  // Add this function after the existing useEffect
  const refreshVideoUrl = async (url) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;
      
      // If it's an AWS S3 URL, we need to get a fresh signed URL
      if (url && url.includes('amazonaws.com')) {
        const response = await axios.get(`${API_URL}/api/courses/${courseId}/s3VideoUrl`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { videoUrl: url }
        });
        return response.data.url;
      }
      return url;
    } catch (error) {
      console.error('Error refreshing video URL:', error);
      return url;
    }
  };

  // Update the useEffect that handles video URL
  useEffect(() => {
    if (currentLesson?.videoUrl) {
      const loadVideoUrl = async () => {
        const freshUrl = await refreshVideoUrl(currentLesson.videoUrl);
        setVideoUrl(freshUrl);
        checkVideoAccessibility(freshUrl);
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
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      {/* Course Header */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-700 text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <Link to="/school/webdev" className="text-blue-100 hover:text-white flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Web Development Courses
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold">{courseData.title}</h1>
            </div>
            
            <div className="flex items-center mt-4 md:mt-0">
              <div className="bg-blue-800 bg-opacity-50 rounded-lg px-4 py-2 flex items-center">
                <div className="mr-3">
                  <div className="text-sm text-blue-100">Course Progress</div>
                  <div className="text-lg font-bold">{progressPercentage}% Complete</div>
                </div>
                <div className="w-16 h-16 rounded-full bg-blue-900 bg-opacity-50 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="w-12 h-12">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E0F2F1"
                      strokeWidth="3"
                      strokeDasharray="100, 100"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#4ADE80"
                      strokeWidth="3"
                      strokeDasharray={`${progressPercentage}, 100`}
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Course Content */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Course Content */}
          <div className="lg:w-1/3 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Course Content</h2>
                <div className="text-sm text-gray-500 mt-1">
                  {totalLessons} lessons • {getTotalSections()} sections
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {courseData?.modules.map((module, moduleIndex) => (
                  <div key={module._id} className="p-0">
                    <div className="flex justify-between items-center p-4 cursor-pointer bg-gray-50">
                      <h3 className="font-semibold text-gray-800">{module.title}</h3>
                      <div className="text-xs text-gray-500">{module.sections.length} sections</div>
                    </div>
                    
                    {module.sections.map((section, sectionIndex) => (
                      <div key={section._id}>
                        <div className="px-4 py-3 bg-gray-100 border-l-4 border-blue-500">
                          <h4 className="font-medium text-gray-800">
                            Section {getCurrentSectionNumber()}: {section.title}
                          </h4>
                        </div>
                        
                        <div>
                          {section.lessons.map((lesson, lessonIndex) => (
                            <div 
                              key={lesson._id}
                              onClick={() => handleLessonClick(moduleIndex, sectionIndex, lessonIndex)}
                              className={`p-4 pl-8 flex justify-between items-center cursor-pointer border-l-4 ${
                                moduleIndex === activeModule && 
                                sectionIndex === activeSection && 
                                lessonIndex === activeLesson 
                                  ? 'border-blue-500 bg-blue-50'
                                  : lesson.isCompleted 
                                    ? 'border-blue-300 bg-white hover:bg-gray-50'
                                    : 'border-transparent hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                                  lesson.isCompleted ? 'bg-blue-500' : 'border-2 border-gray-300 bg-white'
                                }`}>
                                  {lesson.isCompleted && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  {moduleIndex === activeModule && 
                                   sectionIndex === activeSection && 
                                   lessonIndex === activeLesson && 
                                   !lesson.isCompleted && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                                <span className={`text-sm ${
                                  moduleIndex === activeModule && 
                                  sectionIndex === activeSection && 
                                  lessonIndex === activeLesson
                                    ? 'font-medium text-blue-800'
                                    : lesson.isCompleted 
                                      ? 'text-gray-700'
                                      : 'text-gray-700'
                                }`}>
                                  {lesson.title}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">{lesson.duration}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Course Info */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">About This Course</h2>
              </div>
              <div className="p-5">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">
                    {courseData.instructor.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium">{courseData.instructor}</div>
                    <div className="text-sm text-gray-500">Lead Instructor</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap text-sm text-gray-600 mb-4">
                  <div className="flex items-center mr-6 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {courseData.rating} Rating
                  </div>
                  <div className="flex items-center mr-6 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {courseData.students} Students
                  </div>
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Last Updated: {courseData.lastUpdated}
                  </div>
                </div>
                
                <p className="text-gray-700 mb-5">{courseData.description}</p>
                
                <button className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition">
                  Download Resources
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Column - Video Player */}
          <div className="lg:w-2/3 order-1 lg:order-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Video Player */}
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
                              const freshUrl = await refreshVideoUrl(currentLesson.videoUrl);
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
                      controlsList="nodownload"
                      onError={async (e) => {
                        console.error('Video playback error:', {
                          error: e.target.error,
                          videoUrl: videoUrl
                        });
                        handleVideoError(e);
                        // Try to refresh the URL on error
                        const freshUrl = await refreshVideoUrl(currentLesson.videoUrl);
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
                      }}
                    >
                      <source src={videoUrl} type="video/mp4" />
                      <source src={videoUrl} type="video/webm" />
                      <source src={videoUrl} type="video/ogg" />
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
              
              {/* Lesson Controls */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex flex-wrap justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-800">
                    {currentLesson ? currentLesson.title : 'Select a lesson'}
                  </h3>
                  <div className="flex space-x-2 mt-2 md:mt-0">
                    <button 
                      className="flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
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
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    <button 
                      className="flex items-center text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition"
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
                      }}
                    >
                      <span>Next Lesson</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Lesson Description & Notes */}
              <div className="p-5">
                <h4 className="font-medium text-gray-800 mb-2">Lesson Description</h4>
                <p className="text-gray-700 mb-6">
                  {currentLesson?.description || 'Select a lesson to view its description.'}
                </p>
                
              
            
              </div>



            </div>
          </div>

          

          
        </div>
      </div>
    </div>
  );
};

export default CourseDetail; 