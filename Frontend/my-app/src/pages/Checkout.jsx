import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCreditCard, FiLock, FiArrowLeft, FiCheck, FiShoppingBag, FiCalendar, FiPhone, FiChevronDown } from 'react-icons/fi';
import { SiVisa, SiMastercard } from 'react-icons/si';
import { PaystackButton } from 'react-paystack';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';

/** Same rules as CoursePublicDetail / store: absolute URL or `${apiUrl}${path}`. */
function resolveCheckoutItemImageUrl(item, apiUrl) {
  const raw = item?.image ?? item?.thumbnail;
  if (raw == null || raw === '') return null;
  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
  if (!s) return null;
  if (s.startsWith('http')) return publicAssetUrl(s);
  if (!apiUrl) return null;
  return publicAssetUrl(`${apiUrl}${s}`);
}

function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cardName: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    zipCode: '',
    phoneNumber: '',
    provider: 'mtn',
    email: '',
    referralCode: ''
  });
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [returnInfo, setReturnInfo] = useState({ path: '/membership', state: null });
  const [paymentMethod, setPaymentMethod] = useState('momo'); // Default to mobile money
  // Add coupon state variables
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponId, setCouponId] = useState(null);
  const [discount, setDiscount] = useState(0);
  /** Success modal after Paystack — replaces window.alert */
  const [paymentSuccessModal, setPaymentSuccessModal] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // Paystack public key
  const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  // Load checkout item from location state
  useEffect(() => {
    if (location.state?.item) {
      setCheckoutItem(location.state.item);
      
      // Set return path and state information for after purchase
      if (location.state.returnPath) {
        setReturnInfo({
          path: location.state.returnPath || '/membership',
          state: location.state.returnTabState || null
        });
      }
    } else {
      // If no item provided, redirect to home
      navigate('/');
    }
  }, [location, navigate]);

  /** If course thumbnail wasn’t in navigation state, load it from the preview API. */
  useEffect(() => {
    if (!checkoutItem || checkoutItem.type !== 'course') return;
    if (resolveCheckoutItemImageUrl(checkoutItem, API_URL)) return;
    const id = checkoutItem.id ?? checkoutItem._id;
    const idStr = id != null ? String(id) : '';
    if (!idStr || !API_URL) return;

    let cancelled = false;
    axios
      .get(`${API_URL}/api/courses/${idStr}/preview`)
      .then(({ data }) => {
        if (cancelled || !data?.thumbnail) return;
        setCheckoutItem((prev) => {
          if (!prev) return prev;
          if (resolveCheckoutItemImageUrl(prev, API_URL)) return prev;
          return { ...prev, thumbnail: data.thumbnail };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [checkoutItem, API_URL]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Toggle payment method
  const togglePaymentMethod = (method) => {
    setPaymentMethod(method);
    // Clear errors when switching payment methods
    setErrors({});
  };

  // Handle form validation when needed
  const validateMomoFields = () => {
    return !!(formData.email && 
              formData.phoneNumber && 
              formData.phoneNumber.length === 10 &&
              /\S+@\S+\.\S+/.test(formData.email));
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (paymentMethod === 'card') {
      // Validate card name
      if (!formData.cardName.trim()) {
        newErrors.cardName = 'Cardholder name is required';
      }
      
      // Validate card number (basic validation for demo)
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Card number is required';
      } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Card number must be 16 digits';
      }
      
      // Validate expiry date (MM/YY format)
      if (!formData.expiryDate.trim()) {
        newErrors.expiryDate = 'Expiry date is required';
      } else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
        newErrors.expiryDate = 'Use MM/YY format';
      }
      
      // Validate CVV (3-4 digits)
      if (!formData.cvv.trim()) {
        newErrors.cvv = 'CVV is required';
      } else if (!/^\d{3,4}$/.test(formData.cvv)) {
        newErrors.cvv = 'CVV must be 3-4 digits';
      }
      
      // Validate zip code (basic validation)
      if (!formData.zipCode.trim()) {
        newErrors.zipCode = 'ZIP/Postal code is required';
      }
    } else if (paymentMethod === 'momo') {
      // Validate email
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Enter a valid email address';
      }
      
      // Validate phone number (Ghana format - 10 digits)
      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
      } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
        newErrors.phoneNumber = 'Enter a valid 10-digit phone number';
      }
      
      // Validate provider selection
      if (!formData.provider) {
        newErrors.provider = 'Please select a provider';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    }
    return value;
  };

  // Format phone number
  const formatPhoneNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length > 10) {
      return v.slice(0, 10);
    }
    return v;
  };

  // Handle submission of payment form for card payments
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Block all credit card submissions
    if (paymentMethod === 'card') {
      alert('Credit card payments are not available at this time. Please use Mobile Money (MoMo) to complete your purchase.');
      togglePaymentMethod('momo');
      return;
    }

    // Do nothing else - all purchases should go through Paystack/MoMo
    return;
  };

  // Handle Paystack payment success
  const handlePaymentSuccess = async (reference) => {
    // Block all non-MoMo payments
    if (paymentMethod !== 'momo') {
      alert('Only Mobile Money (MoMo) payments are accepted. Please use MoMo to complete your purchase.');
      togglePaymentMethod('momo');
      setIsProcessing(false);
      return;
    }

    console.log('Payment success response:', reference);
    setIsProcessing(true);
    
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication token not found');
      }

      // Extract reference string if it's an object
      const referenceString = typeof reference === 'object' ? reference.reference : reference;
      console.log('Extracted reference:', referenceString);

      if (!referenceString) {
        throw new Error('Invalid payment reference');
      }
      
      // Calculate the final price with proper decimal handling
      const finalPrice = calculateFinalPrice();
      const itemId = checkoutItem?.id ?? checkoutItem?._id;
      if (!itemId) {
        throw new Error('Missing item id — return to the course page and try checkout again.');
      }
      console.log('Calculated final price:', {
        original: checkoutItem?.price,
        discount: discount,
        final: finalPrice
      });
      
      // Program enrollment uses dedicated endpoint (idempotent enrollment on transactionId)
      if (checkoutItem?.type === 'program' && itemId) {
        const programPayload = {
          programId: String(itemId),
          paymentMethod: formData.provider === 'mtn' ? 'MTN' : 
                        formData.provider === 'vodafone' ? 'Vodafone' : 
                        formData.provider === 'airtel' ? 'AirtelTigo' : 'MTN',
          momoNumber: formData.phoneNumber,
          shippingAddress: {
            fullName: formData.email.split('@')[0] || 'Customer',
            phone: formData.phoneNumber || '',
            email: formData.email || ''
          },
          transactionId: referenceString,
          amount: finalPrice,
          currency: 'GHS'
        };

        const paymentResponse = await axios.post(`${API_URL}/api/payments/initialize-program`, programPayload, {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (paymentResponse.data.success) {
          setPaymentSuccessModal({
            title: "You're enrolled!",
            description: `You're enrolled in ${checkoutItem.title}. You can start creating courses in this track.`,
            ctaLabel: 'Open creator studio',
            navigateTo: '/instructor',
            navigateState: undefined
          });
          setIsProcessing(false);
          return;
        }
        throw new Error('Program payment initialization failed');
      }

      if (checkoutItem?.type === 'creator_subscription') {
        const instructorId = String(checkoutItem.instructorId ?? checkoutItem.id ?? '');
        if (!instructorId) {
          throw new Error('Missing instructor — return to the profile and try checkout again.');
        }
        if (!checkoutItem.planId) {
          throw new Error('Missing subscription plan — return to the profile and try again.');
        }
        const subPayload = {
          instructorId,
          planId: checkoutItem.planId,
          paymentMethod:
            formData.provider === 'mtn'
              ? 'MTN'
              : formData.provider === 'vodafone'
                ? 'Vodafone'
                : formData.provider === 'airtel'
                  ? 'AirtelTigo'
                  : 'MTN',
          momoNumber: formData.phoneNumber,
          shippingAddress: {
            fullName: formData.email.split('@')[0] || 'Customer',
            phone: formData.phoneNumber || '',
            email: formData.email || '',
          },
          transactionId: referenceString,
          amount: finalPrice,
          currency: 'GHS',
        };

        const subResponse = await axios.post(
          `${API_URL}/api/payments/initialize-creator-subscription`,
          subPayload,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (subResponse.data.success) {
          const name = checkoutItem.instructorName || 'this creator';
          setPaymentSuccessModal({
            title: 'Payment successful',
            description: `Your subscription to ${name} is confirmed.`,
            ctaLabel: 'Back to profile',
            navigateTo: `/instructors/${instructorId}`,
            navigateState: { subscriptionSuccess: true },
          });
          setIsProcessing(false);
          return;
        }
        throw new Error('Subscription payment failed');
      }

      // First save the payment data
      const paymentData = {
        itemType: checkoutItem.type,
        itemId: String(itemId),
        paymentMethod: formData.provider === 'mtn' ? 'MTN' : 
                      formData.provider === 'vodafone' ? 'Vodafone' : 
                      formData.provider === 'airtel' ? 'AirtelTigo' : 'MTN',
        momoNumber: formData.phoneNumber,
        shippingAddress: {
          fullName: formData.email.split('@')[0] || 'Customer',
          phone: formData.phoneNumber || '',
          email: formData.email || ''
        },
        transactionId: referenceString,
        status: 'completed',
        amount: finalPrice,
        currency: 'GHS',
        referralCode: formData.referralCode || ''
      };

      // Log the payment data being sent
      console.log('Sending payment data:', JSON.stringify(paymentData, null, 2));

      // Validate required fields before sending
      if (!paymentData.itemType || !paymentData.itemId || !paymentData.momoNumber || paymentData.amount == null) {
        throw new Error('Missing required payment data fields');
      }

      // Ensure we're using the correct API URL
      const apiUrl = API_URL;
      console.log('Using API URL:', apiUrl);

      // Initialize payment and get course access
      try {
        const paymentResponse = await axios.post(`${apiUrl}/api/payments/initialize`, paymentData, {
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Payment initialization response:', paymentResponse.data);

        if (paymentResponse.data.success) {
          if (checkoutItem?.type === 'course' && itemId) {
            // Save course purchase to database
            await axios.post(
              `${API_URL}/api/courses/${String(itemId)}/purchase`, 
              {
                reference: referenceString,
                amount: finalPrice,
                status: 'completed',
                referralCode: formData.referralCode || ''
              },
              {
                headers: { 'Authorization': `Bearer ${authToken}` }
              }
            );

            // Update localStorage for course
            const purchasedCourses = JSON.parse(localStorage.getItem('purchasedCourses') || '[]');
            if (!purchasedCourses.some(course => course.id === itemId || course.id === String(itemId))) {
              purchasedCourses.push({
                ...checkoutItem,
                id: itemId,
                purchaseDate: new Date().toISOString(),
                status: 'purchased'
              });
              localStorage.setItem('purchasedCourses', JSON.stringify(purchasedCourses));
            }

            setPaymentSuccessModal({
              title: 'Payment successful',
              description: `You now have full access to ${checkoutItem.title}.`,
              ctaLabel: 'Start learning',
              navigateTo: `/school/course/${String(itemId)}`,
              navigateState: { fromPurchase: true, courseId: String(itemId) }
            });
          } 
          else if (checkoutItem?.type === 'book' && itemId) {
            // Update localStorage for book
            const purchasedBooks = JSON.parse(localStorage.getItem('purchasedBooks') || '[]');
            if (!purchasedBooks.some(book => book.id === itemId || book.id === String(itemId))) {
              purchasedBooks.push({
                ...checkoutItem,
                id: itemId,
                purchaseDate: new Date().toISOString(),
                status: 'purchased'
              });
              localStorage.setItem('purchasedBooks', JSON.stringify(purchasedBooks));
            }
            localStorage.removeItem('pendingBookPurchase');
            setPaymentSuccessModal({
              title: 'Payment successful',
              description: `Your purchase of ${checkoutItem.title} is complete.`,
              ctaLabel: 'Go to library',
              navigateTo: '/library',
              navigateState: undefined
            });
          } else {
            setPaymentSuccessModal({
              title: 'Payment successful',
              description: 'Your purchase is complete.',
              ctaLabel: 'Continue',
              navigateTo: returnInfo.path,
              navigateState: returnInfo.state
            });
          }
          setIsProcessing(false);
        } else {
          throw new Error('Payment initialization failed');
        }
      } catch (error) {
        console.error('Payment initialization error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
          }
        });
        throw error;
      }
    } catch (error) {
      console.error('Error in handlePaymentSuccess:', error);
      const data = error.response?.data;
      const validationMsgs =
        Array.isArray(data?.errors) && data.errors.length
          ? data.errors.map((e) => e.msg || e.message || String(e)).join(' ')
          : '';
      const errorMessage =
        data?.message ||
        data?.error ||
        validationMsgs ||
        error.message;
      alert(`Error processing payment: ${errorMessage}`);
      setIsProcessing(false);
    }
  };

  // Handle Paystack payment close
  const handlePaymentClose = () => {
    console.log("Payment window closed");
    setIsProcessing(false);
  };

  // Handle back button - navigate to appropriate page based on item type
  const handleBack = () => {
    // Default to home page
    let backPath = '/';
    
    // If we have item information, determine better back destination
    if (checkoutItem?.type === 'book') {
      backPath = '/library';
    } else if (checkoutItem?.type === 'course') {
      backPath = '/courses';
    } else if (checkoutItem?.type === 'program') {
      backPath = '/creator/onboarding';
    } else if (checkoutItem?.type === 'creator_subscription') {
      const iid = checkoutItem.instructorId ?? checkoutItem.id;
      backPath = iid ? `/instructors/${iid}` : '/courses';
    }
    
    // If we have specific return path from state, use that instead
    if (location.state?.returnPath) {
      backPath = location.state.returnPath;
    }
    
    navigate(backPath);
  };

  // Get Paystack config
  const getPaystackConfig = () => {
    // Only allow MoMo payments
    if (paymentMethod !== 'momo') {
      return null;
    }

    const finalPrice = calculateFinalPrice();
    
    return {
      reference: `${checkoutItem?.type}_${checkoutItem?.id ?? checkoutItem?._id}_${checkoutItem?.planId ?? ''}_${Date.now()}`,
      email: formData.email,
      amount: finalPrice * 100,
      publicKey: paystackPublicKey,
      text: "Pay with Mobile Money",
      onSuccess: handlePaymentSuccess,
      onClose: handlePaymentClose,
      currency: "GHS",
      channels: ["mobile_money"],
      metadata: {
        custom_fields: [
          {
            display_name: "Phone Number",
            variable_name: "phone_number",
            value: formData.phoneNumber
          },
          {
            display_name: "Provider",
            variable_name: "provider",
            value: formData.provider
          },
          {
            display_name: "Item Type",
            variable_name: "item_type",
            value: checkoutItem?.type
          },
          {
            display_name: "Item ID",
            variable_name: "item_id",
            value: String(checkoutItem?.id ?? checkoutItem?._id ?? '')
          },
          {
            display_name: "Referral Code",
            variable_name: "referral_code",
            value: formData.referralCode || ''
          },
          {
            display_name: "Coupon Applied",
            variable_name: "coupon_applied",
            value: couponApplied ? "Yes" : "No"
          },
          {
            display_name: "Discount Amount",
            variable_name: "discount_amount",
            value: discount
          },
          {
            display_name: "Original Price",
            variable_name: "original_price",
            value: checkoutItem?.price
          },
          {
            display_name: "Final Price",
            variable_name: "final_price",
            value: finalPrice
          }
        ]
      }
    };
  };

  // Handle coupon application
  const handleApplyCoupon = async () => {
    try {
        setCouponError('');
        // Get the auth token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            setCouponError('Please login to apply coupon');
            return;
        }

        // First validate the coupon
        const validateResponse = await axios.post(`${API_URL}/api/validate-coupon`, {
            code: couponCode,
            price: checkoutItem?.price || 0
        });

        if (validateResponse.data.valid) {
            // If valid, apply the coupon to increment usage count
            const applyResponse = await axios.post(`${API_URL}/api/apply-coupon`, 
                { couponId: validateResponse.data.couponId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (applyResponse.data) {
                setCouponId(validateResponse.data.couponId);
                setDiscount(validateResponse.data.discount);
                setCouponApplied(true);
                setCouponError('');
            }
        }
    } catch (error) {
        setCouponError(error.response?.data?.message || 'Invalid coupon code');
        setCouponApplied(false);
        setDiscount(0);
        setCouponId(null);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setCouponError('');
    setCouponId(null);
    setDiscount(0);
  };

  // Calculate final price with discount
  const calculateFinalPrice = () => {
    const subtotal = Number(checkoutItem?.price || 0);
    if (couponApplied && discount > 0) {
        const discountAmount = Number((subtotal * discount / 100).toFixed(2));
        return Number((subtotal - discountAmount).toFixed(2));
    }
    return Number(subtotal.toFixed(2));
  };

  const checkoutItemImageSrc = useMemo(
    () => resolveCheckoutItemImageUrl(checkoutItem, API_URL),
    [checkoutItem]
  );

  const completeSuccessAndNavigate = () => {
    setPaymentSuccessModal((current) => {
      if (!current) return null;
      navigate(current.navigateTo, current.navigateState != null ? { state: current.navigateState } : undefined);
      return null;
    });
  };

  useEffect(() => {
    if (!paymentSuccessModal) return undefined;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setPaymentSuccessModal((current) => {
        if (!current) return null;
        navigate(current.navigateTo, current.navigateState != null ? { state: current.navigateState } : undefined);
        return null;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [paymentSuccessModal, navigate]);

  if (!checkoutItem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-12">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={handleBack}
            className="flex mt-4 items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Back to{' '}
            {checkoutItem.type === 'book'
              ? 'Library'
              : checkoutItem.type === 'program'
                ? 'Creator onboarding'
                : checkoutItem.type === 'creator_subscription'
                  ? 'Instructor'
                  : 'Courses'}
          </button>
          
         
          
          <div className="w-24"></div> {/* Empty div for flex spacing balance */}
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3">
            {/* Order Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FiShoppingBag className="mr-2 text-blue-600" />
                Order Summary
              </h2>
              
              <div className="mb-6">
                <div className="flex items-start">
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-gray-100 shadow-sm sm:h-24 sm:w-32">
                    {checkoutItemImageSrc ? (
                      <img
                        src={checkoutItemImageSrc}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[5rem] w-full items-center justify-center text-gray-400" aria-hidden>
                        <FiShoppingBag className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">{checkoutItem.title}</h3>
                    {checkoutItem.type === 'creator_subscription' && checkoutItem.description ? (
                      <p className="text-sm text-gray-500">{checkoutItem.description}</p>
                    ) : null}
                    <p className="text-sm text-gray-500">
                      {checkoutItem.type === 'book'
                        ? 'Digital Book'
                        : checkoutItem.type === 'course'
                          ? 'Online Course'
                          : checkoutItem.type === 'creator_subscription'
                            ? 'Creator subscription'
                            : 'Product'}
                    </p>
                    <p className="text-blue-600 font-bold mt-1">GH₵{checkoutItem.price}</p>
                  </div>
                </div>
              </div>
              
              {/* Coupon Code Section */}
              {checkoutItem?.type !== 'creator_subscription' ? (
                <div className="mt-4 mb-6">
                  <div className="flex">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={couponApplied}
                    />
                    {!couponApplied ? (
                      <button
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Apply
                      </button>
                    ) : (
                      <button
                        onClick={handleRemoveCoupon}
                        className="px-4 py-2 bg-red-600 text-white rounded-r-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {couponError && (
                    <p className="mt-1 text-sm text-red-600">{couponError}</p>
                  )}
                  {couponApplied && (
                    <p className="mt-1 text-sm text-green-600">
                      Coupon applied! {discount}% discount
                    </p>
                  )}
                </div>
              ) : null}
              
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Order Summary</h3>
                <div className="mt-4 space-y-4">
                    <div className="flex justify-between">
                        <p className="text-base text-gray-600">Subtotal</p>
                        <p className="text-base font-medium text-gray-900">GH₵{checkoutItem?.price?.toFixed(2)}</p>
                    </div>
                    {couponApplied && (
                        <div className="flex justify-between">
                            <p className="text-base text-gray-600">Discount ({discount}%)</p>
                            <p className="text-base font-medium text-green-600">
                                -GH₵{((checkoutItem?.price * discount) / 100).toFixed(2)}
                            </p>
                        </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-4">
                        <p className="text-base font-medium text-gray-900">Total</p>
                        <p className="text-base font-medium text-gray-900">GH₵{calculateFinalPrice().toFixed(2)}</p>
                    </div>
                </div>
              </div>
              
              <div className="mt-6 bg-blue-100 rounded-lg p-4 text-sm text-blue-700 flex items-start">
                <FiLock className="mr-2 mt-0.5 flex-shrink-0" />
                <p>Your payment information is secured using industry-standard encryption.</p>
              </div>
            </div>
            
            {/* Payment Form */}
            <div className="p-6 md:p-8 col-span-2">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FiCreditCard className="mr-2 text-blue-600" />
                Payment Information
              </h2>
              
              {/* Payment Method Selection */}
              <div className="mb-6">
                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors ${
                      paymentMethod === 'momo' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={() => togglePaymentMethod('momo')}
                    type="button"
                  >
                    <FiPhone className="mr-2" />
                    Mobile Money
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center transition-colors ${
                      paymentMethod === 'card' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={() => togglePaymentMethod('card')}
                    type="button"
                  >
                    <FiCreditCard className="mr-2" />
                    Credit Card
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit}>
                {paymentMethod === 'momo' && (
                  <div className="grid grid-cols-1 gap-6 mb-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="example@email.com"
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                    </div>
                    
                    {checkoutItem?.type !== 'creator_subscription' ? (
                      <div>
                        <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-1">
                          Referral Code (Optional)
                        </label>
                        <input
                          type="text"
                          id="referralCode"
                          name="referralCode"
                          value={formData.referralCode}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter referral code"
                        />
                      </div>
                    ) : null}

                    <div>
                      <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Money Provider
                      </label>
                      <div className="relative">
                        <select
                          id="provider"
                          name="provider"
                          value={formData.provider}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        >
                          <option value="mtn">MTN Mobile Money</option>
                          <option value="vodafone">Vodafone Cash</option>
                          <option value="airtel">AirtelTigo Money</option>
                        </select>
                        <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                      {errors.provider && <p className="mt-1 text-sm text-red-500">{errors.provider}</p>}
                    </div>
                    
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="phoneNumber"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setFormData(prev => ({ ...prev, phoneNumber: formatted }));
                            if (errors.phoneNumber) {
                              setErrors(prev => ({ ...prev, phoneNumber: null }));
                            }
                          }}
                          className={`w-full px-3 py-2 border ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                          placeholder="0XX XXX XXXX"
                          maxLength="10"
                        />
                        <FiPhone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                      {errors.phoneNumber && <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>}
                      <p className="mt-1 text-xs text-gray-500">Enter your registered Mobile Money number</p>
                    </div>
                  </div>
                )}
                
                {paymentMethod === 'card' && (
                  <div className="grid grid-cols-1 gap-6 mb-6">
                    <div>
                      <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        id="cardName"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.cardName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Name on card"
                      />
                      {errors.cardName && <p className="mt-1 text-sm text-red-500">{errors.cardName}</p>}
                    </div>
                    
                    <div>
                      <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="cardNumber"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={(e) => {
                            const formatted = formatCardNumber(e.target.value);
                            setFormData(prev => ({ ...prev, cardNumber: formatted }));
                            if (errors.cardNumber) {
                              setErrors(prev => ({ ...prev, cardNumber: null }));
                            }
                          }}
                          className={`w-full border py-2 pl-3 pr-[5.5rem] ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                        />
                        <div
                          className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2"
                          aria-hidden
                        >
                          <SiVisa className="h-7 w-auto shrink-0 text-[#1434CB]" title="Visa" />
                          <SiMastercard className="h-8 w-auto shrink-0" title="Mastercard" />
                        </div>
                      </div>
                      {errors.cardNumber && <p className="mt-1 text-sm text-red-500">{errors.cardNumber}</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="expiryDate"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                            placeholder="MM/YY"
                            maxLength="5"
                          />
                          <FiCalendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        {errors.expiryDate && <p className="mt-1 text-sm text-red-500">{errors.expiryDate}</p>}
                      </div>
                      
                      <div>
                        <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          id="cvv"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleChange}
                          className={`w-full px-3 py-2 border ${errors.cvv ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                          placeholder="123"
                          maxLength="4"
                        />
                        {errors.cvv && <p className="mt-1 text-sm text-red-500">{errors.cvv}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                        Billing ZIP / Postal Code
                      </label>
                      <input
                        type="text"
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${errors.zipCode ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="12345"
                      />
                      {errors.zipCode && <p className="mt-1 text-sm text-red-500">{errors.zipCode}</p>}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-4 mt-8">
                  {paymentMethod === 'momo' ? (
                    <>
                      {formData.email && 
                       formData.phoneNumber && 
                       formData.phoneNumber.length === 10 &&
                       /\S+@\S+\.\S+/.test(formData.email) ? (
                        <PaystackButton
                          {...getPaystackConfig()}
                          className={`flex-1 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none flex items-center justify-center ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                          disabled={isProcessing}
                        />
                      ) : (
                        <button
                          type="button"
                          className="flex-1 px-5 py-2 bg-blue-300 text-white rounded-lg font-medium cursor-not-allowed flex items-center justify-center"
                          disabled={true}
                        >
                          Complete Required Fields
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="submit"
                      className={`flex-1 px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none flex items-center justify-center ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          Complete Purchase
                          <FiCheck className="ml-2" />
                        </> 
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {paymentSuccessModal ? (
          <motion.div
            key="payment-success-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-success-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
            onClick={completeSuccessAndNavigate}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl ring-1 ring-black/5"
            >
              <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 px-6 pb-6 pt-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                  <FiCheck className="h-7 w-7 stroke-[3]" aria-hidden />
                </div>
                <h2 id="payment-success-title" className="text-xl font-bold tracking-tight text-gray-900">
                  {paymentSuccessModal.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{paymentSuccessModal.description}</p>
              </div>
              <div className="border-t border-gray-100 bg-gray-50/90 px-6 py-4">
                <button
                  type="button"
                  onClick={completeSuccessAndNavigate}
                  className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {paymentSuccessModal.ctaLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default Checkout; 