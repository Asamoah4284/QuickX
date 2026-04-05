import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { FiUser, FiBook, FiCalendar, FiClock, FiAward, FiBookOpen, FiSettings, FiLogOut, FiTrendingUp, FiDollarSign, FiTarget, FiArrowRight } from 'react-icons/fi';
import axios from 'axios';


const API_URL = import.meta.env.VITE_API_URL;

/** Same rule as Navbar: treat as signed-in only when both token and cached user exist. */
function readCachedUser() {
  try {
    const token = localStorage.getItem('authToken');
    const raw = localStorage.getItem('user');
    if (token && raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore invalid JSON
  }
  return null;
}

function Membership() {
  const location = useLocation();
  const [user, setUser] = useState(readCachedUser);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [purchasedBooks, setPurchasedBooks] = useState([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [courseLoadError, setCourseLoadError] = useState(null);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [momoNumber, setMomoNumber] = useState('');
  const [network, setNetwork] = useState('MTN');
  const [withdrawalError, setWithdrawalError] = useState('');
  const [withdrawalSuccess, setWithdrawalSuccess] = useState('');
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);

  // Define animation styles
  const animationStyles = `
    @keyframes fadeInDown {
      0% {
        opacity: 0;
        transform: translateY(-20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  // Add refresh function for courses
  const refreshCourses = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;

      const coursesResponse = await axios.get(`${API_URL}/api/courses/user/purchased`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (coursesResponse.data && coursesResponse.data.length > 0) {
        const formattedCourses = coursesResponse.data.map(course => {
          const imagePath = course.thumbnail ? 
            (course.thumbnail.startsWith('http') ? course.thumbnail : `${API_URL}${course.thumbnail}`)
            : 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&h=120&q=80';
          
          return {
            id: course._id || course.id,
            title: course.title,
            progress: course.progress || 0,
            lastAccessed: course.lastAccessed || 'Recently',
            image: imagePath
          };
        });
        
        setPurchasedCourses(formattedCourses);
        setCourseLoadError(null);
      }
    } catch (error) {
      console.error('Error refreshing courses:', error);
      setCourseLoadError('Failed to refresh courses. Please try again later.');
    }
  };

  // Add event listener for course progress updates
  useEffect(() => {
    const handleCourseProgressUpdate = () => {
      // Optimistically update progress for the last accessed course
      setPurchasedCourses(prevCourses => {
        const lastCourseId = localStorage.getItem('lastAccessedCourseId');
        if (!lastCourseId) return prevCourses;
        return prevCourses.map(course =>
          course.id === lastCourseId
            ? { ...course, progress: Math.min(course.progress + 1, 100) }
            : course
        );
      });
      refreshCourses();
    };

    window.addEventListener('course-progress-updated', handleCourseProgressUpdate);
    return () => {
      window.removeEventListener('course-progress-updated', handleCourseProgressUpdate);
    };
  }, []);

  useEffect(() => {
    // Set active tab from location state if provided
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
      
      // Show success message if coming from purchase
      if (location.state.activeTab === 'myCourses') {
        setShowSuccessMessage(true);
        
        // Auto-hide the message after 5 seconds
        const timer = setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
      
      // Show success message for book purchases
      if (location.state.activeTab === 'myBooks') {
        setShowSuccessMessage(true);
        
        // Auto-hide the message after 5 seconds
        const timer = setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
    
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const authToken = localStorage.getItem('authToken');
        
        if (authToken) {
          // Fetch fresh user data from the server including referral info
          const userResponse = await axios.get(`${API_URL}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          
          if (userResponse.data) {
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(userResponse.data));
            setUser(userResponse.data);
          }
          
          // Fetch purchased courses from backend
          await refreshCourses();
            
          // Check localStorage for books
          const localBooks = localStorage.getItem('purchasedBooks');
          if (localBooks) {
            setPurchasedBooks(JSON.parse(localBooks));
          }
          
          // Dispatch auth-change event
          window.dispatchEvent(new Event('auth-change'));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        const status = error.response?.status;
        if (status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setUser(null);
          window.dispatchEvent(new Event('auth-change'));
          return;
        }
        setCourseLoadError('Failed to load your data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [location.state]);

  // Success Notification Component
  const SuccessNotification = () => {
    if (!showSuccessMessage) return null;
    
    // Determine message based on active tab
    const getSuccessMessage = () => {
      if (activeTab === 'myCourses') {
        return {
          title: 'Purchase successful!',
          detail: 'Your course is now available in "My Courses"'
        };
      } else if (activeTab === 'myBooks') {
        return {
          title: 'Book added to your library!',
          detail: 'Your book is now available in "My Books"'
        };
      }
      return {
        title: 'Operation successful!',
        detail: 'Your changes have been saved'
      };
    };
    
    const message = getSuccessMessage();
    
    return (
      <div className="fixed top-24 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50 max-w-md"
           style={{
             animation: 'fadeInDown 0.5s ease-out forwards'
           }}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{message.title}</p>
            <p className="text-xs mt-1">{message.detail}</p>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="inline-flex text-green-500 rounded-md p-1.5 hover:bg-green-200 focus:outline-none"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    
    // Dispatch custom event to ensure all components update
    window.dispatchEvent(new Event('auth-change'));
    
    // Redirect to home page instead of login
    window.location.href = '/';
  };

  // Circular progress component
  const CircularProgress = ({ progress, size = 60, strokeWidth = 5, color = 'blue-600' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg]"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`rgb(37, 99, 235)`} 
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`text-${color}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-medium text-sm">
          {progress}%
        </div>
      </div>
    );
  };

  // Withdrawal Modal Component
  const WithdrawalModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleWithdrawal = async () => {
      try {
        setIsProcessingWithdrawal(true);
        setWithdrawalError('');
        
        // First update MoMo details
        const authToken = localStorage.getItem('authToken');
        await axios.post(
          `${API_URL}/api/withdrawals/momo-details`,
          {
            momoNumber,
            network
          },
          { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        // Then process withdrawal
        const response = await axios.post(
          `${API_URL}/api/withdrawals/withdraw`,
          {},
          { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        setWithdrawalSuccess(response.data.message);
        // Update user's referral earnings in state
        setUser(prev => ({ ...prev, referralEarnings: 0 }));
        
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          setWithdrawalSuccess('');
        }, 2000);
      } catch (error) {
        setWithdrawalError(error.response?.data?.message || 'Failed to process withdrawal');
      } finally {
        setIsProcessingWithdrawal(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-xl font-semibold mb-4">Withdraw Referral Earnings</h3>
          
          {withdrawalSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-700">{withdrawalSuccess}</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-600">
                  Current balance: <span className="font-semibold">GH₵{user?.referralEarnings?.toFixed(2)}</span>
                </p>
                <p className="text-gray-600">
                  Minimum withdrawal amount: <span className="font-semibold">GH₵20</span>
                </p>
              </div>
              
              {withdrawalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700">{withdrawalError}</p>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="momoNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Money Number
                  </label>
                  <input
                    type="tel"
                    id="momoNumber"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    placeholder="Enter your MoMo number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength="10"
                  />
                </div>

                <div>
                  <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-1">
                    Network Provider
                  </label>
                  <select
                    id="network"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MTN">MTN Mobile Money</option>
                    <option value="Vodafone">Vodafone Cash</option>
                    <option value="AirtelTigo">AirtelTigo Money</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawal}
                  disabled={
                    isProcessingWithdrawal || 
                    user?.referralEarnings < 20 || 
                    !momoNumber || 
                    momoNumber.length !== 10
                  }
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    isProcessingWithdrawal || user?.referralEarnings < 20 || !momoNumber || momoNumber.length !== 10
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isProcessingWithdrawal ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-20">
      {/* Animation Styles */}
      <style>{animationStyles}</style>
      
      {/* Success Notification */}
      <SuccessNotification />
      
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-10">
        {/* Enhanced Welcome Banner */}
        <div className=" overflow-hidden shadow-xl mb-8 relative">
          {/* Background with gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-indigo-700/90 z-10"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605792657660-596af9009e82?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-40"></div>
          
          {/* Content */}
          <div className="relative z-20 p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-start md:items-center">
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-full mr-5 shadow-lg">
                  <FiUser size={36} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.fullName || 'Member'}!</h1>
                  <p className="text-blue-100">Your Quick X membership gives you access to exclusive forex training content.</p>
                </div>
              </div>
              
              <div className="mt-6 md:mt-0">
                <div className="inline-flex bg-white/10 backdrop-blur-md rounded-xl p-1 shadow-lg">
                  <Link to="/school" className="px-4 py-2 text-white hover:bg-white/20 rounded-lg transition duration-200 flex items-center">
                    <FiBook className="mr-2" />
                    Browse Courses
                  </Link>
                  <Link to="/profile" className="px-4 py-2 bg-white text-indigo-700 rounded-lg shadow-md transition duration-200 flex items-center font-medium ml-1">
                    <FiTarget className="mr-2" />
                    My Progress
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center hover:bg-white/20 transition duration-200">
                <div className="bg-blue-500/30 p-3 rounded-full mr-3">
                  <FiTrendingUp className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-white text-sm opacity-80">Completed</p>
                  <p className="text-white font-semibold text-xl">{purchasedCourses.filter(course => course.progress === 100).length} Courses</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center hover:bg-white/20 transition duration-200">
                <div className="bg-indigo-500/30 p-3 rounded-full mr-3">
                  <FiClock className="text-white text-xl" />
                </div>
                <div>
                  <p className="text-white text-sm opacity-80">Learning Time</p>
                  <p className="text-white font-semibold text-xl">{purchasedCourses.length > 0 ? '3.5 Hours' : '0 Hours'}</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex items-center hover:bg-white/20 transition duration-200">
                <div className="bg-purple-500/30 p-3 rounded-full mr-3">
                  <FiDollarSign className="text-white text-xl" />
                </div>
                <div className="flex-grow">
                  <p className="text-white text-sm opacity-80">Referral Earnings</p>
                  <p className="text-white font-semibold text-xl">
                    GH₵{user?.referralEarnings ? user.referralEarnings.toFixed(2) : '0.00'}
                  </p>
                </div>
                <button
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  disabled={!user?.referralEarnings || user?.referralEarnings < 20}
                  className={`ml-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    !user?.referralEarnings || user?.referralEarnings < 20
                      ? 'bg-white/30 text-white/50 cursor-not-allowed'
                      : 'bg-white text-purple-700 hover:bg-white/90'
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            {/* Add Referral Code Card */}
            <div className="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-1">Your Referral Code</h3>
                  <p className="text-white/80 text-sm">Share this code with friends to earn 10% commission on their purchases</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="bg-white/20 px-4 py-2 rounded-lg">
                    <span className="text-white font-mono font-medium text-lg">
                      {user?.referralCode || 'Loading...'}
                    </span>
                  </div>
                  {user?.referralCode && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.referralCode);
                        // You could add a toast notification here
                        alert('Referral code copied to clipboard!');
                      }}
                      className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="md:w-1/4">
            <div className="bg-white  shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mr-3 text-lg font-bold shadow-md">
                    {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : 'U'}
                  </div>
                  <div>
                    <div className="font-medium">{user?.fullName || 'User'}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                  </div>
                </div>
              </div>
              <nav className="p-4">
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'dashboard'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FiAward className="mr-3" />
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('myCourses')}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'myCourses'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FiBook className="mr-3" />
                      My Courses
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('myBooks')}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'myBooks'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FiBookOpen className="mr-3" />
                      My Books
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('certificates')}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'certificates'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FiAward className="mr-3" />
                      Certificates
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'settings'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <FiSettings className="mr-3" />
                      Settings
                    </button>
                  </li>
                  <li className="pt-4 border-t border-gray-100 mt-4">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FiLogOut className="mr-3" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="md:w-3/4">
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Modernized Progress Card */}
                <div className="relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 rounded-3xl -z-10 group-hover:scale-105 transition-transform duration-700"></div>
                  <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-3xl shadow-xl shadow-blue-900/5 p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex-1">
                        <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase mb-3">
                          <FiTrendingUp className="w-3 h-3" />
                          <span>Learning Statistics</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Overall Progress</h2>
                        <p className="text-gray-500 max-w-sm leading-relaxed">
                          {purchasedCourses.length > 0 
                            ? "You're consistently making progress. Keep up the momentum to reach your goals!" 
                            : "Your journey starts here. Browse our courses and take the first step towards mastery."}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-8">
                        <div className="relative group/circle">
                          <div className="absolute inset-0 bg-blue-600/10 rounded-full blur-2xl group-hover/circle:scale-110 transition-transform duration-500"></div>
                          <CircularProgress 
                            progress={
                              purchasedCourses.length > 0 
                                ? Math.floor(purchasedCourses.reduce((sum, course) => sum + course.progress, 0) / purchasedCourses.length) 
                                : 0
                            } 
                            size={120} 
                            strokeWidth={8}
                          />
                        </div>
                        <div className="h-16 w-px bg-gray-100 hidden md:block"></div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-1">Status</span>
                          <div className="flex flex-col">
                            <span className="text-4xl font-extrabold text-gray-900 tracking-tighter">
                              {purchasedCourses.filter(course => course.progress === 100).length}
                            </span>
                            <span className="text-sm font-semibold text-blue-600">
                              of {purchasedCourses.length} Courses Done
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 px-2">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center tracking-tight">
                    <FiClock className="mr-3 text-blue-600" />
                    Recently Accessed
                  </h3>
                  {purchasedCourses.length > 3 && (
                    <button 
                      onClick={() => setActiveTab('myCourses')}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center group"
                    >
                      View All
                      <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
                    
                    {courseLoadError && (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">
                              {courseLoadError}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-6">
                      {purchasedCourses.length > 0 ? (
                        purchasedCourses.slice(0, 3).map(course => (
                        <div 
                          key={course.id} 
                          className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 transform hover:-translate-y-1"
                        >
                          <div className="flex flex-col md:flex-row h-full">
                            <div className="md:w-64 h-48 md:h-auto relative overflow-hidden shrink-0">
                              <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <FiBookOpen className="text-white w-10 h-10 animate-pulse" />
                              </div>
                            </div>
                            
                            <div className="flex-1 p-6 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Link to={`/school/course/${course.id}`} className="font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors tracking-tight line-clamp-1">
                                    {course.title}
                                  </Link>
                                  <div className="shrink-0">
                                    <CircularProgress progress={course.progress} size={50} strokeWidth={4} />
                                  </div>
                                </div>
                                <div className="text-sm text-gray-400 flex items-center">
                                  <FiClock className="mr-1.5 w-3.5 h-3.5" />
                                  <span>Active {course.lastAccessed}</span>
                                </div>
                              </div>
                              
                              <div className="mt-6 flex items-center justify-between gap-4">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000"
                                    style={{ width: `${course.progress}%` }}
                                  ></div>
                                </div>
                                <Link
                                  to={`/school/course/${course.id}`}
                                  className="shrink-0 inline-flex items-center justify-center px-5 py-2 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-all duration-300 group/btn shadow-lg shadow-gray-900/10"
                                >
                                  Resume
                                  <FiArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                        ))
                      ) : (
                        <div className="text-center py-10 border border-gray-200 rounded-xl bg-gray-50">
                          <div className="bg-blue-100 text-blue-600 p-3 rounded-full inline-block mb-3">
                            <FiBook size={24} />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                          <p className="text-gray-500 mb-4 max-w-md mx-auto">
                            You haven't purchased any courses yet. Start your learning journey today!
                          </p>
                          <Link
                            to="/school"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                          >
                            Browse Courses
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            
            {activeTab === 'myCourses' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">My Courses</h2>
                
                {courseLoadError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          {courseLoadError} Showing locally cached courses.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {purchasedCourses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {purchasedCourses.map(course => (
                      <div key={course.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                        <img src={course.image} alt={course.title} className="w-full h-32 object-cover" />
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{course.title}</h3>
                            <CircularProgress progress={course.progress} size={44} />
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center text-sm text-gray-500">
                              <FiClock className="mr-1.5" />
                              Last: {course.lastAccessed}
                            </div>
                            <Link
                              to={`/school/course/${course.id}`}
                              className="text-sm text-white bg-blue-600 px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Continue
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 hover:bg-gray-50 transition-colors">
                      <div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-3">
                        <FiBook size={24} />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">Discover More Courses</h3>
                      <p className="text-sm text-gray-500 text-center mb-3">Enhance your trading skills with our expert-led courses</p>
                      <Link
                        to="/school"
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Browse Courses
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full inline-block mb-3">
                      <FiBook size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                      You haven't purchased any courses yet. Start your learning journey today!
                    </p>
                    <Link
                      to="/school"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    >
                      Browse Courses
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'myBooks' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">My Books</h2>
                
                {purchasedBooks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {purchasedBooks.map(book => (
                      <div key={book.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                        <div className="h-56 overflow-hidden">
                          <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4 flex-grow flex flex-col">
                          <h3 className="font-medium text-gray-900 mb-1">{book.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                          <p className="text-sm text-gray-500 mb-4 flex-grow">{book.description}</p>
                          <a
                            href={book.fileUrl}
                            className="text-sm text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
                            download
                          >
                            Download PDF
                          </a>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 hover:bg-gray-50 transition-colors">
                      <div className="bg-blue-100 text-blue-600 p-3 rounded-full mb-3">
                        <FiBookOpen size={24} />
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">Discover More Books</h3>
                      <p className="text-sm text-gray-500 text-center mb-3">Expand your trading knowledge with our premium books</p>
                      <Link
                        to="/store"
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Browse Books
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full inline-block mb-3">
                      <FiBookOpen size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
                    <p className="text-gray-500 mb-4 max-w-md mx-auto">
                      You haven't purchased any books yet. Expand your trading knowledge with our premium books.
                    </p>
                    <Link
                      to="/store"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    >
                      Browse Books
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'certificates' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">My Certificates</h2>
                
                <div className="text-center py-10">
                  <div className="bg-blue-100 text-blue-600 p-3 rounded-full inline-block mb-3">
                    <FiAward size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
                  <p className="text-gray-500 mb-4 max-w-md mx-auto">
                    Complete a course to earn your first certificate. Certificates can be shared with your network.
                  </p>
                </div>
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Account Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={user.fullName || ''}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={user.email || ''}
                          readOnly
                        />
                      </div>
                    </div>
                    <button className="mt-4 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Edit Profile
                    </button>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-md font-medium text-gray-900 mb-3">Password</h3>
                    <button className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                      Change Password
                    </button>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-md font-medium text-gray-900 mb-3">Notification Settings</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="emailNotifications"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="emailNotifications" className="ml-2 text-sm text-gray-700">
                          Email Notifications
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="marketingEmails"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="marketingEmails" className="ml-2 text-sm text-gray-700">
                          Marketing Emails
                        </label>
                      </div>
                    </div>
                    <button className="mt-4 text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal 
        isOpen={isWithdrawalModalOpen} 
        onClose={() => setIsWithdrawalModalOpen(false)} 
      />
    </div>
  );
}

export default Membership; 