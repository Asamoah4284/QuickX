import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { FiCheck, FiLock, FiPlay, FiClock, FiDownload, FiStar, FiUsers, FiCalendar, FiBarChart2, FiBook } from 'react-icons/fi';
import axios from 'axios';
import { savePendingCheckout } from '../../utils/pendingCheckout';

const API_URL = import.meta.env.VITE_API_URL;

function Pricing() {
  const [selectedModule, setSelectedModule] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBundle, setShowBundle] = useState(false);
  const [currentSectionPage, setCurrentSectionPage] = useState(0);
  const [customerEmail, setCustomerEmail] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBundlePaymentModal, setShowBundlePaymentModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const SECTIONS_PER_PAGE = 1;
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const level = searchParams.get('level');
  const courseId = searchParams.get('id');

  const LESSONS_PER_PAGE = 5;
  // Paystack public key - replace with your actual public key
  const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  const [currentModulePage, setCurrentModulePage] = useState(0);
  const MODULES_PER_PAGE = 1;

  // Updated mock course data with sections
  useEffect(() => {
    const fetchCourseData = async () => {
      setIsLoading(true);
      console.log('Fetching course data. Course ID:', courseId, 'Level:', level);
      
      try {
        // If we have a courseId, attempt to fetch from API
        if (courseId) {
          try {
            console.log(`Making API request to: ${API_URL}/api/courses/${courseId}/preview`);
            const response = await axios.get(`${API_URL}/api/courses/${courseId}/preview`);
            
            if (response.data) {
              const course = response.data;
              
              // Log the full course object from the API
              console.log('Single course API response:', course);
              console.log('Course thumbnail:', course.thumbnail);
              
              // Format the API response to match our expected structure
              const formattedCourse = {
                id: course._id || courseId,
                title: course.title || 'Forex Trading Course',
                subtitle: course.shortDescription || 'Master the basics of forex trading and build a solid foundation',
                instructor: course.instructor?.fullName || course.instructorName || 'Quick X Instructor',
                instructorTitle: course.instructor?.title || 'Professional Forex Trader & Analyst',
                rating: course.rating || '',
                reviewCount: course.reviewCount || '',
                studentCount: course.totalStudents || '',
                lastUpdated: course.updatedAt ? new Date(course.updatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'June 2023',
                description: course.description || course.longDescription || `This comprehensive course will take you from beginner to intermediate level in forex trading.`,
                image: course.thumbnail ? 
                      (course.thumbnail.startsWith('http') ? course.thumbnail : `${API_URL}${course.thumbnail}`) 
                      : 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=700&q=80',
                price: course.price || 199,
                level: course.level || 'Beginner to Advanced',
                duration: course.duration || '12 weeks',
                modules: [
                  {
                    id: course._id || courseId,
                    title: course.title || 'Forex Trading Module',
                    description: course.shortDescription || 'Learn the fundamentals of forex trading',
                    price: course.price || 300,
                    unlocked: false,
                    level: course.level?.toLowerCase() || level || 'beginner',
                    sections: course.modules?.map((module, moduleIndex) => ({
                      id: `section-${moduleIndex + 1}`,
                      title: module.title || `Section ${moduleIndex + 1}`,
                      lessons: module.sections?.flatMap((section, sectionIndex) => 
                        section.lessons?.map((lesson, lessonIndex) => ({
                          id: lesson._id || `lesson-${moduleIndex + 1}-${sectionIndex + 1}-${lessonIndex + 1}`,
                          title: lesson.title || `Lesson ${lessonIndex + 1}`,
                          duration: lesson.duration || '30 min',
                          type: lesson.type || 'video',
                          free: lesson.isFree || (lessonIndex === 0 && sectionIndex === 0) // Make first lesson free
                        })) || []
                      ) || []
                    })) || [
                      // Default section if no modules are present
                      {
                        id: 'section-1',
                        title: 'Introduction to Forex Trading',
                        lessons: [
                          {
                            id: 'lesson-1-1',
                            title: 'Getting Started with Forex',
                            duration: '25 min',
                            type: 'video',
                            free: true
                          },
                          {
                            id: 'lesson-1-2',
                            title: 'Understanding Currency Pairs',
                            duration: '20 min',
                            type: 'video',
                            free: false
                          }
                        ]
                      }
                    ]
                  }
                ],
                requirements: course.requirements || [
                  'No prior trading experience required',
                  'Basic understanding of financial markets is helpful but not necessary',
                  'A computer with internet access',
                  'Willingness to practice what you learn'
                ],
                targetAudience: course.targetAudience || [
                  'Complete beginners to forex trading',
                  'Stock traders looking to diversify into forex',
                  'Casual traders wanting to improve their skills',
                  'Anyone interested in creating a trading income stream'
                ]
              };
              
              // Use the formatted course data
              setCourseData(formattedCourse);
              setSelectedModule(formattedCourse.modules[0]);
              setIsLoading(false);
              return;
            } else {
              throw new Error('Course data not found');
            }
          } catch (error) {
            console.error('Error fetching specific course:', error);
            
            if (error.response && error.response.status === 404) {
              setErrorMessage('The course you\'re looking for could not be found. Please check the course ID or browse our available courses.');
              setIsLoading(false);
              return;
            } else {
              console.log('Falling back to mock data due to API error');
              // Continue to mock data below
            }
          }
        }
        
        // Fall back to mock data or filtered mock data based on level
        setTimeout(() => {
          const data = {
            id: 'forex-101',
            title: 'Forex Trading Fundamentals',
            subtitle: 'Master the basics of forex trading and build a solid foundation for your trading career',
            instructor: 'John Smith',
            instructorTitle: 'Professional Forex Trader & Analyst',
            rating: 4.8,
            reviewCount: 427,
            studentCount: 3842,
            lastUpdated: 'June 2023',
            description: `This comprehensive course will take you from beginner to intermediate level in forex trading. 
            You'll learn everything from the basics of currency pairs to developing and implementing effective trading strategies. 
            The course includes practical examples, case studies, and hands-on exercises to reinforce your learning.`,
            image: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=700&q=80',
            price: 199,
            level: 'Beginner to Advanced',
            duration: '12 weeks',
            modules: [
              {
                id: 'module-1',
                title: 'Introduction to Forex Trading',
                description: 'Learn the fundamentals of the forex market and how it works',
                price: 300,
                unlocked: false,
                level: 'beginner',
                sections: [
                  {
                    id: 'section-1',
                    title: 'What to Know Before you Kickstart',
                    lessons: [
                      {
                        id: 'lesson-1-1',
                        title: 'Opportunities in Forex',
                        duration: '25 min',
                        type: 'video',
                        free: true
                      },
                      {
                        id: 'lesson-1-2',
                        title: 'Why Forex Trading',
                        duration: '20 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-3',
                        title: 'What You need To Kickstart',
                        duration: '20 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-4',
                        title: 'What You Must Know To stay Long in the Game',
                        duration: '20 min',
                        type: 'video',
                        free: false
                      },
                    ]
                  },
                  {
                    id: 'section-2',
                    title: 'Understanding the Basics',
                    lessons: [
                      {
                        id: 'lesson-1-5',
                        title: 'What is Forex',
                        duration: '30 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-6',
                        title: 'Trading Sessions and Time Zones',
                        duration: '22 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-7',
                        title: 'Introduction to Buy and Sell',
                        duration: '22 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-8',
                        title: 'Understanding Currency pairs',
                        duration: '22 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-3',
                    title: 'Essential Terminologies',
                    lessons: [
                      {
                        id: 'lesson-1-9',
                        title: 'Pips',
                        duration: '28 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-10',
                        title: 'Lot & Leverage',
                        duration: '28 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-11',
                        title: 'Order',
                        duration: '28 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-12',
                        title: 'Margin, Equity, Margin call',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-13',
                        title: 'Profit and Loss, Realized and Unrealized profit and Loss',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                    ]
                  },
                  {
                    id: 'section-4',
                    title: 'Understanding the Basics',
                    lessons: [
                      {
                        id: 'lesson-1-14',
                        title: 'Who is a Forex Trader?',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-15',
                        title: 'Psycology of Trading',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-1-16',
                        title: 'Types of Markrt Analysis',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  }
                ]
              },
              {
                id: 'module-2',
                title: 'Technical Analysis Basics',
                description: 'Master the essential technical analysis tools and indicators',
                price: 350,
                unlocked: false,
                level: 'intermediate',
                sections: [
                  {
                    id: 'section-1',
                    title: 'Building the foundation',
                    lessons: [
                      {
                        id: 'lesson-2-1',
                        title: 'Introduction to Technical Analysis',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-2',
                        title: 'Types of Technical Analysis',
                        duration: '40 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-3',
                        title: 'Fundamental Analysis',
                        duration: '40 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-2',
                    title: 'Understanding Price Actions',
                    lessons: [
                      {
                        id: 'lesson-2-3',
                        title: 'What is Candlestick',
                        duration: '38 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-4',
                        title: 'Forms of Candlestick',
                        duration: '45 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-5',
                        title: 'Reversal Candlestick and Continuation Candlestick',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-3',
                    title: 'Understanding Chart Patterns',
                    lessons: [
                      {
                        id: 'lesson-2-6',
                        title: 'What is Chart Patterns',
                        duration: '50 min',
                        type: 'workshop',
                        free: false
                      },
                      {
                        id: 'lesson-2-7',
                        title: 'Types of Chart Patterns',
                        duration: '20 min',
                        type: 'quiz',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-4',
                    title: 'Understanding Market Structure',
                    lessons: [
                      {
                        id: 'lesson-2-8',
                        title: 'Trends',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-9',
                        title: 'How to Identify a trend and draw a trend line',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-10',
                        title: 'support and resistance',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-5',
                    title: 'Understanding Zones in the Market',
                    lessons: [
                      {
                        id: 'lesson-2-11',
                        title: 'Supply and demand',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-12',
                        title: 'How to Identify Supply and Demand Zone',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-13',
                        title: 'Order Blocks',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-14',
                        title: 'Liquidity Pool',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-6',
                    title: 'Understanding Some Indicators',
                    lessons: [
                      {
                        id: 'lesson-2-15',
                        title: 'Fibonacci Retracement',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-16',
                        title: 'Moving Average',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-2-17',
                        title: 'Stochastic',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  }
                ]
              },
              {
                id: 'module-3',
                title: 'Advanced Trading Strategies',
                description: 'Learn advanced trading techniques and risk management',
                price: 500,
                unlocked: false,
                level: 'advanced',
                sections: [
                  {
                    id: 'section-1',
                    title: 'Understanding Top-down Analysis',
                    lessons: [
                      {
                        id: 'lesson-3-1',
                        title: 'The Power of Multi-Timeframe Analysis',
                        duration: '45 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-3-2',
                        title: 'Mastering Market Structure & Strategey Development',
                        duration: '50 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-3-3',
                        title: 'The Three Main Market Structures',
                        duration: '45 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-3-4',
                        title: 'Liquidity Pool AN imbalances',
                        duration: '45 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-3-5',
                        title: 'Trends, Ranges and Reversals',
                        duration: '45 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-3-6',
                        title: 'Liquidity Zone & Order Flow',
                        duration: '45 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-2',
                    title: 'Triple X Strategy: A New Approach to Winning Trade',
                    lessons: [
                      {
                        id: 'lesson-3-7',
                        title: 'Introduction to Triple X Strategy',
                        duration: '40 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-3-8',
                        title: 'The core Principle of the Triple X Strategy',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-3-9',
                        title: 'Why this Strategy Works in any Market Condition',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      },
                      {
                        id: 'lesson-3-10',
                        title: 'How to Systematically Analyze the Strategy',
                        duration: '35 min',
                        type: 'video',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-3',
                    title: 'X Hack Up & X Hack Down',
                    lessons: [
                      {
                        id: 'lesson-3-11',
                        title: 'X Hack Down - Catching the Top before the Drop',
                        duration: '60 min',
                        type: 'workshop',
                        free: false
                      },
                      {
                        id: 'lesson-3-12',
                        title: 'X Hack Down - Catching the Bottom before the Boom',
                        duration: '60 min',
                        type: 'workshop',
                        free: false 
                      },
                      {
                        id: 'lesson-3-13',
                        title: 'FTR Entry - Failure to Return Entry',
                        duration: '60 min',
                        type: 'workshop',
                        free: false
                      },
                      {
                        id: 'lesson-3-14',
                        title: 'FTb Entry - First Time Back Entry',
                        duration: '60 min',
                        type: 'workshop',
                        free: false
                      },
                      {
                        id: 'lesson-3-15',
                        title: 'Break & Close Entry',
                        duration: '60 min',
                        type: 'workshop',
                        free: false
                      }
                    ]
                  },
                  {
                    id: 'section-4',
                    title: 'X Hack Up & X Hack Down',
                    lessons: [
                      {
                        id: 'lesson-3-16',  
                        title: 'X Hack Up - Catching the Top before the Drop',
                        duration: '60 min',
                        type: 'workshop',
                        free: false
                      },
                      {
                        id: 'lesson-3-17',  
                        title: 'X Hack Down - Catching the Bottom before the Boom',
                        duration: '60 min',
                        type: 'workshop',
                        free: false
                      }
                    ]
                  }
                ]
              }
            ],
            requirements: [
              'No prior trading experience required',
              'Basic understanding of financial markets is helpful but not necessary',
              'A computer with internet access',
              'Willingness to practice what you learn'
            ],
            targetAudience: [
              'Complete beginners to forex trading',
              'Stock traders looking to diversify into forex',
              'Casual traders wanting to improve their skills',
              'Anyone interested in creating a trading income stream'
            ]
          };

          // Filter modules based on the selected level
          const filteredModules = level 
            ? data.modules.filter(module => module.level === level.toLowerCase())
            : data.modules;

          setCourseData({ ...data, modules: filteredModules });
          setSelectedModule(filteredModules[0]);
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error('Error fetching course data:', error);
        setErrorMessage('There was a problem loading the course data. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [level, courseId]);

  // Check if user is authenticated
  useEffect(() => {
    // For this example, we'll check if there's a token in localStorage
    // You should replace this with your actual authentication checking logic
    const token = localStorage.getItem('auth_token');
    const authToken = localStorage.getItem('authToken');
    setIsAuthenticated(!!(token || authToken));
    
    // If user is authenticated, fetch user data to check already purchased courses
    if (token || authToken) {
      const fetchUserData = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token || authToken}` }
          });
          
          console.log('User data:', response.data);
          
          // If user data has purchasedCourses, we can use this to update UI
          if (response.data && response.data.purchasedCourses && response.data.purchasedCourses.length > 0) {
            // Update unlocked status for modules in the UI
            if (courseData) {
              const updatedModules = courseData.modules.map(module => {
                let moduleId = module.id;
                if (module.id.startsWith('module-')) {
                  moduleId = module.id.replace('module-', '');
                }
                
                // Check if this module is in the user's purchased courses
                const isPurchased = response.data.purchasedCourses.some(
                  course => course === moduleId || (course._id && course._id === moduleId)
                );
                
                if (isPurchased) {
                  return { ...module, unlocked: true };
                }
                return module;
              });
              
              setCourseData({ ...courseData, modules: updatedModules });
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
    }
  }, [courseData]);

  // Payment handling functions
  const handlePaymentClose = useCallback(() => {
    setShowPaymentModal(false);
    setCustomerEmail('');
    setIsProcessingPayment(false);
  }, []);

  const handleBundlePaymentClose = useCallback(() => {
    setShowBundlePaymentModal(false);
    setCustomerEmail('');
    setIsProcessingPayment(false);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    setIsProcessingPayment(false);
    setShowPaymentModal(false);
    setCustomerEmail('');
  }, []);

  const handleBundlePaymentSuccess = useCallback(() => {
    setIsProcessingPayment(false);
    setShowBundlePaymentModal(false);
    setCustomerEmail('');
  }, []);

  const goToCheckoutOrRegister = (checkoutState) => {
    if (!isAuthenticated) {
      savePendingCheckout(checkoutState);
      navigate('/register', {
        state: { from: '/checkout', checkout: checkoutState },
      });
      return;
    }
    navigate('/checkout', { state: checkoutState });
  };

  // Handle module purchase
  const handlePurchaseModule = (moduleId) => {
    // Find selected module data
    const moduleToPurchase = courseData.modules.find(module => module.id === moduleId);
    
    if (!moduleToPurchase) {
      console.error(`Module not found: ${moduleId}`);
      return;
    }
    
    goToCheckoutOrRegister({
      item: {
        id: moduleToPurchase.id,
        title: moduleToPurchase.title,
        price: moduleToPurchase.price,
        type: 'course',
        image: courseData.image
      },
      returnPath: `/school/course/${moduleId}`,
      returnTabState: { tab: 'content' }
    });
  };

  // Handle bundle purchase
  const handleBundlePurchase = () => {
    goToCheckoutOrRegister({
      item: {
        id: 'bundle',
        title: 'Complete Forex Trading Bundle',
        price: bundlePrice,
        type: 'course',
        image: courseData.image,
        description: 'Get access to all three levels of forex trading education'
      },
      returnPath: '/school',
      returnTabState: null
    });
  };

  // Get total course duration
  const getTotalDuration = () => {
    if (!courseData) return '';
    
    let minutes = 0;
    courseData.modules.forEach(module => {
      module.sections.forEach(section => {
        section.lessons.forEach(lesson => {
        minutes += parseInt(lesson.duration.split(' ')[0]);
        });
      });
    });
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  };

  // Get total lessons count
  const getTotalLessons = () => {
    if (!courseData) return 0;
    let count = 0;
    courseData.modules.forEach(module => {
      module.sections.forEach(section => {
        count += section.lessons.length;
      });
    });
    return count;
  };

  // Get module duration
  const getModuleDuration = (module) => {
    if (!module?.sections) return '0 min';
    
    let minutes = 0;
    module.sections.forEach(section => {
      section.lessons.forEach(lesson => {
      minutes += parseInt(lesson.duration.split(' ')[0]);
      });
    });
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes} min`;
  };

  // Get number of free books in a module
  const getFreeBooksCount = (module) => {
    if (!module?.sections) return 0;
    
    let count = 0;
    module.sections.forEach(section => {
      count += section.lessons.filter(lesson => lesson.type === 'ebook' && lesson.free).length;
    });
    return count;
  };

  // Calculate total price for all courses
  const totalPrice = courseData?.modules.reduce((sum, module) => sum + module.price, 0) || 0;
  const bundlePrice = 950; // Discounted price for all courses

  // Get paginated sections
  const getPaginatedSections = (sections) => {
    if (!sections) return [];
    const startIndex = currentSectionPage * SECTIONS_PER_PAGE;
    return sections.slice(startIndex, startIndex + SECTIONS_PER_PAGE);
  };

  // Calculate total section pages
  const totalSectionPages = selectedModule ? Math.ceil(selectedModule.sections.length / SECTIONS_PER_PAGE) : 0;

  // Get current section number
  const getCurrentSectionNumber = (moduleIndex, sectionIndex) => {
    if (!courseData?.modules) return 0;
    let sectionCount = 0;
    for (let i = 0; i < moduleIndex; i++) {
      sectionCount += courseData.modules[i].sections.length;
    }
    return sectionCount + sectionIndex + 1;
  };

  // Get total sections
  const getTotalSections = () => {
    if (!courseData?.modules) return 0;
    return courseData.modules.reduce((total, module) => total + module.sections.length, 0);
  };

  // Add a function to check authentication and redirect if needed
  const checkAuthAndProceed = (action) => {
    if (!isAuthenticated) {
      navigate('/register', { state: { from: location.pathname + location.search } });
      return;
    }
    
    // If authenticated, proceed with the specified action
    action();
  };

  // Add this function after the existing getTotalSections function
  const getTotalModulePages = () => {
    if (!courseData?.modules) return 0;
    return Math.ceil(courseData.modules.length / MODULES_PER_PAGE);
  };

  // Add this function to get paginated modules
  const getPaginatedModules = () => {
    if (!courseData?.modules) return [];
    const startIndex = currentModulePage * MODULES_PER_PAGE;
    return courseData.modules.slice(startIndex, startIndex + MODULES_PER_PAGE);
  };

  // Update the useEffect that sets the selected module
  useEffect(() => {
    if (courseData?.modules) {
      const paginatedModules = getPaginatedModules();
      if (paginatedModules.length > 0) {
        setSelectedModule(paginatedModules[0]);
      }
    }
  }, [courseData, currentModulePage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-28 px-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-28 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Course Not Found</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <Link 
            to="/school"
            className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse All Courses
          </Link>
        </div>
      </div>
    );
  }

  const displayHeroTitle =
    courseData?.title ||
    (level
      ? `${level.charAt(0).toUpperCase() + level.slice(1)} Level Forex Trading`
      : 'Complete Forex Trading Mastery');
  const displayHeroSubtitle = level
    ? courseData?.subtitle
    : 'Get access to all three levels of forex trading education';
  const studentDisplay =
    courseData?.studentCount !== '' && courseData?.studentCount != null
      ? Number(courseData.studentCount).toLocaleString()
      : null;
  const ratingDisplay =
    courseData?.rating !== '' && courseData?.rating != null ? String(courseData.rating) : null;
  const reviewDisplay =
    courseData?.reviewCount !== '' && courseData?.reviewCount != null
      ? String(courseData.reviewCount)
      : null;
  const displayPrice = level ? Number(courseData?.modules?.[0]?.price || 0) : Number(bundlePrice || 0);
  const originalPrice = !level && totalPrice > bundlePrice ? totalPrice : null;
  const moduleCount = courseData?.modules?.length || 0;
  const totalSections = getTotalSections();
  const previewLessonCount =
    courseData?.modules?.reduce(
      (count, module) =>
        count +
        (module.sections || []).reduce(
          (sectionCount, section) =>
            sectionCount + (section.lessons || []).filter((lesson) => lesson.free).length,
          0
        ),
      0
    ) || 0;
  const downloadableResourceCount =
    courseData?.modules?.reduce(
      (count, module) =>
        count +
        (module.sections || []).reduce(
          (sectionCount, section) =>
            sectionCount +
            (section.lessons || []).filter((lesson) => ['ebook', 'pdf'].includes(lesson.type)).length,
          0
        ),
      0
    ) || 0;
  const firstPreviewLesson =
    courseData?.modules
      ?.flatMap((module) =>
        (module.sections || []).flatMap((section) =>
          (section.lessons || []).map((lesson) => ({
            moduleId: module.id,
            lessonId: lesson.id,
            free: lesson.free,
          }))
        )
      )
      .find((lesson) => lesson.free) || null;
  const includes = [
    {
      icon: FiPlay,
      label: `${getTotalLessons()} on-demand ${getTotalLessons() === 1 ? 'lesson' : 'lessons'}`,
    },
    {
      icon: FiClock,
      label: `${getTotalDuration()} total length`,
    },
    {
      icon: FiBarChart2,
      label: `${courseData?.level || 'All levels'} level`,
    },
    {
      icon: downloadableResourceCount > 0 ? FiDownload : FiBook,
      label:
        downloadableResourceCount > 0
          ? `${downloadableResourceCount} downloadable ${downloadableResourceCount === 1 ? 'resource' : 'resources'}`
          : `${moduleCount} structured ${moduleCount === 1 ? 'module' : 'modules'}`,
    },
  ];
  const handlePrimaryPurchase = () => {
    if (level) {
      handlePurchaseModule(courseData?.modules?.[0]?.id);
    } else {
      handleBundlePurchase();
    }
  };

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <section className="bg-[#1c1d1f] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="max-w-3xl">
              <p className="text-sm text-[#c0c4fc]">
                {courseData?.level || 'Course'} {courseData?.category ? ` / ${courseData.category}` : ''}
              </p>
              <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.8rem]">
                {displayHeroTitle}
              </h1>
              <p className="mt-4 text-lg leading-8 text-[#d1d7dc]">
                {displayHeroSubtitle || courseData?.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#d1d7dc]">
                {ratingDisplay !== null ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FiStar className="h-4 w-4 text-[#f69c08]" aria-hidden />
                    <span className="font-semibold text-[#f69c08]">{ratingDisplay}</span>
                    {reviewDisplay !== null ? <span>({reviewDisplay} reviews)</span> : null}
                  </span>
                ) : null}
                {studentDisplay !== null ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FiUsers className="h-4 w-4" aria-hidden />
                    {studentDisplay} students
                  </span>
                ) : null}
                {courseData?.lastUpdated ? (
                  <span className="inline-flex items-center gap-1.5">
                    <FiCalendar className="h-4 w-4" aria-hidden />
                    Last updated {courseData.lastUpdated}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

        {/* Bundle Purchase Modal */}
        {showBundle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">Complete Forex Trading Bundle</h2>
              <p className="text-gray-600 mb-6">
                Get access to all three levels of forex trading education at a discounted price.
              </p>
              
              <div className="space-y-4 mb-6">
                {courseData?.modules.map(module => (
                  <div key={module.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium">{module.title}</h3>
                      <p className="text-sm text-gray-600">{module.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">GHS{module.price}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-2xl font-bold">GHS{bundlePrice}</div>
                  <div className="text-gray-500 line-through">GHS{totalPrice}</div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 font-medium">Save 17%</div>
                  <div className="text-sm text-gray-500">One-time payment</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 rounded-lg transition-colors"
                  onClick={handleBundlePurchase}
                >
                  Purchase Bundle
                </button>
                <button 
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg transition-colors"
                  onClick={() => setShowBundle(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-10">
          <main className="space-y-6">
            <section className="rounded-2xl border border-[#d1d7dc] bg-white p-6">
              <h2 className="text-2xl font-bold text-[#1c1d1f]">What you’ll get from this course</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {(courseData?.targetAudience || []).slice(0, 6).map((item) => (
                  <div key={item} className="flex gap-3">
                    <FiCheck className="mt-1 h-4 w-4 shrink-0 text-[#5624d0]" aria-hidden />
                    <p className="text-sm leading-6 text-[#1c1d1f]">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#d1d7dc] bg-white p-6">
              <h2 className="text-2xl font-bold text-[#1c1d1f]">Course overview</h2>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-[#2d2f31]">
                {courseData?.description}
              </p>
            </section>

            {(courseData?.requirements || []).length > 0 ? (
              <section className="rounded-2xl border border-[#d1d7dc] bg-white p-6">
                <h2 className="text-2xl font-bold text-[#1c1d1f]">Requirements</h2>
                <ul className="mt-4 space-y-3">
                  {courseData.requirements.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-[#2d2f31]">
                      <FiCheck className="mt-1 h-4 w-4 shrink-0 text-[#5624d0]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-2xl border border-[#d1d7dc] bg-white p-6">
              <div className="flex flex-col gap-4 border-b border-[#d1d7dc] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#1c1d1f]">Course content</h2>
                  <p className="mt-2 text-sm text-[#6a6f73]">
                    {moduleCount} {moduleCount === 1 ? 'module' : 'modules'} • {totalSections}{' '}
                    {totalSections === 1 ? 'section' : 'sections'} • {getTotalLessons()} lessons •{' '}
                    {getTotalDuration()} total
                  </p>
                </div>
                {previewLessonCount > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-[#ecebff] px-3 py-1 text-xs font-semibold text-[#5624d0]">
                    {previewLessonCount} free preview {previewLessonCount === 1 ? 'lesson' : 'lessons'}
                  </span>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6a6f73]">
                  Curriculum
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentModulePage((prev) => Math.max(0, prev - 1))}
                    disabled={currentModulePage === 0}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      currentModulePage === 0
                        ? 'cursor-not-allowed border-[#e5e7eb] bg-[#f7f9fa] text-[#9aa0a6]'
                        : 'border-[#d1d7dc] bg-white text-[#1c1d1f] hover:bg-[#f7f9fa]'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <span className="rounded-full bg-[#f7f9fa] px-3 py-1.5 text-xs font-medium text-[#6a6f73]">
                    Module {currentModulePage + 1} of {getTotalModulePages()}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentModulePage((prev) => Math.min(getTotalModulePages() - 1, prev + 1))
                    }
                    disabled={currentModulePage === getTotalModulePages() - 1}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      currentModulePage === getTotalModulePages() - 1
                        ? 'cursor-not-allowed border-[#e5e7eb] bg-[#f7f9fa] text-[#9aa0a6]'
                        : 'border-[#d1d7dc] bg-white text-[#1c1d1f] hover:bg-[#f7f9fa]'
                    }`}
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {getPaginatedModules().map((module, moduleOffset) => {
                  const absoluteModuleIndex = currentModulePage * MODULES_PER_PAGE + moduleOffset;

                  return (
                    <div key={module.id} className="overflow-hidden rounded-2xl border border-[#d1d7dc]">
                      <div className="border-b border-[#d1d7dc] bg-[#f7f9fa] px-5 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#6a6f73]">
                              Module {absoluteModuleIndex + 1}
                            </p>
                            <h3 className="mt-1 text-lg font-bold text-[#1c1d1f]">{module.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-[#6a6f73]">{module.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs font-medium text-[#6a6f73]">
                            <span className="rounded-full bg-white px-3 py-1.5">
                              {getModuleDuration(module)}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1.5">
                              {module.sections.length} {module.sections.length === 1 ? 'section' : 'sections'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-[#e5e7eb]">
                        {module.sections.map((section, sectionIndex) => (
                          <div key={section.id}>
                            <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-[#6a6f73]">
                                  Section {getCurrentSectionNumber(absoluteModuleIndex, sectionIndex)} of {totalSections}
                                </p>
                                <h4 className="mt-1 font-semibold text-[#1c1d1f]">{section.title}</h4>
                              </div>
                              <span className="text-sm text-[#6a6f73]">
                                {section.lessons.length} {section.lessons.length === 1 ? 'lesson' : 'lessons'}
                              </span>
                            </div>

                            <div className="border-t border-[#f1f2f4]">
                              {(section.lessons || []).map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex min-w-0 gap-3">
                                    <div className="mt-0.5 shrink-0 text-[#6a6f73]">
                                      {lesson.free || module.unlocked ? (
                                        lesson.type === 'ebook' ? (
                                          <FiBook className="h-4 w-4 text-[#5624d0]" aria-hidden />
                                        ) : (
                                          <FiPlay className="h-4 w-4 text-[#5624d0]" aria-hidden />
                                        )
                                      ) : (
                                        <FiLock className="h-4 w-4" aria-hidden />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-medium text-[#1c1d1f]">
                                          {lesson.title}
                                        </p>
                                        {lesson.free && !module.unlocked ? (
                                          <span className="rounded-full bg-[#ecebff] px-2 py-0.5 text-[11px] font-semibold text-[#5624d0]">
                                            Preview
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-1 text-xs text-[#6a6f73]">
                                        {lesson.duration} • <span className="capitalize">{lesson.type}</span>
                                      </p>
                                    </div>
                                  </div>
                                  {lesson.free || module.unlocked ? (
                                    <Link
                                      to={`/school/course/${module.id}?lesson=${lesson.id}`}
                                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5624d0] hover:text-[#401b9c]"
                                    >
                                      <FiDownload className="h-4 w-4" aria-hidden />
                                      Open lesson
                                    </Link>
                                  ) : (
                                    <span className="text-sm text-[#6a6f73]">Locked</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>

          <aside className="order-first lg:order-none lg:-mt-56">
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl border border-[#d1d7dc] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                {courseData?.image ? (
                  <div className="aspect-video overflow-hidden border-b border-[#d1d7dc] bg-[#f7f9fa]">
                    <img
                      src={courseData.image}
                      alt={displayHeroTitle}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="p-6">
                  <div className="flex items-end gap-2">
                    <p className="text-[2rem] font-bold leading-none text-[#1c1d1f]">
                      GHS{displayPrice}
                    </p>
                    {originalPrice ? (
                      <p className="pb-1 text-base text-[#6a6f73] line-through">GHS{originalPrice}</p>
                    ) : null}
                  </div>
                  {originalPrice ? (
                    <p className="mt-2 text-sm font-medium text-[#b32d0f]">
                      Save GHS{originalPrice - displayPrice} with the full bundle
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-[#6a6f73]">
                      One-time payment. Lifetime access to this course content.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handlePrimaryPurchase}
                    className="mt-5 w-full rounded-lg bg-[#a435f0] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#8710d8]"
                  >
                    {level ? 'Buy now' : 'Buy bundle'}
                  </button>

                  {firstPreviewLesson ? (
                    <Link
                      to={`/school/course/${firstPreviewLesson.moduleId}?lesson=${firstPreviewLesson.lessonId}`}
                      className="mt-3 flex w-full items-center justify-center rounded-lg border border-[#d1d7dc] px-4 py-3 text-sm font-semibold text-[#1c1d1f] transition hover:bg-[#f7f9fa]"
                    >
                      Preview this course
                    </Link>
                  ) : null}

                  <p className="mt-4 text-center text-xs text-[#6a6f73]">
                    30-Day Money-Back Guarantee
                  </p>

                  <div className="mt-6 border-t border-[#d1d7dc] pt-6">
                    <h3 className="text-lg font-bold text-[#1c1d1f]">This course includes:</h3>
                    <ul className="mt-4 space-y-3">
                      {includes.map(({ icon: Icon, label }) => (
                        <li key={label} className="flex items-start gap-3 text-sm text-[#2d2f31]">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#1c1d1f]" aria-hidden />
                          <span>{label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </aside>
      </div>
    </div>
  );
}

export default Pricing;
