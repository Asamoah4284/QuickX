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
              <h2 className="text-4xl font-bold mt-2 mb-4">The Leading Crypto Trading Platform In The World</h2>
              <p className="text-gray-300 mb-6">
                We are a dedicated crypto trading platform providing innovative solutions for digital asset traders. Our platform offers secure, fast, and reliable trading services to users worldwide.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8" data-aos="fade-up" data-aos-delay="200">
              <div className="flex items-center gap-3">
                <div className="text-[#00b8ff] text-4xl">
                  <CountUp end={25} duration={2.5} suffix="K+" />
                </div>
                <div>
                  <h5 className="font-semibold">Active Users</h5>
                  <p className="text-gray-300 text-sm">Worldwide Users</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-[#00b8ff] text-4xl">
                  <CountUp end={11} duration={2.5} suffix="M+" />
                </div>
                <div>
                  <h5 className="font-semibold">Total Transactions</h5>
                  <p className="text-gray-300 text-sm">Processed Daily</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6" data-aos="fade-up" data-aos-delay="300">
              <div className="bg-[#17325a] p-4 rounded-lg flex items-center gap-3">
                <div className="text-[#00b8ff] text-3xl">
                  <FaUserPlus />
                </div>
                <div>
                  <h5 className="font-semibold">Easy Sign Up</h5>
                  <p className="text-gray-300 text-sm">Start trading in minutes</p>
                </div>
              </div>
              <div className="bg-[#17325a] p-4 rounded-lg flex items-center gap-3">
                <div className="text-[#00b8ff] text-3xl">
                  <FaChartLine />
                </div>
                <div>
                  <h5 className="font-semibold">Advanced Trading</h5>
                  <p className="text-gray-300 text-sm">Powerful analytics tools</p>
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
