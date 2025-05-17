import React, { useEffect } from 'react';
import CountUp from 'react-countup';
import { FaUserPlus, FaFileAlt, FaHandHoldingUsd, FaChartLine, FaHeadset, FaLaptopCode, FaGraduationCap } from 'react-icons/fa';
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
    <div className="bg-[#1e3a64] text-white py-24">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          {/* Left Content */}
          <div className="md:w-1/2">
            <div className="mb-6" data-aos="fade-right" data-aos-delay="100">
              {/* <span className="text-[#00b8ff] font-semibold">ABOUT US</span> */}
              <h2 className="text-4xl font-bold mt-2 mb-4">Master the Future of Finance - Learn Crypto Trading Now!</h2>
              <p className="text-gray-300 mb-6">
               Unlock the Secret of Digital Wealth With Our Expertly Designed Crypto Courses. Whether you're a Beginner or Looking to Sharpen Your Edge, Quickxlearn Gives you Everything you Need to Trade, Invest Smart and Win Big in the Crypto World
              </p>
            </div>

          

            <div className="flex flex-wrap gap-6" data-aos="fade-up" data-aos-delay="300">
              <div className="bg-[#17325a] p-4 rounded-lg flex items-center gap-3">
                <div className="text-[#00b8ff] text-3xl">
                  <FaUserPlus />
                </div>
                <div>
                  <h5 className="font-semibold">Easy To Learn</h5>
                  <p className="text-gray-300 text-sm">Start Learning in minutes</p>
                </div>
              </div>
              <div className="bg-[#17325a] p-4 rounded-lg flex items-center gap-3">
                <div className="text-[#00b8ff] text-3xl">
                  <FaChartLine />
                </div>
                <div>
                  <h5 className="font-semibold">Advanced Learning</h5>
                  <p className="text-gray-300 text-sm">Advance Learning tools</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="md:w-1/2" data-aos="fade-left" data-aos-delay="400">
            <div className="relative">
              <img 
                src="	https://digitrader.netlify.app/img/core-img/about1.png" 
                alt="Crypto Trading Platform" 
                className="w-full rounded-lg"
              />
              <div className="absolute -bottom-5 -left-5 bg-[#00b8ff] text-white p-6 rounded-lg" data-aos="zoom-in" data-aos-delay="600">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;
