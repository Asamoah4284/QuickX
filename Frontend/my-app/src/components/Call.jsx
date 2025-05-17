import React from 'react';
import { Link } from 'react-router-dom';

const Call = () => {
  return (
    <section className="py-28 bg-gradient-to-r from-gray-50 to-gray-100">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-black mb-6">
            Trade Smarter. Analyze Better. Profit Consistently.
          </h1>
          
          <p className="text-xl text-[#333] mb-8">
            Join thousands of Students who have gain masterery with our expert-led courses, 
            proven strategies, and personalized mentorship.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
           <Link to='/school'><button className="bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-600 hover:to-blue-600 text-white font-semibold py-3 px-8 rounded-lg transition duration-300">
              Browse courses now
            </button></Link> 
            <button className="bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-500/10 font-semibold py-3 px-8 rounded-lg transition duration-300">
              Join for free
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Call;
