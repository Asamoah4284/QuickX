import React from 'react';
import { FiClock, FiBook, FiStar } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const courses = [
  {
    id: 1,
    title: "Introduction to Forex Trading",
    category: "Forex Trading",
    image: "https://i.pinimg.com/736x/90/a3/bc/90a3bc59e3f92890f4c251c9d79559ae.jpg",
 
  },
  {
    id: 2,
    title: "Financial Security Thinking and Principles Theory",
    category: "Crypto",
    image: "https://i.pinimg.com/736x/22/ff/c3/22ffc3a863846e2d265dc4f6ac994abd.jpg",
 
  },
  {
    id: 3,
    title: "Free Logo Design: From Concept to Presentation",
    category: "Web Development",
    image: "https://i.pinimg.com/736x/06/98/6a/06986a1609bd2fcbd8cb047c789738d0.jpg",
 
  }
];

function Courses() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            Popular Courses
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our most popular courses and enhance your skills with expert-led instruction
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <Link 
              to="/school" 
              key={course.id} 
              className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-105 cursor-pointer"
            >
              <div className="relative">
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-teal-500 text-white text-sm font-medium rounded-md">
                    {course.category}
                  </span>
                </div>
              </div>

           
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Courses; 