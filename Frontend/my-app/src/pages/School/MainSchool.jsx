import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Features from '../../components/Features';

const courseData = {
  forex: {
    title: "School of Forex",
    description: "Master currency trading strategies and market analysis techniques",
    courses: [
      { id: "fx-1", title: "Forex Trading Fundamentals", duration: "8 weeks", level: "Beginner" },
      { id: "fx-2", title: "Technical Analysis for Forex", duration: "6 weeks", level: "Intermediate" },
      { id: "fx-3", title: "Advanced Forex Trading Strategies", duration: "10 weeks", level: "Advanced" }
    ],
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-500",
    hoverColor: "hover:text-blue-600",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    icon: "💱",
    path: "forex",
    longDescription: "Our School of Forex provides comprehensive education on currency trading. Learn how to analyze market trends, implement effective trading strategies, and manage risk in the dynamic foreign exchange market."
  },
  crypto: {
    title: "Cryptocurrency",
    description: "Learn blockchain technology, crypto trading and investment strategies",
    courses: [
      { id: "crypto-1", title: "Cryptocurrency Basics", duration: "4 weeks", level: "Beginner" },
      { id: "crypto-2", title: "Blockchain Technology", duration: "8 weeks", level: "Intermediate" },
      { id: "crypto-3", title: "DeFi & NFT Markets", duration: "6 weeks", level: "Advanced" }
    ],
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-500",
    hoverColor: "hover:text-purple-600",
    buttonColor: "bg-purple-600 hover:bg-purple-700",
    icon: "🪙",
    path: "crypto",
    longDescription: "Join our Cryptocurrency program to understand the revolutionary blockchain technology behind digital currencies. Explore trading techniques, investment approaches, and the latest developments in decentralized finance."
  },
  webdev: {
    title: "Web Development",
    description: "Build modern websites and applications with latest technologies",
    courses: [
      { id: "web-1", title: "HTML, CSS & JavaScript Foundations", duration: "10 weeks", level: "Beginner" },
      { id: "web-2", title: "React.js Development", duration: "8 weeks", level: "Intermediate" },
      { id: "web-3", title: "Full-Stack Web Development", duration: "12 weeks", level: "Advanced" }
    ],
    color: "emerald",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-500",
    hoverColor: "hover:text-emerald-600",
    buttonColor: "bg-emerald-600 hover:bg-emerald-700",
    icon: "🖥️",
    path: "webdev",
    longDescription: "Our Web Development track equips you with the skills to create stunning, functional websites and applications. From frontend technologies to backend solutions, we cover the entire development stack."
  }
};

const levelStyles = {
  "Beginner": "bg-blue-100 text-blue-800",
  "Intermediate": "bg-amber-100 text-amber-800",
  "Advanced": "bg-rose-100 text-rose-800"
};

const MainSchool = () => {
  const [activeSchool, setActiveSchool] = useState(null);
  const navigate = useNavigate();

  const handleSchoolClick = (schoolKey) => {
    // Navigate to the school-specific page based on path
    navigate(`/school/${courseData[schoolKey].path}`);
  };

  const handleCourseClick = (courseId) => {
    navigate(`/school/${courseId}`);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="bg-blue-900 relative overflow-hidden">
        {/* Soft overlay for depth */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className="max-w-6xl mx-auto px-6 py-32 relative z-10">
          <div className="grid grid-cols-12 gap-8 items-center">
            {/* Left: Hero Text - 60% */}
            <div className="col-span-12 lg:col-span-7 text-center lg:text-left">
              <h1 className="text-6xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg"
                  style={{ lineHeight: '1.1', letterSpacing: '-0.02em' }}>
             
                <span className="text-blue-400">Quick</span><span className="text-yellow-400">XLearn</span>
              </h1>
              <p className="text-2xl text-blue-100 mb-12 font-light leading-relaxed">
              Welcome to QuicKxLearning Center, Lighting up minds through learning to build the skillset and mindset for financial freedom
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <a href='#schools' className="px-10 py-3 rounded-full bg-blue-500 text-white font-semibold shadow-lg hover:bg-blue-600 transition-all duration-200 border-2 border-blue-500"
                >
                 View Schools
                </a>
                <button className="px-10 py-3 rounded-full border-2 border-white text-white font-semibold bg-white/10 hover:bg-white/20 shadow-lg transition-all duration-200">
                  Explore Now
                </button>
              </div>
            </div>
            {/* Right: Crypto Card/Coin Illustration - 40% */}
            <div className="col-span-12 lg:col-span-5">
              <figure className="w-full h-full flex items-center justify-center">
                <img 
                  src="./images/school-pic.png" 
                  alt="a school picture" 
                  className="w-full h-auto object-contain"
                />
              </figure>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      {/* Advertisement Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiA4YzAgMi0yIDQtNCA0cy00LTItNC00IDItNCA0LTQgNCAyIDQgNHoiIGZpbGw9IiNlZWUiLz48L2c+PC9zdmc+')] opacity-10"></div>
        <div className="max-w-6xl mx-auto px-4 py-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Ad Container */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-4 shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
                <div className="relative">
                  <div className="absolute top-0 right-0">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">Featured</span>
                  </div>
                  <div className="aspect-[16/9] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden relative group">
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors duration-300"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-4">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">Premium Partner</h3>
                        <p className="text-sm text-gray-600 mb-3">Your advertisement content here</p>
                        <button className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl">
                          Learn More
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Premium Placement</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-xs font-medium text-blue-600">Sponsored</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">Ad Space</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Ad Container */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-4 shadow-xl h-full">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <div className="aspect-[4/3] bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden relative group">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-3">
                          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white shadow-md flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <h4 className="text-base font-semibold text-gray-800">Quick Ad</h4>
                          <p className="text-xs text-gray-600">Your quick message here</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Sponsored Content</span>
                    <button className="text-xs text-blue-600 hover:text-blue-700">View Details</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schools Section */}
      <div id="schools" className="max-w-6xl mx-auto  px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">Our Learning Schools</h2>
        <p className="text-gray-600 text-center max-w-3xl mx-auto mb-16">Select from our specialized schools to find the perfect courses for your learning journey</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.entries(courseData).map(([key, school]) => (
            <div 
              key={key} 
              className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-l-4 border-transparent hover:border-l-4 hover:border-blue-500"
            >
              <div className={`p-6 group ${school.bgColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-2xl font-bold">
                    <Link 
                      to={`/school/${school.path}`} 
                      className={`${school.hoverColor} transition-colors`}
                    >
                      {school.title}
                    </Link>
                  </h3>
                  <span className="text-4xl transform group-hover:scale-110 transition-transform">{school.icon}</span>
                </div>
                <p className="text-gray-700 mb-4">{school.description}</p>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">{school.courses.length} Courses</div>
                  <Link 
                    to={`/school/${school.path}`}
                    className="px-4 py-2 rounded-lg bg-white shadow-sm text-blue-600 font-medium flex items-center group-hover:shadow-md transition-all"
                  >
                    View Courses
                    <svg 
                      className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <Features/>

    </div>
  );
};

export default MainSchool;
