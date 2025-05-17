import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

const Hero = () => {
  const [activeMembers, setActiveMembers] = useState([
    { id: 1, image: 'https://pixner.net/html/tradexy/tradexy/assets/images/testimonial/testimonial-author1.png' },
    { id: 2, image: 'https://pixner.net/html/tradexy/tradexy/assets/images/testimonial/testimonial-author2.png' },
    { id: 3, image: '	https://pixner.net/html/tradexy/tradexy/assets/images/testimonial/testimonial-author3.png' },
    { id: 4, image: 'https://pixner.net/html/tradexy/tradexy/assets/images/testimonial/testimonial-author5.png' }
  ]);

  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  const [nextContentIndex, setNextContentIndex] = useState(0);
  const [animationState, setAnimationState] = useState('visible'); // 'visible', 'exiting', 'entering'
  
  const backgroundImages = [
    'https://pixner.net/html/tradexy/tradexy/assets/images/hero/banner5-slide2.png',
    './images/7.jpg',
    'https://i.pinimg.com/736x/47/d3/6e/47d36eab2ad7496068569c27e70823d8.jpg',
    'https://i.pinimg.com/736x/3c/a8/fd/3ca8fd1755e8349df5dffe1cb375d211.jpg',

    
  ];

  const contentSlides = [
    {
      tagline: "Accurate Signals for Steady Trading Success",
      heading: "Master Forex, Crypto & Coding the Smart Way",
      description: "Tired of trial and error? Learn with clarity, confidence, and real results—only at Quick X."
    },
    {
      tagline: "Proven Strategies for Consistent Growth",
      heading: "Transform Your Trading Skills With Experts",
      description: "Take the guesswork out of trading with our data-driven approach and personalized mentoring."
    },
    {
      tagline: "Become a Developer While You Trade",
      heading: "Code Your Way to Financial Freedom",
      description: "Unique dual-focus programs that teach both trading and in-demand coding skills for maximum opportunity."
    },
    {
      tagline: "Join Our Community of Successful Traders",
      heading: "From Beginner to Pro With Step-by-Step",
      description: "Follow proven pathways designed by experts who have already achieved what you're aiming for."
    },
  ];

  // For independent animations of each text element
  const taglineRef = useRef(null);
  const headingRef = useRef(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    // Initialize AOS
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      offset: 100,
    });

    const interval = setInterval(() => {
      // Start exit animation
      setAnimationState('exiting');
      
      // Calculate the next content index
      const nextIndex = (currentBackgroundIndex + 1) % backgroundImages.length;
      setNextContentIndex(nextIndex);
      
      // After exit animation, change background and prepare for entrance
      setTimeout(() => {
        setCurrentBackgroundIndex(nextIndex);
        setAnimationState('entering');
        
        // After brief delay, show the content
        setTimeout(() => {
          setAnimationState('visible');
        }, 100);
      }, 600);
      
    }, 6000); // 6 seconds per slide for better readability

    return () => clearInterval(interval);
  }, [currentBackgroundIndex, backgroundImages.length]);

  // Animation classes based on state
  const getAnimationClasses = (element) => {
    const baseClasses = "transition-all duration-700 ";
    
    if (animationState === 'visible') {
      return baseClasses + "opacity-100 translate-y-0";
    } else if (animationState === 'exiting') {
      // Different exit animations for different elements
      if (element === 'tagline') {
        return baseClasses + "opacity-0 -translate-y-8 transform";
      } else if (element === 'heading') {
        return baseClasses + "opacity-0 -translate-y-12 transform";
      } else {
        return baseClasses + "opacity-0 -translate-y-16 transform";
      }
    } else if (animationState === 'entering') {
      // Different entrance animations for different elements
      if (element === 'tagline') {
        return baseClasses + "opacity-0 translate-y-8 transform";
      } else if (element === 'heading') {
        return baseClasses + "opacity-0 translate-y-12 transform";
      } else {
        return baseClasses + "opacity-0 translate-y-16 transform";
      }
    }
    
    return baseClasses;
  };

  // Dynamic delay for staggered animations
  const getDelay = (element) => {
    if (animationState === 'exiting') {
      if (element === 'tagline') return '0ms';
      if (element === 'heading') return '100ms';
      return '200ms';
    } else if (animationState === 'entering') {
      if (element === 'tagline') return '0ms';
      if (element === 'heading') return '150ms';
      return '300ms';
    }
    return '0ms';
  };

  // Get content based on animation state
  const content = animationState === 'entering' || animationState === 'visible' 
    ? contentSlides[currentBackgroundIndex]
    : contentSlides[nextContentIndex === 0 ? contentSlides.length - 1 : nextContentIndex - 1];

  return (
    <div className="relative  text-white flex items-center overflow-hidden">
      {/* Background gradient overlay */}
      <div className="bsolute inset-0 bg-opacity-30 z-0"></div>
      
      {/* Background graphics - 5 with multiple images */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline // Important for iOS autoplay
          className="absolute top-1/2 left-1/2 w-auto h-auto min-w-full min-h-full transform -translate-x-1/2 -translate-y-1/2 object-cover"
          // The className above is a common CSS trick to make the video cover the area
          // while maintaining its aspect ratio, similar to `background-size: cover;`
        >
          <source src='./images/stock.mp4' type="video/mp4" />
      
        </video>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 py-16 z-10 relative">
        <div className="grid grid-cols-1 py-12 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7">
            <div className="hero-content relative overflow-hidden">
              {/* Tagline with animation */}
              <div 
                ref={taglineRef}
                className={getAnimationClasses('tagline')}
                style={{ transitionDelay: getDelay('tagline') }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-green-500">
                    <img src="https://pixner.net/html/tradexy/tradexy/assets/images/element/section-badge5.png" alt="Arrow" className="w-[40px] h-6 text-green-500" />
                  </span>
                  <h4 className="text-green-500 font-semibold text-xl">{content.tagline}</h4>
                </div>
              </div>
              
              {/* Main heading with animation */}
              <div 
                ref={headingRef}
                className={getAnimationClasses('heading')}
                style={{ transitionDelay: getDelay('heading') }}
              >
                <h1 className="text-3xl lg:text-5xl font-bold mb-4 leading-tight">
                  {content.heading}
                </h1>
              </div>
              
              {/* Description and features with animation */}
              <div 
                ref={descriptionRef}
                className={getAnimationClasses('description')}
                style={{ transitionDelay: getDelay('description') }}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10">
                  {/* Active members section */}
                  <div className="member-section">
                    <span className="block mb-3 text-gray-300">5M+ Active Members</span>
                    <div className="flex">
                      {activeMembers.map((member, index) => (
                        <div 
                          key={member.id} 
                          className="w-10 h-10 rounded-full border-2 border-white overflow-hidden"
                          style={{ marginLeft: index > 0 ? '-12px' : '0' }}
                        >
                          <img 
                            src={member.image} 
                            alt={`Member ${member.id}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      <div 
                        className="w-10 h-10 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center font-bold"
                        style={{ marginLeft: '-12px' }}
                      >
                        +
                      </div>
                    </div>
                  </div>
                  
                  {/* Vertical line separator (hide on mobile) */}
                  <div className="hidden md:block h-16 w-px bg-gray-600"></div>
                  
                  {/* Paragraph */}
                  <p className="text-lg text-gray-300 max-w-md">
                    {content.description}
                  </p>
                </div>
                
                {/* Call-to-action buttons */}
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to="/school" 
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition duration-300 min-w-[200px] text-center"
                  >
                    Start Learning Now
                  </Link>
                  <Link 
                    to="/store" 
                    className="px-6 py-3 border border-green-500 text-green-500 hover:bg-green-500 hover:text-white font-medium rounded-full transition duration-300 min-w-[200px] text-center"
                  >
                    Explore Books
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - typically has an image of a person but we'll leave this as a placeholder */}
          <div className="lg:col-span-5 hidden lg:block" data-aos="zoom-in" data-aos-delay="500">
            {/* Image would go here in the actual implementation */}
            {/* <img src="/images/trader.png" alt="Professional trader" className="w-full" /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
