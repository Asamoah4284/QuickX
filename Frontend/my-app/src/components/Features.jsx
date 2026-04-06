import React, { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const Features = () => {
  useEffect(() => {
    // Initialize AOS
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      offset: 100,
    });
  }, []);

  return (
    <section className="bg-white py-16 sm:py-24 md:py-32 lg:py-40">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center md:flex-row">
          <div className="mb-8 w-full max-w-xs sm:max-w-sm md:mb-0 md:w-1/2 md:max-w-none" data-aos="fade-right" data-aos-delay="100">
            <img 
              src="https://i.pinimg.com/736x/a7/2e/b6/a72eb6dad6d4c20201d3a70c4fb784cf.jpg" 
              alt="Person learning online with laptop" 
              className="mx-auto w-full max-w-[280px] object-contain sm:max-w-sm md:max-w-lg"
            />
          </div>
          
          <div className="relative md:w-1/2 md:pl-8 lg:pl-12">
            {/* Globe decorator element */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 opacity-20 hidden lg:block" data-aos="zoom-in" data-aos-delay="300">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#4299e1" strokeWidth="1" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="#4299e1" strokeWidth="0.5" />
                <ellipse cx="50" cy="50" rx="40" ry="20" fill="none" stroke="#4299e1" strokeWidth="0.5" />
                <ellipse cx="50" cy="50" rx="40" ry="20" fill="none" stroke="#4299e1" strokeWidth="0.5" transform="rotate(90 50 50)" />
                <ellipse cx="50" cy="50" rx="40" ry="20" fill="none" stroke="#4299e1" strokeWidth="0.5" transform="rotate(45 50 50)" />
                <ellipse cx="50" cy="50" rx="40" ry="20" fill="none" stroke="#4299e1" strokeWidth="0.5" transform="rotate(-45 50 50)" />
              </svg>
            </div>
            
            <div className="mb-2 flex items-center sm:mb-3" data-aos="fade-left" data-aos-delay="200">
              <div className="flex space-x-1">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                <span className="h-2 w-2 rounded-full bg-blue-300"></span>
              </div>
              <h3 className="ml-3 text-lg font-medium text-blue-600 sm:text-xl md:text-2xl">Why Choose Us</h3>
            </div>
            
            <h2 className="mb-4 text-xl font-bold leading-snug text-gray-800 sm:mb-6 sm:text-2xl md:text-3xl" data-aos="fade-left" data-aos-delay="300">
              One place to discover courses, follow lessons, and track progress
            </h2>
            
            <p className="mb-6 text-sm leading-relaxed text-gray-600 sm:mb-8 sm:text-base" data-aos="fade-left" data-aos-delay="400">
              Quick X is built around how people actually learn online: clear course pages, organized modules,
              and instructors who focus on outcomes—not hype. Find something that fits your goal and start when you are ready.
            </p>
            
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2" data-aos="fade-up" data-aos-delay="500">
              <div className="flex items-start">
                <div className="mr-3 h-5 w-5 shrink-0 text-blue-600 sm:h-6 sm:w-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 sm:text-base">Wide course catalog</span>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 h-5 w-5 shrink-0 text-blue-600 sm:h-6 sm:w-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 sm:text-base">Self-paced video lessons</span>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 h-5 w-5 shrink-0 text-blue-600 sm:h-6 sm:w-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 sm:text-base">Instructor-led paths</span>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 h-5 w-5 shrink-0 text-blue-600 sm:h-6 sm:w-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 sm:text-base">Skills you can use right away</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
