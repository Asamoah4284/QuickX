import React from 'react';
import { Link } from 'react-router-dom';

const courses = [
  {
    id: 1,
    title: 'Productivity Systems for Busy Professionals',
    category: 'Business',
    image: 'https://i.pinimg.com/736x/90/a3/bc/90a3bc59e3f92890f4c251c9d79559ae.jpg',
  },
  {
    id: 2,
    title: 'Modern JavaScript: From Fundamentals to Real Projects',
    category: 'Development',
    image: 'https://i.pinimg.com/736x/22/ff/c3/22ffc3a863846e2d265dc4f6ac994abd.jpg',
  },
  {
    id: 3,
    title: 'Logo Design: From Concept to Presentation',
    category: 'Design',
    image: 'https://i.pinimg.com/736x/06/98/6a/06986a1609bd2fcbd8cb047c789738d0.jpg',
  },
];

function Courses() {
  return (
    <section className="bg-gray-50 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="mb-3 text-2xl font-bold text-gray-900 sm:mb-4 sm:text-3xl lg:text-4xl">
            Trending on Quick X
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-gray-600 sm:text-base md:text-lg">
            A snapshot of what learners are opening right now—browse the full catalog anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {courses.map((course) => (
            <Link 
              to="/courses" 
              key={course.id} 
              className="cursor-pointer overflow-hidden rounded-xl bg-white shadow-md transition-transform hover:scale-[1.02] sm:hover:scale-105"
            >
              <div className="relative">
                <img
                  src={course.image}
                  alt={course.title}
                  className="h-36 w-full object-cover sm:h-44 md:h-48"
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