import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCreditCard, FiLock, FiArrowLeft, FiCheck, FiShoppingBag, FiCalendar, FiPhone, FiChevronDown } from 'react-icons/fi';
import { PaystackButton } from 'react-paystack';
import axios from 'axios';

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

  const API_URL = import.meta.env.VITE_API_URL;

  // Paystack public key
  const paystackPublicKey = "pk_live_d764bef87200f03cedc44a9908048e829201305a";

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
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm() && paymentMethod === 'card') {
      setIsProcessing(true);
      
      // Simulate payment processing
      setTimeout(() => {
        // Process based on item type (book or course)
        if (checkoutItem?.type === 'book' && checkoutItem?.id) {
          // Update book status from pending to purchased in localStorage
          const purchasedBooks = JSON.parse(localStorage.getItem('purchasedBooks') || '[]');
          const updatedBooks = purchasedBooks.map(book => {
            if (book.id === checkoutItem.id) {
              return { ...book, status: 'purchased' };
            }
            return book;
          });
          localStorage.setItem('purchasedBooks', JSON.stringify(updatedBooks));
          localStorage.removeItem('pendingBookPurchase'); // Clear pending flag
        } 
        else if (checkoutItem?.type === 'course' && checkoutItem?.id) {
          // Handle course purchase
          const purchasedCourses = JSON.parse(localStorage.getItem('purchasedCourses') || '[]');
          // Add the course to purchased courses if not already there
          if (!purchasedCourses.some(course => course.id === checkoutItem.id)) {
            purchasedCourses.push({
              ...checkoutItem,
              purchaseDate: new Date().toISOString(),
              status: 'purchased'
            });
            localStorage.setItem('purchasedCourses', JSON.stringify(purchasedCourses));
          }
        }
        
        // Redirect to return path (typically membership page)
        navigate(returnInfo.path, { state: returnInfo.state });
      }, 2000);
    }
  };

  // Handle Paystack payment success
  const handlePaymentSuccess = async (reference) => {
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
      
      // Calculate the final price with discount
      const finalPrice = calculateFinalPrice();
      
      // First save the payment data
      const paymentData = {
        itemType: checkoutItem.type,
        itemId: checkoutItem.id,
        paymentMethod: formData.provider === 'mtn' ? 'MTN' : 
                      formData.provider === 'vodafone' ? 'Vodafone' : 
                      formData.provider === 'airtel' ? 'AirtelTigo' : 'MTN',
        momoNumber: formData.phoneNumber,
        shippingAddress: {
          fullName: formData.cardName || '',
          phone: formData.phoneNumber || '',
          email: formData.email || ''
        },
        transactionId: referenceString,
        status: 'completed',
        amount: Number(finalPrice),
        currency: 'GHS',
        referralCode: formData.referralCode || ''
      };

      console.log('Sending payment data:', paymentData);

      // Initialize payment and get course access
      const paymentResponse = await axios.post(`${API_URL}/api/payments/initialize`, paymentData, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

        console.log('Payment saved:', paymentResponse.data);
        
      if (checkoutItem?.type === 'course' && checkoutItem?.id) {
        try {
          // Save course purchase to database with referral code
          const purchaseResponse = await axios.post(
            `${API_URL}/api/courses/${checkoutItem.id}/purchase`, 
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

          console.log('Course purchase saved:', purchaseResponse.data);

          // Update local storage with purchased course
          const purchasedCourses = JSON.parse(localStorage.getItem('purchasedCourses') || '[]');
          if (!purchasedCourses.some(course => course.id === checkoutItem.id)) {
            purchasedCourses.push({
              ...checkoutItem,
              purchaseDate: new Date().toISOString(),
              status: 'purchased'
            });
            localStorage.setItem('purchasedCourses', JSON.stringify(purchasedCourses));
          }

        // Display success message
        alert(`Payment successful! You now have access to ${checkoutItem.title}`);
          
          // Redirect to course page instead of membership
          navigate(`/school/course/${checkoutItem.id}`, { 
            state: { 
              fromPurchase: true,
              courseId: checkoutItem.id 
            }
          });
        } catch (error) {
          console.error('Error saving course purchase:', error);
          throw error;
        }
      } else {
        // Handle other item types (books, etc)
        navigate(returnInfo.path, { state: returnInfo.state });
      }
    } catch (error) {
      console.error('Error in handlePaymentSuccess:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          data: error.response?.data
        });
      alert(`Error processing payment: ${error.response?.data?.message || error.message}`);
    } finally {
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
    }
    
    // If we have specific return path from state, use that instead
    if (location.state?.returnPath) {
      backPath = location.state.returnPath;
    }
    
    navigate(backPath);
  };

  // Get Paystack config
  const getPaystackConfig = () => {
    // Calculate the final price with discount
    const finalPrice = calculateFinalPrice();
    
    return {
      reference: `${checkoutItem?.type}_${checkoutItem?.id}_${new Date().getTime()}`,
      email: formData.email,
      amount: finalPrice * 100, // Use the discounted price
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
            value: checkoutItem?.id
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
    const subtotal = checkoutItem?.price || 0;
    if (couponApplied && discount > 0) {
        const discountAmount = (subtotal * discount) / 100;
        return Number(subtotal - discountAmount);
    }
    return Number(subtotal);
  };

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
            Back to {checkoutItem.type === 'book' ? 'Library' : 'Courses'}
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
                  <div className="h-20 w-16 bg-white rounded-md overflow-hidden shadow-sm flex-shrink-0">
                    <img 
                      src={checkoutItem.image} 
                      alt={checkoutItem.title} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">{checkoutItem.title}</h3>
                    <p className="text-sm text-gray-500">
                      {checkoutItem.type === 'book' ? 'Digital Book' : 
                       checkoutItem.type === 'course' ? 'Online Course' : 'Product'}
                    </p>
                    <p className="text-blue-600 font-bold mt-1">GH₵{checkoutItem.price}</p>
                  </div>
                </div>
              </div>
              
              {/* Coupon Code Section */}
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
                    
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        You will receive a prompt on your phone to confirm payment. Please follow the instructions to complete your purchase.
                      </p>
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
                          className={`w-full px-3 py-2 border ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          <img src="/images/visa.svg" alt="Visa" className="h-6 w-auto" />
                          <img src="/images/mastercard.svg" alt="Mastercard" className="h-6 w-auto" />
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
    </div>
  );
}

export default Checkout; 