import React, { useEffect, useRef, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Custom cursor component
const CustomCursor = () => {
  const cursorRef = useRef(null);
  const pointerRef = useRef(null);
  const [isMoving, setIsMoving] = useState(false);
  let moveTimeout = null;
  
  useEffect(() => {
    // Initialize cursor position to center of screen to avoid corner issue
    let cursorPosition = { 
      x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, 
      y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0 
    };
    let pointerPosition = { ...cursorPosition };
    
    // Set initial position directly
    if (cursorRef.current && pointerRef.current) {
      cursorRef.current.style.left = `${cursorPosition.x}px`;
      cursorRef.current.style.top = `${cursorPosition.y}px`;
      pointerRef.current.style.left = `${pointerPosition.x}px`;
      pointerRef.current.style.top = `${pointerPosition.y}px`;
    }
    
    const moveCursor = (e) => {
      // Store target position
      cursorPosition = { x: e.clientX, y: e.clientY };
      // While moving, pointer is offset
      pointerPosition = { x: e.clientX + 8, y: e.clientY + 8 };
      
      // Set moving state to true
      setIsMoving(true);
      
      // Clear any existing timeout
      if (moveTimeout) clearTimeout(moveTimeout);
      
      // Set a timeout to detect when movement stops
      moveTimeout = setTimeout(() => {
        setIsMoving(false);
        // When stopped, pointer should go to the exact center of the circle
        pointerPosition = { x: e.clientX, y: e.clientY };
      }, 300);
    };
    
    // Animation function for smooth following
    const animateCursor = () => {
      if (cursorRef.current && pointerRef.current) {
        // Calculate the distance between current position and target
        const cursorX = parseFloat(cursorRef.current.style.left || cursorPosition.x);
        const cursorY = parseFloat(cursorRef.current.style.top || cursorPosition.y);
        
        const pointerX = parseFloat(pointerRef.current.style.left || pointerPosition.x);
        const pointerY = parseFloat(pointerRef.current.style.top || pointerPosition.y);
        
        // Calculate new position with easing
        // Main cursor follows more slowly (reduce factor for slower movement)
        const newCursorX = cursorX + (cursorPosition.x - cursorX) * 0.05;
        const newCursorY = cursorY + (cursorPosition.y - cursorY) * 0.05;
        
        cursorRef.current.style.left = `${newCursorX}px`;
        cursorRef.current.style.top = `${newCursorY}px`;
        
        // Determine target position for pointer (offset when moving, centered when stopped)
        let targetX = pointerPosition.x;
        let targetY = pointerPosition.y;
        
        // If not moving, force exact center position based on current circle position
        if (!isMoving) {
          targetX = newCursorX;
          targetY = newCursorY;
        }
        
        // Easing factor depends on whether cursor is moving or not
        // When stopped, pointer moves faster to the center
        const easingFactor = isMoving ? 0.08 : 0.2;
        const newPointerX = pointerX + (targetX - pointerX) * easingFactor;
        const newPointerY = pointerY + (targetY - pointerY) * easingFactor;
        
        pointerRef.current.style.left = `${newPointerX}px`;
        pointerRef.current.style.top = `${newPointerY}px`;
      }
      
      // Continue animation
      animationFrameId = requestAnimationFrame(animateCursor);
    };
    
    // Initialize cursor with mouse position if available
    const initializeCursorPosition = () => {
      if (typeof window !== 'undefined') {
        document.addEventListener('mousemove', moveCursor);
        
        // Add initial dummy mousemove event to position cursor at mouse position
        const initialEvent = new MouseEvent('mousemove', {
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(initialEvent);
      }
    };
    
    // Initialize position
    initializeCursorPosition();
    
    // Start animation
    let animationFrameId = requestAnimationFrame(animateCursor);
    
    return () => {
      document.removeEventListener('mousemove', moveCursor);
      if (moveTimeout) clearTimeout(moveTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <>
      {/* Main circle cursor */}
      <div 
        ref={cursorRef} 
        className="custom-cursor"
        style={{
          position: 'fixed',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid green',
          backgroundColor: 'transparent',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          animation: 'fadeIn 0.3s forwards'
        }}
      />
      
      {/* Pointer element that shows when moving */}
      <div 
        ref={pointerRef} 
        className="cursor-pointer"
        style={{
          position: 'fixed',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'green',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0,
          transform: 'translate(-50%, -50%)',
          animation: 'fadeIn 0.3s forwards'
        }}
      />
      
      {/* Add fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

const Book = () => {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    // Initialize AOS
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      offset: 100,
    });
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Set inView to true when element enters viewport, false when it leaves
        setInView(entry.isIntersecting);
      },
      {
        threshold: 0.3 // When 30% of the element is visible
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <>
      <CustomCursor />
      <section className="py-12 px-4 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8 space-x-4" data-aos="fade-right" data-aos-delay="100">
          <span className="text-blue-500">
                  <img src="	https://pixner.net/html/tradexy/tradexy/assets/images/element/section-badge5.png" alt="Arrow" className="w-[40px] h-6" />
                </span>
            <h2 className="text-2xl font-bold text-blue-600">About Us</h2>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left side with image and years of experience */}
            <div className="relative w-full lg:w-1/2 overflow-hidden" data-aos="fade-up" data-aos-delay="200">
              {/* Main image with infinite animation */}
              <img 
                src="https://bitrader.thetork.com/wp-content/uploads/2023/10/banner_img-2.png" 
                alt="Professional Trader" 
                className="w-full h-auto animate-float"
                style={{
                  animation: "float 6s ease-in-out infinite"
                }}
              />
              
              {/* CSS for the float animation */}
              <style jsx>{`
                @keyframes float {
                  0% {
                    transform: translateY(0px);
                  }
                  50% {
                    transform: translateY(-15px);
                  }
                  100% {
                    transform: translateY(0px);
                  }
                }
              `}</style>
              
              {/* Secondary overlapping image */}
            
              
              {/* Experience badge */}
            
            </div>

            {/* Right side with text content */}
            <div className="w-full lg:w-1/2" data-aos="fade-left" data-aos-delay="300">
              <h3 className="text-3xl font-bold text-gray-800 mb-4">
                The Platform of Choice for Global Students
              </h3>
              <p className="text-gray-700 mb-8">
                We're committed to providing a secure and transparent learning environment,
                empowering people to connect, learn, and succeed.
              </p>

              <div ref={sectionRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8" data-aos="fade-up" data-aos-delay="400">
                {/* Satisfaction Rate */}
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-2">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e6e6e6" strokeWidth="8" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#2563eb" 
                        strokeWidth="8" 
                        strokeDasharray="283" 
                        strokeDashoffset={inView ? "42" : "283"} 
                        strokeLinecap="round"
                        style={{
                          transition: "stroke-dashoffset 1.5s ease-in-out"
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                      {inView ? (
                        <CountUp end={100} duration={1.5} reset={!inView} />
                      ) : (
                        "0%"
                      )}
                    </div>
                  </div>
                  <p className="text-gray-800 font-semibold">Total Customer Satisfaction</p>
                </div>

                {/* Trade Reviews */}
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-2">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e6e6e6" strokeWidth="8" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#2563eb" 
                        strokeWidth="8" 
                        strokeDasharray="283" 
                        strokeDashoffset={inView ? "65" : "283"}
                        strokeLinecap="round"
                        style={{
                          transition: "stroke-dashoffset 1.5s ease-in-out"
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                      {inView ? (
                        <CountUp end={85} duration={1.5} reset={!inView} />
                      ) : (
                        "0%"
                      )}
                    </div>
                  </div>
                  <p className="text-gray-800 font-semibold">Student Reviews</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" data-aos="fade-up" data-aos-delay="500">
                <div className="flex items-center">
                  <div className="text-orange-500 mr-2">✓</div>
                  <span className="text-gray-800">Expert Knowledge</span>
                </div>
                <div className="flex items-center">
                  <div className="text-orange-500 mr-2">✓</div>
                  <span className="text-gray-800">Leading Technology</span>
                </div>
                <div className="flex items-center">
                  <div className="text-orange-500 mr-2">✓</div>
                  <span className="text-gray-800">Well-received Service</span>
                </div>
                <div className="flex items-center">
                  <div className="text-orange-500 mr-2">✓</div>
                  <span className="text-gray-800">Good Customer Care</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

// Enhanced CountUp component with reset capability
const CountUp = ({ end, duration, reset }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Reset count to 0 when reset prop changes to true
    if (reset) {
      setCount(0);
      return;
    }
    
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 2000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    const animationId = window.requestAnimationFrame(step);
    
    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [end, duration, reset]);
  
  return `${count}%`;
};

export default Book;
