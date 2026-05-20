import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { FiUser, FiBook, FiCalendar, FiClock, FiAward, FiBookOpen, FiSettings, FiLogOut, FiTrendingUp, FiDollarSign, FiTarget, FiArrowRight } from 'react-icons/fi';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';
import Loader from '../components/Loader';

const API_URL = import.meta.env.VITE_API_URL;

/** Build My Books list from GET /api/users/me (populated) or legacy id-only array. */
function normalizePurchasedBooksFromUser(purchasedBooks) {
  if (!Array.isArray(purchasedBooks) || purchasedBooks.length === 0) return [];
  return purchasedBooks
    .filter(Boolean)
    .map((b) => {
      if (typeof b === 'string') {
        return {
          id: b,
          _id: b,
          title: '',
          author: '',
          description: '',
          thumbnail: null,
          image: null,
          fileUrl: null,
        };
      }
      if (typeof b === 'object' && b._id) {
        return {
          id: String(b._id),
          _id: b._id,
          title: b.title || 'Book',
          author: b.author || '',
          description: b.description || '',
          thumbnail: b.thumbnail,
          image: b.thumbnail,
          fileUrl: b.fileUrl,
        };
      }
      return null;
    })
    .filter(Boolean);
}

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
          const imagePath = course.thumbnail
            ? publicAssetUrl(
                course.thumbnail.startsWith('http') ? course.thumbnail : `${API_URL}${course.thumbnail}`
              )
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

          // Purchased ebooks: source of truth is the server (Paystack updates User.purchasedBooks).
          const fromServer = normalizePurchasedBooksFromUser(
            userResponse.data?.purchasedBooks
          );
          if (fromServer.length > 0) {
            setPurchasedBooks(fromServer);
            try {
              localStorage.setItem('purchasedBooks', JSON.stringify(fromServer));
            } catch {
              // ignore quota / private mode
            }
          } else {
            const localBooks = localStorage.getItem('purchasedBooks');
            if (localBooks) {
              try {
                setPurchasedBooks(JSON.parse(localBooks));
              } catch {
                setPurchasedBooks([]);
              }
            } else {
              setPurchasedBooks([]);
            }
          }
          
          // Fetch purchased courses from backend
          await refreshCourses();
          
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

  // Hydrate purchased books with missing fileUrl/thumbnail (older purchases/cart items).
  useEffect(() => {
    const missing = purchasedBooks
      .filter((b) => {
        if (!b) return false;
        const noFile = b.fileUrl == null || String(b.fileUrl).trim() === '';
        const noThumb = !(b.thumbnail || b.image);
        return noFile || noThumb;
      })
      .map((b) => String(b.id || b._id || ''))
      .filter(Boolean);
    const uniqueIds = Array.from(new Set(missing));
    if (!uniqueIds.length) return;

    let cancelled = false;
    const token = localStorage.getItem('authToken');
    Promise.all(
      uniqueIds.map((id) => {
        const url = token
          ? `${API_URL}/api/books/${id}/content`
          : `${API_URL}/api/books/${id}/preview`;
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        return axios
          .get(url, config)
          .then(({ data }) => ({ id, data }))
          .catch(() => null);
      })
    ).then((results) => {
      if (cancelled) return;
      const updates = results.filter(Boolean);
      if (!updates.length) return;

      setPurchasedBooks((prev) => {
        const next = prev.map((b) => {
          const bid = String(b?.id || b?._id || '');
          const hit = updates.find((u) => u.id === bid);
          if (!hit) return b;
          const d = hit.data || {};
          return {
            ...b,
            title: b.title || d.title,
            author: b.author || d.author,
            description: b.description || d.description,
            thumbnail: b.thumbnail || d.thumbnail,
            image: b.image || d.thumbnail || b.thumbnail,
            fileUrl: b.fileUrl || d.fileUrl,
          };
        });
        try {
          localStorage.setItem('purchasedBooks', JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [purchasedBooks]);

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
      <div className="fixed left-4 right-4 top-16 z-50 max-w-md rounded border-l-4 border-green-500 bg-green-100 p-4 text-green-700 shadow-md sm:left-auto sm:right-4 sm:top-24"
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
            stroke={`rgb(59, 130, 246)`} 
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
    return <Loader label="Loading your dashboard…" sublabel="Fetching your courses and account details." />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-16 md:pt-20">
      {/* Animation Styles */}
      <style>{animationStyles}</style>
      
      {/* Success Notification */}
      <SuccessNotification />
      
      {/* Hero: full width on mobile; sm+ inset card. Top margin from md+ so the card clears the nav visually on desktop */}
      <div className="sm:mx-auto sm:max-w-7xl sm:px-6 md:mt-8 lg:mt-10 lg:px-8">
        <div className="relative mb-4 overflow-hidden rounded-none bg-white ring-0 sm:mb-8 sm:rounded-3xl sm:ring-1 sm:ring-slate-200/80">
          {/* Background — white */}
          <div className="absolute inset-0 z-10 bg-white" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605792657660-596af9009e82?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.07]"></div>
          {/* Soft highlights */}
          <div className="pointer-events-none absolute -right-16 -top-24 z-[11] h-48 w-48 rounded-full bg-[#1B5EF5]/10 blur-3xl sm:-right-8 sm:top-0" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 z-[11] h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" />
          
          {/* Content — keep readable insets inside the full-bleed card */}
          <div className="relative z-20 px-4 py-4 sm:p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="flex gap-3 sm:items-center sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 shadow-sm ring-1 ring-slate-200 sm:h-14 sm:w-14 sm:rounded-full">
                  <FiUser className="h-6 w-6 text-[#1B5EF5] sm:h-7 sm:w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">
                    Your dashboard
                  </p>
                  <h1 className="text-xl font-bold leading-snug tracking-tight text-slate-950 sm:text-2xl md:text-3xl">
                    Welcome, {user?.fullName || 'Member'}!
                  </h1>
                  <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                    Your Quick X membership unlocks courses, books, and learning tools—study at your own pace, on any device.
                  </p>
                </div>
              </div>
              
              <div className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row sm:gap-2.5 md:mt-0 md:w-auto md:shrink-0">
                <Link
                  to="/courses"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B5EF5] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1552D6] sm:flex-1 sm:px-4 md:flex-initial"
                >
                  <FiBook className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  Browse courses
                </Link>
              </div>
            </div>
            
            {/* Stats — 2-up on mobile, full row on md+ */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 md:mt-6 md:grid-cols-3">
              <div className="flex min-h-[76px] items-center gap-2.5 rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-200/80 transition hover:bg-slate-100/60 sm:min-h-[80px] sm:p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 sm:h-11 sm:w-11 sm:rounded-full">
                  <FiTrendingUp className="h-4 w-4 text-[#1B5EF5] sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">Completed</p>
                  <p className="truncate text-sm font-bold text-slate-950 sm:text-base">
                    {purchasedCourses.filter(course => course.progress === 100).length}{' '}
                    <span className="font-semibold text-slate-700">courses</span>
                  </p>
                </div>
              </div>
              
              <div className="flex min-h-[76px] items-center gap-2.5 rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-200/80 transition hover:bg-slate-100/60 sm:min-h-[80px] sm:p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 sm:h-11 sm:w-11 sm:rounded-full">
                  <FiClock className="h-4 w-4 text-[#1B5EF5] sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">Learning time</p>
                  <p className="truncate text-sm font-bold text-slate-950 sm:text-base">
                    {purchasedCourses.length > 0 ? '3.5 hrs' : '0 hrs'}
                  </p>
                </div>
              </div>
              
              <div className="col-span-2 flex min-h-[76px] flex-col gap-2.5 rounded-2xl bg-slate-50 p-2.5 ring-1 ring-slate-200/80 transition hover:bg-slate-100/60 sm:flex-row sm:items-center sm:justify-between sm:min-h-[80px] sm:p-3 md:col-span-1">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 sm:h-11 sm:w-11 sm:rounded-full">
                    <FiDollarSign className="h-4 w-4 text-[#1B5EF5] sm:h-5 sm:w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">Referral earnings</p>
                    <p className="text-sm font-bold text-slate-950 sm:text-base">
                      GH₵{user?.referralEarnings ? user.referralEarnings.toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  disabled={!user?.referralEarnings || user?.referralEarnings < 20}
                  className={`w-full shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:w-auto ${
                    !user?.referralEarnings || user?.referralEarnings < 20
                      ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                      : 'bg-[#1B5EF5] text-white shadow-sm hover:bg-[#1552D6]'
                  }`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            {/* Referral code — stacks on narrow screens */}
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80 sm:mt-3.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-950 sm:text-base">Your referral code</h3>
                  <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                    Share with friends—you earn 10% commission on their purchases.
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:justify-end sm:gap-2">
                  <div className="min-w-0 flex-1 rounded-xl bg-white px-2.5 py-2 ring-1 ring-slate-200 sm:flex-initial sm:px-3">
                    <span className="block truncate text-center font-mono text-sm font-semibold tracking-wide text-slate-900 sm:text-base">
                      {user?.referralCode || 'Loading...'}
                    </span>
                  </div>
                  {user?.referralCode && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(user.referralCode);
                        alert('Referral code copied to clipboard!');
                      }}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-2.5 ring-1 ring-slate-200 transition hover:bg-slate-50"
                      aria-label="Copy referral code"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1B5EF5]" viewBox="0 0 20 20" fill="currentColor">
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
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6 sm:pb-10 sm:pt-6 md:py-10 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          {/* Sidebar — below main content on mobile */}
          <div className="order-2 md:order-1 md:w-1/4">
            <div className="overflow-hidden rounded-2xl border border-gray-100/80 bg-white">
              <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100/80 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-800 text-sm font-bold text-white shadow-md ring-1 ring-white/10">
                    {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('') : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{user?.fullName || 'User'}</div>
                    <div className="truncate text-xs text-gray-500">{user?.email}</div>
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

          {/* Content Area — first on mobile for quicker access to dashboard */}
          <div className="order-1 md:order-2 md:w-3/4">
            {activeTab === 'dashboard' && (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Modernized Progress Card — compact on small phones; sm+ matches previous desktop sizing */}
                <div className="group relative">
                  <div className="absolute inset-0 -z-10 rounded-2xl bg-[#1B5EF5]/[0.07] sm:rounded-3xl"></div>
                  <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 sm:rounded-3xl sm:p-6">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-500/[0.06] blur-2xl sm:h-24 sm:w-24 sm:-mt-6 sm:-mr-6"></div>
                    <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-blue-500/[0.05] blur-2xl sm:h-24 sm:w-24"></div>
                    
                    <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-700 sm:mb-3 sm:gap-2 sm:px-2.5 sm:py-1 sm:text-xs">
                          <FiTrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>Learning stats</span>
                        </div>
                        <h2 className="mb-1.5 text-lg font-bold tracking-tight text-gray-900 sm:mb-2 sm:text-2xl">Overall progress</h2>
                        <p className="max-w-sm text-xs leading-relaxed text-gray-500 sm:text-sm">
                          {purchasedCourses.length > 0 
                            ? "You're making steady progress—keep the momentum going." 
                            : "Start with any course in the catalog and your progress will show up here."}
                        </p>
                      </div>
                      
                      <div className="flex flex-row items-center justify-center gap-4 sm:gap-8 md:justify-end">
                        <div className="relative origin-center scale-[0.85] sm:scale-95">
                          <div className="pointer-events-none absolute inset-2 rounded-full bg-blue-600/[0.06] blur-md"></div>
                          <CircularProgress 
                            progress={
                              purchasedCourses.length > 0 
                                ? Math.floor(purchasedCourses.reduce((sum, course) => sum + course.progress, 0) / purchasedCourses.length) 
                                : 0
                            } 
                            size={100} 
                            strokeWidth={7}
                          />
                        </div>
                        <div className="hidden h-16 w-px bg-gray-100 md:block"></div>
                        <div className="flex min-w-0 flex-col text-center md:text-left">
                          <span className="mb-0.5 text-[9px] font-medium uppercase tracking-widest text-gray-400 sm:text-xs">Status</span>
                          <span className="text-xl font-extrabold tracking-tighter text-gray-900 sm:text-3xl">
                            {purchasedCourses.filter(course => course.progress === 100).length}
                          </span>
                          <span className="text-[11px] font-semibold text-blue-600">
                            of {purchasedCourses.length} courses done
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 px-0 pt-1 sm:flex-row sm:items-center sm:justify-between sm:px-2 sm:pt-4">
                  <h3 className="flex items-center text-sm font-bold tracking-tight text-gray-900 sm:text-lg">
                    <FiClock className="mr-2 h-3.5 w-3.5 shrink-0 text-blue-600 sm:mr-3 sm:h-4 sm:w-4" />
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
                          className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-blue-800/5 transition-all duration-500 transform hover:-translate-y-1"
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
                                  <Link to={`/school/course/${course.id}`} className="font-bold text-lg text-gray-900 hover:text-blue-600 transition-colors tracking-tight line-clamp-1">
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
                                    className="h-full bg-blue-700 rounded-full transition-all duration-1000"
                                    style={{ width: `${course.progress}%` }}
                                  ></div>
                                </div>
                                <Link
                                  to={`/school/course/${course.id}`}
                                  className="shrink-0 inline-flex items-center justify-center px-5 py-2 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-all duration-300 group/btn shadow-sm"
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
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">My Books</h2>
                    <p className="mt-1 text-sm text-slate-500">Your purchased ebooks, ready to download anytime.</p>
                  </div>
                  <Link
                    to="/store"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FiBookOpen />
                    Browse store
                  </Link>
                </div>
                
                {purchasedBooks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {purchasedBooks.map((book) => (
                      <div
                        key={String(book.id || book._id || book.title)}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                          <img
                            src={(() => {
                              const raw = book?.thumbnail || book?.image;
                              if (!raw) return '';
                              const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
                              if (!s) return '';
                              if (s.startsWith('http')) return publicAssetUrl(s);
                              if (s.startsWith('/')) return publicAssetUrl(`${API_URL}${s}`);
                              return publicAssetUrl(s);
                            })()}
                            alt={book.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <p className="line-clamp-2 text-sm font-semibold text-white">{book.title}</p>
                            <p className="mt-0.5 text-xs text-white/80">{book.author ? `by ${book.author}` : ''}</p>
                          </div>
                        </div>

                        <div className="p-4">
                          <p className="line-clamp-2 text-sm text-slate-600">{book.description || '—'}</p>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              <FiBookOpen />
                              Ebook
                            </span>
                            <div className="flex items-center gap-2">
                              <a
                                href={(() => {
                                  const raw = book?.fileUrl;
                                  if (!raw) return '';
                                  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
                                  if (!s) return '';
                                  if (s.startsWith('http')) return publicAssetUrl(s);
                                  if (s.startsWith('/')) return publicAssetUrl(`${API_URL}${s}`);
                                  return publicAssetUrl(s);
                                })()}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                View
                              </a>
                              <a
                                href={(() => {
                                  const raw = book?.fileUrl;
                                  if (!raw) return '';
                                  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
                                  if (!s) return '';
                                  if (s.startsWith('http')) return publicAssetUrl(s);
                                  if (s.startsWith('/')) return publicAssetUrl(`${API_URL}${s}`);
                                  return publicAssetUrl(s);
                                })()}
                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                download
                              >
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                      <div className="mx-auto flex max-w-xs flex-col items-center text-center">
                        <div className="mb-3 rounded-full bg-blue-100 p-3 text-blue-700">
                        <FiBookOpen size={24} />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">Discover more books</h3>
                        <p className="mt-1 text-sm text-slate-500">Expand your knowledge with premium ebooks.</p>
                        <Link
                          to="/store"
                          className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Browse Books
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <div className="mx-auto mb-4 inline-flex rounded-full bg-blue-100 p-3 text-blue-700">
                      <FiBookOpen size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No books yet</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                      When you buy ebooks from the store, they’ll show up here.
                    </p>
                    <Link
                      to="/store"
                      className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
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