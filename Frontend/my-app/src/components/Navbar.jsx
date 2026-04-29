import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiUser, FiLogOut, FiBook } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isWhatsappHovered, setIsWhatsappHovered] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  /** Navbar is scroll-only on marketing pages, always visible in app flows. */
  const alwaysVisible =
    pathname === '/membership' ||
    pathname.startsWith('/creator') ||
    pathname.startsWith('/store') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout');

  const navSolid = scrolled || alwaysVisible;
  const creatorDestination =
    user?.role === 'tutor' && user?.creatorStatus === 'approved'
      ? '/creator/dashboard'
      : '/creator/onboarding';
  const creatorLabel =
    user?.role === 'tutor' && user?.creatorStatus === 'approved'
      ? 'Creator studio'
      : 'Become a creator';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    handleScroll();
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

  // WhatsApp contact function
  const handleWhatsappClick = () => {
    // Replace with your actual WhatsApp number
    const phoneNumber = '1234567890';
    const message = 'Hello! I would like to get in touch with you.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 translate-y-0 opacity-100 pointer-events-auto transition-all duration-300 ${
        navSolid ? 'bg-[#1B5EF5] text-white shadow-md' : 'bg-transparent'
      }`}
    >
      <div className="md:max-w-6xl mx-auto md:py-2 md:px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 w-full items-center justify-end px-4 sm:px-0">
          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:space-x-2">
            <Link to="/courses" className={`${navSolid ? 'text-white hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
              Courses
            </Link>
            <Link to="/store" className={`${navSolid ? 'text-white hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
              Books
            </Link>
            <Link to="/creator/onboarding" className={`${navSolid ? 'text-white hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
              Creator programs
            </Link>
         
            {/* Auth Buttons */}
            <div className="flex items-center space-x-4 ml-4">
              {isLoggedIn ? (
                <div className="flex items-center space-x-4">
                  <Link to="/membership" className={`flex items-center ${navSolid ? 'text-white-200 hover:text-white' : 'text-white hover:text-white-900'} px-3 py-2 text-sm font-medium`}>
                    <FiBook className="mr-1.5" /> My Courses
                  </Link>
                  <div className="relative group">
                    <button className="flex items-center space-x-1 bg-blue-50 text-blue-500 hover:bg-blue-100 px-3 py-2 rounded-md text-sm font-medium">
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                        {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="ml-1.5">{user?.fullName?.split(' ')[0] || 'User'}</span>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                      <Link to="/membership" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Dashboard
                      </Link>
                      <Link to={creatorDestination} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        {creatorLabel}
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
                  <Link to="/login" className="bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Log In
                  </Link>
                  <Link to="/register" className={`${navSolid ? 'bg-transparent text-white hover:bg-white hover:text-blue-800' : 'bg-white text-blue-500 hover:bg-blue-50'} border ${navSolid ? 'border-white' : 'border-blue-500'} px-4 py-2 rounded-md text-sm font-medium transition-colors`}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
