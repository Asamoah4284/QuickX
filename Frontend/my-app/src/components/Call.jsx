import React from 'react';
import { Link } from 'react-router-dom';

const Call = () => {
  return (
    <section className="bg-gradient-to-r from-gray-50 to-gray-100 py-14 sm:py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-2xl font-bold leading-snug text-black sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl">
            Your next skill is one course away
          </h2>
          
          <p className="mb-6 text-sm leading-relaxed text-[#333] sm:mb-8 sm:text-base md:text-lg lg:text-xl">
            Search the catalog, compare what each course covers, and learn with instructors who break topics down clearly—whenever it fits your schedule.
          </p>
          
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
           <Link to="/courses"><button type="button" className="rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition duration-300 hover:from-blue-500 hover:to-blue-600 sm:px-8 sm:py-3 sm:text-base">
              Browse the catalog
            </button></Link> 
            <Link to="/register"><button type="button" className="rounded-lg border border-blue-400 bg-transparent px-6 py-2.5 text-sm font-semibold text-blue-400 transition duration-300 hover:bg-blue-400/10 sm:px-8 sm:py-3 sm:text-base">
              Create an account
            </button></Link>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Call;
