import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const CryptoSchool = () => {
  // Course categories
  const categories = [
    'All Courses',
    'Beginner',
    'Intermediate',
    'Advanced',
    'Blockchain',
    'DeFi',
    'NFTs'
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
        console.log('Fetching crypto courses from:', `${API_URL}/api/courses`);
        const response = await axios.get(`${API_URL}/api/courses?courseType=crypto`);
        
        // Log the raw API response
        console.log('Raw API response for crypto courses:', response);
        
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Invalid response format from server');
        }
        
        // Transform backend data to match our frontend structure
        const formattedCourses = response.data.map(course => {
          const thumbnailUrl = course.thumbnail ? 
            (course.thumbnail.startsWith('http') ? course.thumbnail : `${API_URL}${course.thumbnail}`) 
            : '/images/crypto-default.jpg';
          
          console.log('Processing crypto course:', {
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
        console.error('Error fetching crypto courses:', err);
        setError('Failed to fetch courses. Please try again later.');
        
        // Fallback to sample course data if API fails
        setCoursesData([
          {
            id: 1,
            title: 'Cryptocurrency Basics',
            description: 'Learn the fundamentals of blockchain, cryptocurrencies, and digital assets.',
            level: 'beginner',
            duration: '4 weeks',
            lessons: 12,
            image: 'https://img.freepik.com/free-photo/bitcoin-concept-golden-bitcoins-with-laptop-keyboard_1150-6531.jpg',
            instructor: 'Alex Rivera',
            rating: 4.8,
            students: 3245,
            price: 299
          },
          {
            id: 2,
            title: 'Blockchain Technology',
            description: 'Understand the technology behind cryptocurrencies and its applications.',
            level: 'intermediate',
            duration: '6 weeks',
            lessons: 18,
            image: 'https://img.freepik.com/free-vector/blockchain-technology-background_1017-14504.jpg',
            instructor: 'Sarah Chen',
            rating: 4.9,
            students: 2176,
            price: 349
          },
          {
            id: 3,
            title: 'DeFi Protocols & Applications',
            description: 'Explore decentralized finance ecosystems, protocols, and yield strategies.',
            level: 'advanced',
            duration: '8 weeks',
            lessons: 24,
            image: 'https://img.freepik.com/free-photo/digital-screen-with-cryptocurrency-information_23-2149455168.jpg',
            instructor: 'Dr. Michael Peterson',
            rating: 4.7,
            students: 1567,
            price: 399
          },
          {
            id: 4,
            title: 'Crypto Trading Strategies',
            description: 'Learn effective trading techniques for cryptocurrency markets.',
            level: 'intermediate',
            duration: '5 weeks',
            lessons: 15,
            image: 'https://img.freepik.com/free-photo/close-up-smartphone-with-bitcoin-charts_23-2149515453.jpg',
            instructor: 'Emma Wilson',
            rating: 4.6,
            students: 2340,
            price: 329
          },
          {
            id: 5,
            title: 'NFT Creation & Marketing',
            description: 'Create, mint, and market your own NFT collections.',
            level: 'beginner',
            duration: '4 weeks',
            lessons: 12,
            image: 'https://img.freepik.com/free-photo/nft-concept-arrangement_23-2149294493.jpg',
            instructor: 'Tyler Rodriguez',
            rating: 4.8,
            students: 1823,
            price: 279
          },
          {
            id: 6,
            title: 'Web3 Development',
            description: 'Build decentralized applications (dApps) on Ethereum and other blockchains.',
            level: 'advanced',
            duration: '10 weeks',
            lessons: 30,
            image: 'https://img.freepik.com/free-photo/metaverse-concept-collage_23-2149419546.jpg',
            instructor: 'David Park',
            rating: 4.9,
            students: 1287,
            price: 449
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, []);

  // Crypto Market News Data
  const newsData = [
    {
      id: 1,
      title: 'Ethereum Completes Major Network Upgrade',
      summary: 'The Ethereum network successfully implemented its latest upgrade, improving scalability and reducing transaction fees.',
      date: 'July 10, 2023',
      source: 'CryptoNews'
    },
    {
      id: 2,
      title: 'Bitcoin Breaks $40K Resistance Level',
      summary: 'Bitcoin surged past the key $40,000 resistance level after months of consolidation, reaching a 3-month high.',
      date: 'July 8, 2023',
      source: 'CoinDesk'
    },
    {
      id: 3,
      title: 'Major Bank Launches Crypto Custody Services',
      summary: 'A leading financial institution has announced plans to offer cryptocurrency custody services to institutional clients.',
      date: 'July 5, 2023',
      source: 'Bloomberg'
    },
    {
      id: 4,
      title: 'New DeFi Protocol Reaches $1B TVL',
      summary: 'An innovative decentralized finance protocol has reached $1 billion in total value locked just one month after launch.',
      date: 'July 3, 2023',
      source: 'DeFi Pulse'
    }
  ];

  // Filter courses based on active category and search term
  const filteredCourses = coursesData.filter(course => {
    const matchesCategory = activeCategory === 'All Courses' || 
                         course.level?.toLowerCase() === activeCategory?.toLowerCase();
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 mt-12">Cryptocurrency Academy</h1>
            <p className="text-xl opacity-90 mb-8">
              Master blockchain technology, crypto trading, and decentralized finance with our expert-led courses.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-white text-purple-700 hover:bg-purple-50 font-semibold px-6 py-3 rounded-lg transition">
                Browse Courses
              </button>
              <button className="bg-transparent border border-white text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-lg transition">
                Our Learning Approach
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 hidden md:block">Courses</h2>
            
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search courses..."
                className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-100 focus:border-purple-400 outline-none transition"
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
                      ? 'bg-purple-600 text-white'
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
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
            
            {/* Course Grid */}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredCourses.map(course => (
                  <div key={course.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition duration-300">
                    <div className="relative">
                      <img 
                        src={course.image} 
                        alt={course.title}
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/crypto-default.jpg'; 
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-purple-600 text-white px-2.5 py-0.5 rounded-full text-xs font-medium">
                        {course.level}
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <h3 className="text-lg font-bold mb-2 text-gray-800 line-clamp-1">{course.title}</h3>
                      <p className="text-gray-600 mb-3 text-sm line-clamp-2">{course.description}</p>
                      
                      <div className="flex items-center mb-3">
                        <div className="mr-2 text-yellow-500 flex">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i}
                              xmlns="http://www.w3.org/2000/svg" 
                              className={`h-4 w-4 ${i < Math.floor(course.rating) ? 'fill-current' : 'fill-current opacity-30'}`}
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-gray-700 font-medium text-sm">{course.rating}</span>
                        <span className="mx-2 text-gray-400 text-xs">•</span>
                        <span className="text-gray-600 text-sm">{course.students} students</span>
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
                          <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-2 text-xs">
                            {course.instructor.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs font-medium text-gray-700">{course.instructor}</span>
                        </div>
                        <Link 
                          to={`/school/pricing?level=${course.level}&id=${course.id}`}
                          className="text-purple-600 hover:text-purple-700 font-medium text-xs px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 transition"
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
            {filteredCourses.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <h3 className="text-xl font-medium text-gray-700">No courses found</h3>
                <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
                <button 
                  className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCategory('All Courses');
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* Become an Instructor */}
            <div className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="md:w-2/3 mb-6 md:mb-0">
                  <h2 className="text-xl font-bold mb-2">Become an Instructor</h2>
                  <p className="opacity-90 text-sm">Share your crypto knowledge and help others navigate the blockchain ecosystem.</p>
                </div>
                <button className="bg-white text-purple-600 hover:bg-purple-50 font-medium px-5 py-2 rounded-lg transition text-sm">
                  Apply Now
                </button>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:w-1/3 space-y-6">
            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 p-5">
                <h2 className="text-lg font-bold text-gray-800">Resources</h2>
              </div>
              <div className="p-5">
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-purple-600 transition text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Beginner's Guide to Crypto
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-purple-600 transition text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Blockchain Technology Explained
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-purple-600 transition text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      DeFi Protocols Directory
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-purple-600 transition text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      NFT Marketplace Guide
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* News Section */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 p-5 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Crypto News</h2>
                <a href="#" className="text-purple-600 text-sm font-medium">View All</a>
              </div>
              
              <div>
                {newsData.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`p-5 hover:bg-gray-50 transition-colors ${
                      index !== newsData.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-gray-800 text-sm">{item.title}</h3>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.summary}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{item.date}</span>
                      <span className="text-gray-500">{item.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Featured Course Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 text-white">
                <div className="text-sm mb-1 font-medium text-purple-100">Featured</div>
                <h3 className="text-lg font-bold mb-2">Web3 Developer Bootcamp</h3>
                <p className="opacity-90 mb-4 text-sm">
                  Comprehensive 12-week program to become a blockchain developer.
                </p>
                <div className="flex items-center mb-4">
                  <div className="text-xl font-bold">$799</div>
                  <div className="ml-2 text-sm line-through opacity-75">$1299</div>
                </div>
                <button className="w-full bg-white text-purple-600 font-medium py-2 rounded-lg hover:bg-purple-50 transition text-sm">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoSchool;
