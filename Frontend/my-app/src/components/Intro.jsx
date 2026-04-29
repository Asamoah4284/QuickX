import React, { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

const Intro = () => {
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
    <div className="bg-blue-900 py-12 text-white sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:gap-10">
          {/* Left Content */}
          <div className="md:w-1/2">
            <div className="mb-5 sm:mb-6" data-aos="fade-right" data-aos-delay="100">
              {/* <span className="text-[#00b8ff] font-semibold">ABOUT US</span> */}
              <h2 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl md:text-4xl">
                Learn on a platform designed for course discovery
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300 sm:mt-4 sm:text-base">
                Quick X brings together video courses, structured modules, and supplemental resources so you can
                browse what interests you, enroll with confidence, and learn at your pace—whether you are starting out or leveling up.
              </p>
            </div>
          </div>

          {/* Right Image */}
          <div className="w-full max-w-md md:w-1/2 md:max-w-none" data-aos="fade-left" data-aos-delay="400">
            <div className="relative">
              <img 
                src="	https://digitrader.netlify.app/img/core-img/about1.png" 
                alt="Online learning and course platform" 
                className="w-full rounded-lg object-contain"
              />
              <div className="absolute -bottom-5 -left-5 bg-sky-400 text-white p-6 rounded-lg" data-aos="zoom-in" data-aos-delay="600">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;
