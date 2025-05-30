import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlay, FiBook, FiExternalLink } from 'react-icons/fi';
import axios from 'axios';


const API_URL = import.meta.env.VITE_API_URL;

const ForexSchool = () => {
  // Course categories
  const categories = [
    'All Courses',
    'Beginner',
    'Intermediate',
    'Advanced',
    'Strategy',
    'Technical Analysis'
  ];
  
  // States
  const [coursesData, setCoursesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All Courses');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch courses from backend
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        console.log('Fetching forex courses from:', `${API_URL}/api/courses`);
        const response = await axios.get(`${API_URL}/api/courses?courseType=forex`);
        
        // Log the raw API response
        console.log('Raw API response for forex courses:', response);
        
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Invalid response format from server');
        }
        
        // Transform backend data to match our frontend structure
        const formattedCourses = response.data.map(course => {
          const thumbnailUrl = course.thumbnail ? 
            (course.thumbnail.startsWith('http') ? course.thumbnail : `${API_URL}${course.thumbnail}`) 
            : '/images/1.jpeg';
          
          console.log('Processing forex course:', {
            title: course.title,
            originalThumbnail: course.thumbnail,
            finalThumbnail: thumbnailUrl
          });
          
          return {
            id: course._id,
            title: course.title,
            description: course.description || course.shortDescription || '',
            level: course.level?.toLowerCase() || 'beginner',
            duration: course.duration || `${Math.floor(Math.random() * 8) + 2} weeks`,
            lessons: course.totalLessons || (course.modules?.reduce((total, module) => 
              total + (module.sections?.reduce((sum, section) => 
                sum + (section.lessons?.length || 0), 0) || 0), 0) || Math.floor(Math.random() * 20) + 5),
            price: course.price || Math.floor(Math.random() * 500) + 200,
            image: thumbnailUrl,
            instructor: course.instructor?.fullName || course.instructorName || 'Quick X Instructor',
            rating: course.rating || (Math.random() * (5 - 4) + 4).toFixed(1),
            students: course.totalStudents || Math.floor(Math.random() * 3000) + 500
          };
        });
        
        setCoursesData(formattedCourses);
        setError(null);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to fetch courses. Please try again later.');
        setCoursesData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, []);

  // Filter courses based on active category and search term
  const filteredCourses = coursesData.filter(course => {
    const matchesCategory = activeCategory === 'All Courses' || 
                          course.level?.toLowerCase() === activeCategory?.toLowerCase();
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Forex Market News Data - simplified
  const newsData = [
    {
      id: 1,
      title: 'Fed Signals Potential Rate Cut in September',
      summary: 'Federal Reserve officials hint at possible interest rate reduction amid cooling inflation data.',
      date: 'June 14, 2023',
      source: 'Bloomberg'
    },
    {
      id: 2,
      title: 'EUR/USD Breaks Key Resistance Level',
      summary: 'The euro surged against the dollar after breaking through the 1.1250 resistance level, reaching a 3-month high.',
      date: 'June 12, 2023',
      source: 'Reuters'
    },
    {
      id: 3,
      title: 'Bank of Japan Maintains Ultra-Loose Policy',
      summary: 'BOJ keeps negative interest rates unchanged despite global tightening trend, putting pressure on the yen.',
      date: 'June 10, 2023',
      source: 'Financial Times'
    },
    {
      id: 4,
      title: 'Oil Prices Drop on Increased Supply Concerns',
      summary: 'Crude oil futures fell 3% as OPEC+ members hint at production increases in the coming months.',
      date: 'June 9, 2023',
      source: 'CNBC'
    }
  ];

  // News sources data
  const newsSources = [
    {
      id: 1,
      name: 'Reuters Forex',
      url: 'https://www.reuters.com/markets/currencies',
      description: 'Get real-time forex news and market updates'
    },
    {
      id: 2, 
      name: 'Bloomberg Markets',
      url: 'https://www.bloomberg.com/markets/currencies',
      description: 'Latest currency market news and analysis'
    },
    {
      id: 3,
      name: 'ForexLive',
      url: 'https://www.forexlive.com/',
      description: 'Live forex trading news and analysis'
    },
    {
      id: 4,
      name: 'FXStreet',
      url: 'https://www.fxstreet.com/',
      description: 'Technical analysis and forex market news'
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-[500px] flex items-center justify-start bg-no-repeat bg-cover bg-center" style={{ backgroundImage: "url('/images/bg.jpeg')" }}>
        {/* Overlay for premium effect */}
        <div className=""></div>
        <div className="relative z-10 max-w-6xl mx-auto w-full px-4 py-24 sm:py-32 text-left">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">
            Master Forex Trading<br />
            <span className="text-blue-400">with Quick X</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-xl mb-8 drop-shadow">
            Transform your trading journey with our comprehensive courses designed for traders of all levels.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-start">
            <Link 
              to=""
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-semibold rounded-lg text-blue-900 bg-white hover:bg-blue-50 transition duration-300 shadow-xl hover:shadow-2xl"
            >
              <FiPlay className="mr-2" />
              Start Learning Now
            </Link>
            <Link 
              to="#courses"
              className="inline-flex items-center justify-center px-8 py-3 border border-white text-base font-semibold rounded-lg text-white hover:bg-white/10 transition duration-300 shadow"
            >
              <FiBook className="mr-2" />
              Browse Courses
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search and Filter - Fixed at the top with better spacing */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 hidden md:block">Courses</h2>
            
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search courses..."
                className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 absolute left-3 top-3.5 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
              {categories.map(category => (
                <button
                  key={category}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm transition ${
                    activeCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Courses Column */}
          <div className="lg:w-2/3">
            {/* Loading Indicator */}
            {loading && (
              <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading courses...</p>
              </div>
            )}

            {/* Error Message */}
            {error && !loading && (
              <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                <div className="flex items-center text-amber-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.3-.921 1.603-.921 1.902 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p>{error}</p>
                </div>
              </div>
            )}
            
            {/* Course Grid - Improved sizing and spacing */}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredCourses.map(course => (
                  <div key={course.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition duration-300">
                    <div className="relative">
                      {console.log('Course Image Data:', course.image)}
                      <img 
                        src={course.image} 
                        alt={course.title}
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', e.target.src);
                          console.error('Error details:', e);
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {course.level}
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <h3 className="text-lg font-bold mb-2 text-gray-800 line-clamp-1">{course.title}</h3>
                      <p className="text-gray-600 mb-3 text-sm line-clamp-2">{course.description}</p>
                      
                      <div className="flex items-center mb-3">
                    
                        {/* <span className="text-gray-700 font-medium text-sm">{course.rating}</span>
                        <span className="mx-2 text-gray-400 text-xs">•</span>
                        <span className="text-gray-600 text-sm">{course.students} students</span> */}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {course.duration}
                        </div>
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          {course.lessons} lessons
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-2 text-xs">
                            {course.instructor.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs font-medium text-gray-700">{course.instructor}</span>
                        </div>
                        <Link 
                          to={`/school/pricing?level=${course.level}&id=${course.id}`}
                          className="text-blue-600 hover:text-blue-900 font-large text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
                        >
                          Enroll Now - GH₵{course.price}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* No Results */}
            {!loading && filteredCourses.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <h3 className="text-xl font-medium text-gray-700">No courses found</h3>
                <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
                <button 
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('All Courses');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Become an Instructor - Simplified */}
            {/* <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="md:w-2/3 mb-6 md:mb-0">
                  <h2 className="text-xl font-bold mb-2">Become an Instructor</h2>
                  <p className="opacity-90 text-sm">Share your forex knowledge and expertise with our community.</p>
                </div>
                <button className="bg-white text-blue-600 hover:bg-blue-50 font-medium px-5 py-2 rounded-lg transition text-sm">
                  Apply Now
                </button>
              </div>
            </div> */}
          </div>
          
          {/* News Sidebar - Simplified */}
          <div className="lg:w-1/3 space-y-6">




            {/* News Section - Updated with External Links */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 p-5 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Live Forex News</h2>
              </div>
              
              <div>
                {newsSources.map((source) => (
                  <a 
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="block p-5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800 text-sm flex items-center">
                          {source.name}
                          <FiExternalLink className="ml-2 text-blue-500" />
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {source.description}
                        </p>
                      </div>
                      <div className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded">
                        Live
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            
      
            
           




          </div>
        </div>
      </div>
    </div>
  );
};

export default ForexSchool;
