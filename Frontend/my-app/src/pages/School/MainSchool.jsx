import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 relative overflow-hidden">
        {/* Soft overlay for depth */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className="max-w-6xl mx-auto px-6 py-32 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-20">
            {/* Left: Hero Text */}
            <div className="flex-1 text-center lg:text-left max-w-2xl">
              <h1 className="text-6xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg"
                  style={{ lineHeight: '1.1', letterSpacing: '-0.02em' }}>
                Find the Next Crypto Gem on{' '}
                <span className="text-blue-400">Crito</span><span className="text-yellow-400">X</span>
              </h1>
              <p className="text-2xl text-blue-100 mb-12 font-light leading-relaxed">
                Coin CritoX is the easiest, safest, and fastest way to buy & sell crypto asset exchange.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <button
                  className="px-10 py-3 rounded-full bg-blue-500 text-white font-semibold shadow-lg hover:bg-blue-600 transition-all duration-200 border-2 border-blue-500"
                >
                  Connect Wallet
                </button>
                <button className="px-10 py-3 rounded-full border-2 border-white text-white font-semibold bg-white/10 hover:bg-white/20 shadow-lg transition-all duration-200">
                  Explore Now
                </button>
              </div>
            </div>
            {/* Right: Crypto Card/Coin Illustration */}
          




          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
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
      <div className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">Why Choose Our Schools</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Expert-Led Instruction</h3>
              <p className="text-gray-600">Learn from industry professionals with years of real-world experience in their fields.</p>
            </div>
            
            <div className="p-6 rounded-xl text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Practical Projects</h3>
              <p className="text-gray-600">Apply your knowledge through hands-on projects that simulate real-world scenarios.</p>
            </div>
            
            <div className="p-6 rounded-xl text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Flexible Learning</h3>
              <p className="text-gray-600">Study at your own pace with our flexible scheduling and on-demand video content.</p>
            </div>
          </div>
        </div>
      </div>

      

    </div>
  );
};

export default MainSchool;
