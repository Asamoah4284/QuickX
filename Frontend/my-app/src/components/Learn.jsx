import React from 'react';

const Learn = () => {
  const categories = [
    {
      id: 1,
      title: 'Forex',
      description: 'Learn about foreign exchange markets and currency trading',
      icon: '📈',
      color: 'from-blue-500 to-cyan-400',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
    },
    {
      id: 2,
      title: 'Crypto',
      description: 'Explore cryptocurrency trading, blockchain technology and DeFi',
      icon: '🪙',
      color: 'from-amber-500 to-yellow-400',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
    },
    {
      id: 3,
      title: 'Web Development',
      description: 'Master frontend and backend technologies for modern web applications',
      icon: '💻',
      color: 'from-purple-500 to-pink-400',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
    },
    {
      id: 4,
      title: 'Books',
      description: 'Discover recommended books on finance and personal growth',
      icon: '📚',
      color: 'from-emerald-500 to-teal-400',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-16 px-4">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-extrabold mb-3">Expand Your Knowledge</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">Choose a learning path that interests you and start your journey today</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {categories.map((category) => (
          <div 
            key={category.id}
            className={`${category.bgColor} rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}
          >
            <div className={`h-2 bg-gradient-to-r ${category.color}`}></div>
            <div className="p-6">
              <div className={`inline-flex items-center justify-center w-14 h-10 rounded-full ${category.bgColor} mb-3 ${category.textColor} text-3xl`}>
                {category.icon}
              </div>
              <h3 className={`text-xl font-bold mb-3 ${category.textColor}`}>{category.title}</h3>
              <p className="text-gray-600 mb-4">{category.description}</p>
              <button className={`inline-flex items-center font-medium ${category.textColor} hover:underline`}>
                Get Started 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Learn;
