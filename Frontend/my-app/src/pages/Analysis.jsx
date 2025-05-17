import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserGraduate, FaNewspaper, FaStar, FaLock, FaExclamationTriangle, FaChalkboardTeacher, FaArrowUp, FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function Mentorship({ premium = false }) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    name: '',
    number: '',
    location: ''
  });
  const navigate = useNavigate();

  // Add scroll event listener to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleUpgradeClick = () => {
    setShowPlanModal(true);
  };

  const handlePlanSelection = (plan) => {
    setSelectedPlan(plan);
    setShowPlanModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const whatsappMessage = `My name is ${paymentDetails.name} and I want to make payment for ${selectedPlan.duration} mentorship`;
    const whatsappUrl = `https://wa.me/233555756303?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
    setShowPaymentModal(false);
  };

  const handleInputChange = (e) => {
    setPaymentDetails({
      ...paymentDetails,
      [e.target.name]: e.target.value
    });
  };

  // Mock data - in a real app, this would come from an API
  const upcomingSessions = [
    {
      id: 1,
      title: 'Advanced Trading Strategies',
      summary: 'Deep dive into complex trading patterns and risk management techniques...',
      date: 'June 15, 2023',
      time: '10:00 AM EST',
      isPremium: false,
      mentor: 'Jane Smith',
      icon: 'trading'
    },
    {
      id: 2,
      title: 'Market Psychology Masterclass',
      summary: 'Learn to control emotions and develop a winning trader\'s mindset...',
      date: 'June 16, 2023',
      time: '2:00 PM EST',
      isPremium: true,
      mentor: 'John Doe',
      icon: 'psychology'
    },
    {
      id: 3,
      title: 'Technical Analysis Workshop',
      summary: 'Advanced chart patterns and indicator combinations for better entry/exit points...',
      date: 'June 17, 2023',
      time: '11:00 AM EST',
      isPremium: false,
      mentor: 'Michael Brown',
      icon: 'technical'
    }
  ];

  const mentorshipPlans = [
    { 
      duration: '1 Week', 
      price: 120, 
      description: 'Perfect for quick learning',
      features: ['Free Beginner Ebook', 'Free Strategy Ebook', 'Confluence and Strategy', '1 on 1 Chat Review', 'Exclusive Signal Access'],
      color: 'from-blue-500 to-blue-600'
    },
    { 
      duration: '2 Weeks', 
      price: 200, 
      description: 'Balanced learning period',
      features: ['Everything in Week 1 PLUS:', 'Psycology Mastery', 'Risk Management', 'Live Trading Sessions', 'Daily Signals Support'],
      color: 'from-purple-500 to-purple-600',
      popular: true
    },
    { 
      duration: '1 Month', 
      price: 350, 
      description: 'Comprehensive mentorship',
      features: ['All Features From Week 1 & 2 AND:', 'Full Custom Strategy Development', 'Weekly Reviews and Corrections', 'Extended Access to All Sessions'],
      color: 'from-indigo-500 to-indigo-600'
    }
  ];

  const SessionCard = ({ item }) => (
    <motion.div 
      className={`bg-white rounded-lg shadow-md overflow-hidden p-6 relative ${item.isPremium ? 'border-yellow-400 border' : ''}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center mb-4">
        <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white mr-4">
          <FaChalkboardTeacher />
        </div>
        <div className="flex flex-col text-sm text-gray-500">
          <span>{item.date}</span>
          <span>{item.time}</span>
          <span>with {item.mentor}</span>
        </div>
        {item.isPremium && (
          <div className="ml-auto bg-yellow-300 text-gray-800 text-xs py-1 px-2 rounded flex items-center gap-1">
            <FaStar /> Premium
          </div>
        )}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{item.title}</h3>
      <p className="text-gray-700 leading-relaxed">{item.summary}</p>
      {item.isPremium && !premium && (
        <div className="absolute inset-0 bg-gray-800 bg-opacity-80 flex flex-col items-center justify-center text-white gap-4 p-8 text-center">
          <FaLock className="text-3xl" />
          <span>Premium Session</span>
          <button 
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
            onClick={handleUpgradeClick}
          >
            Upgrade Now
          </button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto p-8 font-sans relative">
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg w-full max-w-md text-center shadow-xl animate-fadeIn">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800">Upgrade to Premium?</h3>
            <p className="mb-6 text-gray-700">Would you like to upgrade to our premium mentorship service?</p>
            <div className="flex justify-center gap-4">
              <button 
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded transition-colors duration-200"
                onClick={() => handleConfirmation(true)}
              >
                Yes
              </button>
              <button 
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded transition-colors duration-200"
                onClick={() => handleConfirmation(false)}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mentorship Plan Selection Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 w-full max-w-4xl text-center shadow-2xl border border-gray-200 max-h-screen overflow-y-auto"
        >
          <div className="">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
              Choose Your Learning Path
            </div>
          </div>
          
          <h3 className="text-3xl font-bold mb-2 text-gray-800 mt-4">Select Your Mentorship Plan</h3>
          <p className="text-gray-600 mb-8">Unlock your trading potential with our expert guidance</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mentorshipPlans.map((plan) => (
              <motion.div
                key={plan.duration}
                whileHover={{ scale: 1.02, y: -5 }}
                className={`relative rounded-2xl overflow-hidden ${plan.popular ? 'ring-2 ring-purple-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 text-sm font-medium rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <div className="bg-white p-6 h-full flex flex-col">
                  <div className={`bg-gradient-to-r ${plan.color} text-white p-4 rounded-xl mb-4`}>
                    <h4 className="text-2xl font-bold mb-2">{plan.duration}</h4>
                    <p className="text-3xl font-bold">GH₵{plan.price}</p>
                  </div>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-700">
                        <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePlanSelection(plan)}
                    className={`w-full py-3 px-6 rounded-xl font-medium text-white transition-all duration-200 transform hover:scale-105 bg-gradient-to-r ${plan.color} shadow-lg hover:shadow-xl`}
                  >
                    Select Plan
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          <button
            className="mt-8 text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200"
            onClick={() => setShowPlanModal(false)}
          >
            Cancel
          </button>
        </motion.div>
      </div>
      
      )}

      {/* Payment Form Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0  bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 p-8  w-full max-w-md text-center shadow-2xl border border-gray-200"
          >
            <div className="">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
                Complete Your Registration
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-6 text-gray-800 mt-4">Complete Your Payment</h3>
            
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="space-y-4">
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={paymentDetails.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="number"
                      value={paymentDetails.number}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={paymentDetails.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter your location"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Selected Plan:</span>
                  <span className="font-semibold text-gray-800">{selectedPlan.duration}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">GH₵{selectedPlan.price}</span>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <FaWhatsapp className="text-xl" />
                  Proceed to WhatsApp
                </button>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="text-center mt-20 mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-800">{premium ? 'Premium Mentorship' : 'Trading Mentorship'}</h1>
        <p className="text-xl text-gray-500 mb-8">Accelerate your trading journey with expert guidance</p>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-r-lg mt-8">
        <div className="flex items-start">
          <FaExclamationTriangle className="text-blue-400 text-xl mt-1 mr-3" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Important</h2>
            <div className="text-gray-700 space-y-2">
              <p>If you are a complete beginner, we strongly recommend enrolling first in the Forex School available on our platform. Our Forex School covers everything you need to know from the ground up.</p>
              <p>After completing the school, you can subscribe to this mentorship program if you require further one-on-one mentoring and coaching.</p>
              <p className="font-medium">Please note that this mentorship does not include beginner lessons. Instead, we focus on practical trading information, strategy sharpening, professional insights, and helping you become a more confident and independent trader.</p>
            </div>
          </div>
        </div>
      </div>
        
        <div className="flex justify-center gap-4 mt-8 md:flex-row flex-col">
          <button 
            className={`py-3 px-6 rounded-md font-medium transition-colors duration-200 ${activeTab === 'upcoming' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Sessions
          </button>
          <button 
            className={`py-3 px-6 rounded-md font-medium transition-colors duration-200 ${activeTab === 'past' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
            onClick={() => setActiveTab('past')}
          >
            Past Sessions
          </button>
          <button 
            className={`py-3 px-6 rounded-md font-medium transition-colors duration-200 ${activeTab === 'resources' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
            onClick={() => setActiveTab('resources')}
          >
            Learning Resources
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        <section>
          <div className="flex justify-between items-center mt-6 ">
            <h2 className="text-2xl font-bold text-gray-800">Upcoming Mentorship Sessions</h2>
            <button className="text-blue-500 font-medium">View Calendar</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingSessions.map(item => (
              <SessionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      </div>

      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors duration-200 z-50"
            aria-label="Scroll to top"
          >
            <FaArrowUp className="text-xl" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Mentorship; 