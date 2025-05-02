import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const WebDevSchool = () => {
  // Course categories
  const categories = [
    'All Courses',
    'Beginner',
    'Intermediate',
    'Advanced',
    'Frontend',
    'Backend',
  ];

  // Sample course data
  const coursesData = [
    {
      id: 1,
      title: 'HTML, CSS & JavaScript Fundamentals',
      description: 'Build a strong foundation in core web technologies and create interactive websites.',
      level: 'Beginner',
      duration: '6 weeks',
      lessons: 18,
      image: 'https://img.freepik.com/free-photo/html-css-collage-concept-with-person_23-2150062008.jpg',
      instructor: 'Jennifer Lee',
      rating: 4.8,
      students: 4230
    },
    {
      id: 2,
      title: 'Responsive Web Design',
      description: 'Learn to build websites that work beautifully across all devices and screen sizes.',
      level: 'Beginner',
      duration: '4 weeks',
      lessons: 12,
      image: 'https://img.freepik.com/free-photo/responsive-design-devices-concept_23-2150170858.jpg',
      instructor: 'Mark Johnson',
      rating: 4.7,
      students: 3142
    },
    {
      id: 3,
      title: 'React.js Development',
      description: 'Master React.js to build interactive, component-based user interfaces.',
      level: 'Intermediate',
      duration: '8 weeks',
      lessons: 24,
      image: 'https://img.freepik.com/free-photo/web-design-website-content-layout-creative-concept_53876-161553.jpg',
      instructor: 'Sofia Rodriguez',
      rating: 4.9,
      students: 2876
    },
    {
      id: 4,
      title: 'Node.js & Express Backend',
      description: 'Build scalable server-side applications using Node.js and Express.',
      level: 'Intermediate',
      duration: '6 weeks',
      lessons: 20,
      image: 'https://img.freepik.com/free-photo/close-up-image-programer-working-his-desk-office_1098-18707.jpg',
      instructor: 'David Chen',
      rating: 4.8,
      students: 2154
    },
    {
      id: 5,
      title: 'Full-Stack Development with MERN',
      description: 'Create complete web applications using MongoDB, Express, React, and Node.js.',
      level: 'Advanced',
      duration: '10 weeks',
      lessons: 32,
      image: 'https://img.freepik.com/free-photo/javascript-code-computer-screen-desktop-pc-table_53876-139192.jpg',
      instructor: 'Rachel Kim',
      rating: 4.9,
      students: 1867
    },
    {
      id: 6,
      title: 'Modern UI/UX Design for Developers',
      description: 'Learn design principles and tools to create beautiful user interfaces.',
      level: 'Intermediate',
      duration: '5 weeks',
      lessons: 15,
      image: 'https://img.freepik.com/free-photo/person-working-ui-ux_23-2150171075.jpg',
      instructor: 'Jason Taylor',
      rating: 4.7,
      students: 2233
    }
  ];
  
  // Web Dev News Data
  const newsData = [
    {
      id: 1,
      title: 'React 19 Release Announced With New Features',
      summary: 'The React team has officially unveiled React 19, introducing several performance improvements and new APIs.',
      date: 'July 15, 2023',
      source: 'React Blog'
    },
    {
      id: 2,
      title: 'CSS Container Queries Now Supported in All Major Browsers',
      summary: 'Container queries, one of the most requested CSS features, is now available in all major browsers.',
      date: 'July 12, 2023',
      source: 'CSS Tricks'
    },
    {
      id: 3,
      title: 'TypeScript 5.2 Beta Released',
      summary: 'Microsoft has released TypeScript 5.2 beta with improved type checking and new language features.',
      date: 'July 8, 2023',
      source: 'TypeScript Blog'
    },
    {
      id: 4,
      title: 'Web Assembly Usage Growing Among Enterprise Applications',
      summary: 'A new survey shows increasing adoption of WebAssembly in production environments for performance-critical tasks.',
      date: 'July 5, 2023',
      source: 'State of JS'
    }
  ];

  const [activeCategory, setActiveCategory] = useState('All Courses');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter courses based on active category and search term
  const filteredCourses = coursesData.filter(course => {
    const matchesCategory = activeCategory === 'All Courses' || course.level === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          course.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 mt-12">Web Development Academy</h1>
            <p className="text-xl opacity-90 mb-8">
              Transform your coding skills and build modern, responsive websites and applications.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-6 py-3 rounded-lg transition">
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
                className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-none transition"
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
            
            <div className="flex gap-2 overflow-hidden w-full md:w-auto">
              {categories.map(category => (
                <button
                  key={category}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium text-sm transition ${
                    activeCategory === category
                      ? 'bg-emerald-600 text-white'
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
            {/* Course Grid */}
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
                        e.target.src = '/images/webdev-default.jpg'; 
                      }}
                    />
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-xs font-medium">
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
                        <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mr-2 text-xs">
                          {course.instructor.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-xs font-medium text-gray-700">{course.instructor}</span>
                      </div>
                      <Link 
                        to={`/school/course/${course.id}`} 
                        className="text-emerald-600 hover:text-emerald-700 font-medium text-xs px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
                      >
                        Enroll Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* No Results */}
            {filteredCourses.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <h3 className="text-xl font-medium text-gray-700">No courses found</h3>
                <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria</p>
                <button 
                  className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium"
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
            <div className="mt-8 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="md:w-2/3 mb-6 md:mb-0">
                  <h2 className="text-xl font-bold mb-2">Become an Instructor</h2>
                  <p className="opacity-90 text-sm">Share your web development expertise and help train the next generation of developers.</p>
                </div>
                <button className="bg-white text-emerald-600 hover:bg-emerald-50 font-medium px-5 py-2 rounded-lg transition text-sm">
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
                    <a href="#" className="flex items-center text-gray-700 hover:text-emerald-600 transition text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Web Development Roadmap
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-emerald-600 transition text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      HTML & CSS Cheatsheet
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-emerald-600 transition text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      JavaScript Best Practices
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-emerald-600 transition text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Free UI Component Libraries
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* News Section */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 p-5 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Web Dev News</h2>
                <a href="#" className="text-emerald-600 text-sm font-medium">View All</a>
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
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 text-white">
                <div className="text-sm mb-1 font-medium text-emerald-100">Featured</div>
                <h3 className="text-lg font-bold mb-2">Full-Stack Developer Bootcamp</h3>
                <p className="opacity-90 mb-4 text-sm">
                  Comprehensive 16-week program to become a professional web developer.
                </p>
                <div className="flex items-center mb-4">
                  <div className="text-xl font-bold">$899</div>
                  <div className="ml-2 text-sm line-through opacity-75">$1499</div>
                </div>
                <button className="w-full bg-white text-emerald-600 font-medium py-2 rounded-lg hover:bg-emerald-50 transition text-sm">
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

export default WebDevSchool; 