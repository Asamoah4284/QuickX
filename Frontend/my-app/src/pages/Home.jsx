import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowUp } from 'react-icons/fa';
import { FaWhatsapp } from 'react-icons/fa';
import Features from "../components/Features";
import Hero from "../components/Hero";
import Intro from "../components/Intro";
import Call from "../components/Call";
import Footer from "../components/Footer";
import Book from "../components/Book";
import Learn from "../components/Learn";
import Testimonials from "../components/Testimonials";
import Courses from "../components/Courses";

function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isWhatsappHovered, setIsWhatsappHovered] = useState(false);

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

  // WhatsApp contact function
  const handleWhatsappClick = () => {
    // Replace with your actual WhatsApp number
    const phoneNumber = '+233555756303';
    const message = 'Hello! I would like to get in touch with you.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden w-full relative">
      <Hero/>
      <Learn/>
      <Book/>
      <Testimonials/> 
      <Courses/>
      <Features/>
      <Intro/>
      <Call/>     

      {/* Scroll to top button and WhatsApp */}
      <AnimatePresence>
        {showScrollTop && (
          <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
            {/* WhatsApp Button with enhanced animations */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: isWhatsappHovered ? 1.1 : 1,
                rotate: isWhatsappHovered ? 5 : 0
              }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ 
                duration: 0.3,
                type: "spring",
                stiffness: 300
              }}
              onClick={handleWhatsappClick}
              onMouseEnter={() => setIsWhatsappHovered(true)}
              onMouseLeave={() => setIsWhatsappHovered(false)}
              className="relative bg-green-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors duration-200 overflow-hidden"
              aria-label="Contact us on WhatsApp"
            >
              {/* Pulse animation ring */}
              <motion.div 
                className="absolute inset-0 rounded-full bg-green-500"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 0, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Floating animation for the icon */}
              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <FaWhatsapp className={`text-2xl ${isWhatsappHovered ? 'animate-bounce' : ''}`} />
              </motion.div>
              
              {/* Tooltip that appears on hover */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ 
                  opacity: isWhatsappHovered ? 1 : 0,
                  x: isWhatsappHovered ? 0 : 20
                }}
                transition={{ duration: 0.2 }}
                className="absolute right-full mr-3 bg-white text-green-600 px-3 py-1 rounded-md shadow-md whitespace-nowrap text-sm font-medium"
              >
                Message us on WhatsApp
              </motion.div>
            </motion.button>
            
            {/* Scroll to top button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              onClick={scrollToTop}
              className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors duration-200"
              aria-label="Scroll to top"
            >
              <FaArrowUp className="text-xl" />
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Home; 