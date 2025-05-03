import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiLogOut, FiBook } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isWhatsappHovered, setIsWhatsappHovered] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Clean up the event listener
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const checkAuthStatus = () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      console.log('Checking auth status:', { token: !!token, userData: !!userData });
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setIsLoggedIn(true);
          setUser(parsedUser);
          console.log('User authenticated:', parsedUser.fullName);
        } catch (error) {
          console.error('Error parsing user data:', error);
          setIsLoggedIn(false);
          setUser(null);
          // Clear invalid data
          localStorage.removeItem('user');
        }
      } else {
        console.log('User not authenticated');
        setIsLoggedIn(false);
        setUser(null);
      }
    };
    
    // Check auth status immediately when component mounts
    checkAuthStatus();
    
    // Listen for custom auth change events from login/register components
    const handleAuthChange = () => {
      checkAuthStatus();
    };
    
    // Storage event handler for multi-tab support
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' || e.key === 'user') {
        checkAuthStatus();
      }
    };
    
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    
    // Dispatch custom event to ensure all components update
    window.dispatchEvent(new Event('auth-change'));
    
    // Redirect to home page instead of login
    navigate('/');
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.mobile-menu-container') && 
          !event.target.closest('.mobile-menu-button')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    // Lock scroll when menu is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // WhatsApp contact function
  const handleWhatsappClick = () => {
    // Replace with your actual WhatsApp number
    const phoneNumber = '1234567890';
    const message = 'Hello! I would like to get in touch with you.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-gradient-to-r from-blue-900 to-blue-950 text-white shadow-md' 
        : 'bg-transparent'
    }`}>
      <div className="md:max-w-6xl mx-auto md:py-2 md:px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className=" flex ">
              <img 
                src="/images/logo.jpg" 
                alt="Quick X Logo" 
                className="md:h-21 h-10 w-auto object-contain rounded-md"
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-2">
            <Link to="/school" className={`${scrolled ? 'text-white hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
              School
            </Link>
            <Link to="/analysis" className={`${scrolled ? 'text-white hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
              Mentorship
            </Link>
            <Link to="/store" className={`${scrolled ? 'text-white hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
              Store
            </Link>
            <Link to="/about" className={`${scrolled ? 'text-white hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
              About
            </Link>
         
            {/* Auth Buttons */}
            <div className="flex items-center space-x-4 ml-4">
              {isLoggedIn ? (
                <div className="flex items-center space-x-4">
                  <Link to="/membership" className={`flex items-center ${scrolled ? 'text-white-200 hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
                    <FiBook className="mr-1.5" /> My Courses
                  </Link>
                  <div className="relative group">
                    <button className="flex items-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-md text-sm font-medium">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="ml-1.5">{user?.fullName?.split(' ')[0] || 'User'}</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                      <Link to="/membership" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Dashboard
                      </Link>
                      <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Link to="/login" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Log In
                  </Link>
                  <Link to="/register" className={`${scrolled ? 'bg-transparent text-white hover:bg-white hover:text-blue-900' : 'bg-white text-blue-600 hover:bg-blue-50'} border ${scrolled ? 'border-white' : 'border-blue-600'} px-4 py-2 rounded-md text-sm font-medium transition-colors`}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="mobile-menu-button inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none z-50"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Sliding from right */}
      <div 
        className={`fixed top-0 right-0 h-full w-1/2 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 md:hidden mobile-menu-container ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '80%' }}
      >
        <div className="h-16 flex items-center justify-between border-b border-gray-200 px-4">
          <h2 className="text-lg font-semibold text-blue-900">Menu</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
          >
           
          </button>
        </div>
        
        <div className="px-4 pt-4 pb-3 space-y-3">
          <Link 
            to="/school" 
            className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            School
          </Link>
          <Link 
            to="/analysis" 
            className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            Mentorship
          </Link>
          <Link 
            to="/store" 
            className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            Store
          </Link>
          <Link 
            to="/about" 
            className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
        </div>
        
        <div className="pt-4 pb-3 border-t border-gray-200 px-4">
          {isLoggedIn ? (
            <>
              <div className="flex items-center px-3 py-2">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.fullName || 'User'}</div>
                  <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  to="/membership"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Link 
                to="/login" 
                className="block w-full px-3 py-2 text-base font-medium text-center text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="block w-full px-3 py-2 text-base font-medium text-center text-blue-600 bg-white border border-blue-600 hover:bg-blue-50 rounded-md"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Overlay when menu is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </nav>
  );
};

export default Navbar;
