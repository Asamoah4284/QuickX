import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaBook, FaVideo, FaClipboardList, FaUsers } from 'react-icons/fa';

const Testimonials = () => {
  return (
    <div className="bg-gradient-to-b from-gray-900 via-blue-800 to-gray-900 py-14 sm:py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center gap-6 md:flex-row md:gap-8">
          {/* Left side - image */}
          <div className="mb-6 w-full max-w-[260px] sm:max-w-xs md:mb-0 md:w-1/2 md:max-w-none">
            <div className="relative">
              <img 
                src="https://pixner.net/html/tradexy/tradexy/assets/images/app/apps-thumb2.png" 
                alt="Course lessons and video player" 
                className="mx-auto h-auto w-full max-h-[200px] object-contain sm:max-h-[260px] md:max-h-none"
              />
            </div>
          </div>
          
          {/* Right side - text content */}
          <div className="w-full text-white md:w-1/2">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
              <div className="flex gap-1">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-400 sm:h-3 sm:w-3"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-blue-400 sm:h-3 sm:w-3"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 sm:h-3 sm:w-3"></div>
              </div>
              <h3 className="text-base font-medium text-blue-200 sm:text-lg md:text-xl">How lessons work</h3>
            </div>
            
            <h2 className="mb-4 text-xl font-bold leading-snug sm:mb-6 sm:text-2xl md:text-3xl lg:text-4xl">
              Video-first courses with clear structure
            </h2>
            
            <p className="mb-6 text-sm leading-relaxed text-gray-300 sm:mb-8 sm:text-base">
              Every course is organized into sections and lessons—so you always know what comes next. Replay what you need,
              skip what you already know, and learn in the order that makes sense for you.
            </p>
            
            <div className="mb-8 grid grid-cols-1 gap-4 sm:mb-10 md:grid-cols-2 md:gap-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <FaVideo className="mt-0.5 shrink-0 text-lg text-blue-300 sm:text-xl" />
                <p className="text-sm font-medium sm:text-base">HD lessons you can pause anytime</p>
              </div>
              
              <div className="flex items-start gap-2 sm:gap-3">
                <FaClipboardList className="mt-0.5 shrink-0 text-lg text-blue-300 sm:text-xl" />
                <p className="text-sm font-medium sm:text-base">Syllabus &amp; outcomes on every course page</p>
              </div>
              
              <div className="flex items-start gap-2 sm:gap-3">
                <FaBook className="mt-0.5 shrink-0 text-lg text-blue-300 sm:text-xl" />
                <p className="text-sm font-medium sm:text-base">Extra resources when instructors include them</p>
              </div>
              
              <div className="flex items-start gap-2 sm:gap-3">
                <FaUsers className="mt-0.5 shrink-0 text-lg text-blue-300 sm:text-xl" />
                <p className="text-sm font-medium sm:text-base">Built for solo study or cohort-style programs</p>
              </div>
            </div>
            
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-sm text-white transition-all hover:bg-blue-600 sm:px-8 sm:py-3 sm:text-base"
            >
              Explore courses <FaArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
