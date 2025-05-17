import React from 'react';
import { FaPlay, FaArrowRight, FaGlobeAmericas, FaChartLine, FaShieldAlt, FaLightbulb } from 'react-icons/fa';

const Testimonials = () => {
  return (
    <div className="bg-gradient-to-b from-gray-900 via-blue-900 to-gray-900 py-28">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Left side - image */}
          <div className="w-full md:w-1/2 mb-10 md:mb-0">
            <div className="relative">
              <img 
                src="https://pixner.net/html/tradexy/tradexy/assets/images/app/apps-thumb2.png" 
                alt="Forex video tutorials illustration" 
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
          
          {/* Right side - text content */}
          <div className="w-full md:w-1/2 text-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1">
                <div className="h-3 w-3 rounded-full bg-orange-400"></div>
                <div className="h-3 w-3 rounded-full bg-blue-400"></div>
                <div className="h-3 w-3 rounded-full bg-blue-600"></div>
              </div>
              <h3 className="text-xl font-medium text-blue-300">Video Tutorial</h3>
            </div>
            
            <h2 className="text-4xl font-bold mb-6">Carefully planned forex training video tutorials</h2>
            
            <p className="text-gray-300 mb-8">
              Watch our forex trading video tutorials to jumpstart your journey into becoming a profitable 
              forex trading expert.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="flex items-start gap-3">
                <FaGlobeAmericas className="text-blue-400 text-xl mt-1" />
                <p className="font-medium">Foreign exchange basics</p>
              </div>
              
              <div className="flex items-start gap-3">
                <FaShieldAlt className="text-blue-400 text-xl mt-1" />
                <p className="font-medium">Risk management in actual trading</p>
              </div>
              
              <div className="flex items-start gap-3">
                <FaChartLine className="text-blue-400 text-xl mt-1" />
                <p className="font-medium">Trading Triple X Strategy</p>
              </div>
              
              <div className="flex items-start gap-3">
                <FaLightbulb className="text-blue-400 text-xl mt-1" />
                <p className="font-medium">Psychology of Trading</p>
              </div>
            </div>
            
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-full inline-flex items-center gap-2 transition-all">
              Watch Videos <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
