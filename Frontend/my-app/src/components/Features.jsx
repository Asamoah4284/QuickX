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
    <section className="py-40 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0" data-aos="fade-right" data-aos-delay="100">
            <img 
              src="https://i.pinimg.com/736x/a7/2e/b6/a72eb6dad6d4c20201d3a70c4fb784cf.jpg" 
              alt="Trader with charts" 
              className="w-full max-w-lg mx-auto"
            />
          </div>
          
          <div className="md:w-1/2 md:pl-12 relative">
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
            
            <div className="flex items-center mb-3" data-aos="fade-left" data-aos-delay="200">
              <div className="flex space-x-1">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span className="w-2 h-2 rounded-full bg-blue-300"></span>
              </div>
              <h3 className="text-blue-600 text-2xl ml-3 font-medium">Why Choose Us</h3>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-800 mb-6" data-aos="fade-left" data-aos-delay="300">
              Profit, Service, Technology, Stability—Students' Top Choice.
            </h2>
            
            <p className="text-gray-600 mb-8" data-aos="fade-left" data-aos-delay="400">
              Watch our forex trading video tutorials to jumpstart your journey into becoming a profitable
              forex trading expert.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-aos="fade-up" data-aos-delay="500">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 text-blue-600 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700 font-medium">Expert-Curated Content</span>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 text-blue-600 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700 font-medium">Flexible Learning Experience</span>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 text-blue-600 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700 font-medium">Community and Mentorship</span>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 text-blue-600 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700 font-medium">First-class professional skills</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
