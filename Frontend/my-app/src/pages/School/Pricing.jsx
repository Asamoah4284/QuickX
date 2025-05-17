import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { FiCheck, FiLock, FiPlay, FiClock, FiDownload, FiStar, FiShoppingCart, FiInfo, FiUsers, FiCalendar, FiAward, FiBarChart2, FiBook, FiFileText } from 'react-icons/fi';
import { PaystackButton } from 'react-paystack';
import axios from 'axios';

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
  const paystackPublicKey = "pk_test_00217b2a0545ad1be4b2f07e05bc1e73eba765b7";

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
                rating: course.rating || 4.8,
                reviewCount: course.reviewCount || 427,
                studentCount: course.totalStudents || 3842,
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

  // Handle module purchase
  const handlePurchaseModule = (moduleId) => {
    // Find selected module data
    const moduleToPurchase = courseData.modules.find(module => module.id === moduleId);
    
    if (!moduleToPurchase) {
      console.error(`Module not found: ${moduleId}`);
      return;
    }
    
    // Navigate to checkout with module data
    navigate('/checkout', {
      state: {
        item: {
          id: moduleToPurchase.id,
          title: moduleToPurchase.title,
          price: moduleToPurchase.price,
          type: 'course',
          image: courseData.image
        },
        returnPath: `/school/course/${moduleId}`,
        returnTabState: { tab: 'content' }
      }
    });
  };

  // Handle bundle purchase
  const handleBundlePurchase = () => {
    // Navigate to checkout with bundle data
    navigate('/checkout', {
      state: {
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
      }
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
      // Redirect to login page
      navigate('/login', { state: { from: location.pathname + location.search } });
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

  // Log the course data that will be rendered
  console.log('CourseData being rendered:', courseData);
  console.log('Selected module:', selectedModule);

  return (
    <div className="min-h-screen bg-gray-50 py-28 px-4 sm:px-6 lg:px-8">
      {/* Course Header */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-2xl overflow-hidden">
          <div className="p-8 sm:p-10 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                  {level ? `${level.charAt(0).toUpperCase() + level.slice(1)} Level Forex Trading` : 'Complete Forex Trading Mastery'}
                </h1>
                <p className="text-blue-100 text-lg mb-4">
                  {level ? courseData?.subtitle : 'Get access to all three levels of forex trading education'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center">
                    <FiUsers className="mr-1.5" />
                    <span>{courseData?.studentCount.toLocaleString()} students</span>
                  </div>
                  <div className="flex items-center">
                    <FiStar className="text-yellow-400 mr-1.5" />
                    <span>{courseData?.rating} ({courseData?.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center">
                    <FiCalendar className="mr-1.5" />
                    <span>Last updated {courseData?.lastUpdated}</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-5">
                <div className="text-center md:text-left">
                  <div className="text-lg opacity-80 mb-1">
                    {level ? `${level.charAt(0).toUpperCase() + level.slice(1)} Level` : 'Complete Bundle'}
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                    <span className="text-3xl font-bold">
                      ${level ? courseData?.modules[0]?.price : bundlePrice}
                    </span>
                    {!level && (
                      <>
                        <span className="text-blue-200 line-through">
                          GHS{totalPrice}
                        </span>
                        <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
                          SAVE 17%
                        </span>
                      </>
                    )}
                  </div>
                  <button 
                    className="block w-full bg-white text-blue-700 hover:bg-blue-50 font-medium py-2 rounded-lg transition-colors mt-4 text-sm text-center"
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { from: location.pathname + location.search } });
                        return;
                      }
                      
                      if (level) {
                        handlePurchaseModule(courseData?.modules[0]?.id);
                      } else {
                        handleBundlePurchase();
                      }
                    }}
                  >
                    {level ? 'Enroll Now' : 'Purchase Bundle'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  <div className="text-2xl font-bold">${bundlePrice}</div>
                  <div className="text-gray-500 line-through">${totalPrice}</div>
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

        <div className="bg-white rounded-b-2xl shadow-lg overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Left Section - Course Content & Overview */}
            <div className="lg:w-7/12 border-r border-gray-200">
              {/* Course Info Tabs */}
              <div className="border-b border-gray-200">
                <div className="px-6 pt-6 sm:px-8">
                  <div className="flex items-center text-sm">
                    <div className="bg-blue-100 text-blue-800 font-medium px-3 py-1 rounded-full mr-3">
                      {courseData.level}
                    </div>
                    <div className="flex items-center text-gray-500 mr-4">
                      <FiClock className="mr-1.5" />
                      {getTotalDuration()}
                    </div>
                    <div className="flex items-center text-gray-500">
                      <FiPlay className="mr-1.5" />
                      {getTotalLessons()} lessons
                    </div>
                  </div>
                </div>
                
                <div className="px-6 sm:px-8 pt-4 pb-0">
                  <div className="flex space-x-8 overflow-x-auto pb-4">
                    <button className="pb-3 px-1 border-b-2 border-blue-600 text-blue-600 font-medium whitespace-nowrap">
                      Course Content
                    </button>
                    <button className="pb-3 px-1 text-gray-500 hover:text-gray-700 whitespace-nowrap">
                      Instructor
                    </button>
                    <button className="pb-3 px-1 text-gray-500 hover:text-gray-700 whitespace-nowrap">
                      Reviews
                    </button>
                  </div>
                </div>
              </div>

              {/* Selected Module Content */}
              <div className="p-6 sm:p-8">
                {/* Module Navigation */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentModulePage(prev => Math.max(0, prev - 1))}
                      disabled={currentModulePage === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                        currentModulePage === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous Module
                    </button>
                    <span className="text-sm text-gray-600">
                      Module {currentModulePage + 1} of {getTotalModulePages()}
                    </span>
                    <button
                      onClick={() => setCurrentModulePage(prev => Math.min(getTotalModulePages() - 1, prev + 1))}
                      disabled={currentModulePage === getTotalModulePages() - 1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                        currentModulePage === getTotalModulePages() - 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      Next Module
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Only show the currently paginated module */}
                {getPaginatedModules().map((module) => (
                  <React.Fragment key={module.id}>
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{module.title}</h3>
                      <p className="text-gray-600">{module.description}</p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {module.sections.map((section, sectionIndex) => (
                        <div key={section.id} className="border-b border-gray-200 last:border-b-0">
                          <div className="px-5 py-4 bg-gray-50 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-500 mr-2">
                                  Section {getCurrentSectionNumber(module.id, sectionIndex)} of {getTotalSections()}
                                </span>
                                <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
                              </div>
                              <span className="text-sm text-gray-500">
                                {section.lessons.length} {section.lessons.length === 1 ? 'lesson' : 'lessons'}
                              </span>
                            </div>
                          </div>

                          <div className="divide-y divide-gray-100">
                            {section.lessons.map((lesson) => (
                              <div 
                                key={lesson.id} 
                                className="px-5 py-4 flex justify-between items-center group hover:bg-gray-50 transition-colors duration-200"
                              >
                                <div className="flex items-center">
                                  {lesson.free || module.unlocked ? (
                                    lesson.type === 'ebook' ? (
                                      <FiBook className="text-blue-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                                    ) : (
                                      <FiPlay className="text-blue-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                                    )
                                  ) : (
                                    <FiLock className="text-gray-400 mr-3 group-hover:text-gray-500 group-hover:scale-110 transition-all duration-200" />
                                  )}
                                  <div>
                                    <h4 className={`text-sm font-medium flex items-center ${lesson.type === 'ebook' ? 'text-blue-700' : 'text-gray-900'} group-hover:translate-x-0.5 transition-transform duration-200`}>
                                      {lesson.title}
                                      {lesson.free && !module.unlocked && (
                                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                          lesson.type === 'ebook' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                        } group-hover:bg-opacity-80 transition-colors duration-200`}>
                                          Free Preview
                                        </span>
                                      )}
                                    </h4>
                                    <div className="flex items-center text-xs text-gray-500 mt-1">
                                      <FiClock className="mr-1" />
                                      <span>{lesson.duration}</span>
                                      <span className="mx-2">•</span>
                                      <span className="capitalize">{lesson.type}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                {(lesson.free || module.unlocked) ? (
                                  <div>
                                    <Link
                                      to={`/school/course/${module.id}?lesson=${lesson.id}`}
                                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                      <FiDownload className="mr-1.5" /> Download
                                    </Link>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500">
                                    Locked
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;
