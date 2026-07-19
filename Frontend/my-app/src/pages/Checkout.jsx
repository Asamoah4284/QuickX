import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCreditCard, FiLock, FiArrowLeft, FiCheck, FiShoppingBag, FiCalendar, FiPhone, FiChevronDown } from 'react-icons/fi';
import { SiVisa, SiMastercard } from 'react-icons/si';
import { PaystackButton } from 'react-paystack';
import axios from 'axios';
import { publicAssetUrl } from '../utils/publicAssetUrl';
import GuestEbookCheckoutView from '../components/GuestEbookCheckoutView';
import PaymentSuccessModal from '../components/PaymentSuccessModal';
import {
  normalizeCart,
  getCartSubtotal,
  getCartLineTotal,
  getCartItemCount,
  expandCartItemsForPayment,
} from '../utils/bookCart';
import { ensureMetaPixel, trackMetaEvent } from '../utils/metaPixel';
import { clearPendingCheckout, readPendingCheckout } from '../utils/pendingCheckout';

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

/** Matches Navbar: both token and user profile must exist. */
function isUserLoggedIn() {
  const token = localStorage.getItem('authToken')?.trim();
  const userRaw = localStorage.getItem('user')?.trim();
  if (!token || !userRaw) return false;
  try {
    JSON.parse(userRaw);
    return true;
  } catch {
    return false;
  }
}

function isBookCheckoutItem(item) {
  return item?.type === 'book' || item?.type === 'book_cart' || item?.type === 'book_offer';
}

/** Store listing https://www.quickxlearn.com/store/6a09f6cbeae4b7e962bdb49d — Meta Pixel Purchase only for this title. */
const META_PIXEL_TRACKED_BOOK_ID = '6a09f6cbeae4b7e962bdb49d';

/** Meta Pixel Purchase payload only for the tracked store book; otherwise null. */
function getMetaPixelPurchasePayloadForTrackedBook(checkoutItem, finalPrice) {
  if (!checkoutItem) return null;
  const tid = META_PIXEL_TRACKED_BOOK_ID;

  if (checkoutItem.type === 'book') {
    const id = String(checkoutItem.id ?? checkoutItem._id ?? '');
    if (id !== tid) return null;
    return {
      content_name: checkoutItem.title || 'Book',
      content_ids: [tid],
      content_type: 'product',
      value: finalPrice,
      currency: 'GHS',
    };
  }

  if (checkoutItem.type === 'book_cart') {
    const items = normalizeCart(Array.isArray(checkoutItem.items) ? checkoutItem.items : []);
    const line = items.find((it) => String(it.id ?? it._id ?? '') === tid);
    if (!line) return null;
    return {
      content_name: line.title || checkoutItem.title || 'Book',
      content_ids: [tid],
      content_type: 'product',
      value: finalPrice,
      currency: 'GHS',
    };
  }

  if (checkoutItem.type === 'book_offer') {
    const ids = (checkoutItem.bookIds || []).map((id) => String(id));
    if (!ids.includes(tid)) return null;
    const books = Array.isArray(checkoutItem.books) ? checkoutItem.books : [];
    const book = books.find((b) => String(b._id ?? b.id ?? '') === tid);
    return {
      content_name: book?.title || checkoutItem.title || 'Book',
      content_ids: [tid],
      content_type: 'product',
      value: finalPrice,
      currency: 'GHS',
    };
  }

  return null;
}

/** Full cover art in order summary (no cropping). */
function CheckoutBookCover({ item, apiUrl, className = 'mb-4 w-full max-w-[220px]' }) {
  const src = resolveCheckoutItemImageUrl(item, apiUrl);
  const alt = item?.title ? `Cover: ${item.title}` : 'Book cover';

  return (
    <figure
      className={`overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200/80 ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="aspect-[3/4] w-full bg-slate-50 object-contain object-center"
        />
      ) : (
        <div
          className="flex aspect-[3/4] w-full items-center justify-center bg-gray-100 text-gray-400"
          aria-hidden
        >
          <FiShoppingBag className="h-10 w-10" />
        </div>
      )}
    </figure>
  );
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
  const [checkoutLoading, setCheckoutLoading] = useState(true);
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

  // Load checkout item from navigation state or ?book= id (for ad / direct links)
  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutItem() {
      if (location.state?.item) {
        setCheckoutItem(location.state.item);
        if (location.state.returnPath) {
          setReturnInfo({
            path: location.state.returnPath || '/membership',
            state: location.state.returnTabState || null,
          });
        }
        clearPendingCheckout();
        if (!cancelled) setCheckoutLoading(false);
        return;
      }

      const pending = readPendingCheckout();
      if (pending?.item) {
        setCheckoutItem(pending.item);
        if (pending.returnPath) {
          setReturnInfo({
            path: pending.returnPath || '/membership',
            state: pending.returnTabState || null,
          });
        }
        clearPendingCheckout();
        if (!cancelled) setCheckoutLoading(false);
        return;
      }

      const bookIdFromQuery = new URLSearchParams(location.search).get('book');
      if (bookIdFromQuery && API_URL) {
        try {
          const { data } = await axios.get(`${API_URL}/api/books/${bookIdFromQuery}/preview`);
          if (cancelled) return;
          setCheckoutItem({
            type: 'book',
            id: data._id,
            _id: data._id,
            title: data.title,
            price: Number(data.price || 0),
            thumbnail: data.thumbnail,
            image: data.thumbnail,
            author: data.author,
          });
          setReturnInfo({ path: `/store/${data._id}`, state: null });
        } catch {
          if (!cancelled) navigate('/store');
        } finally {
          if (!cancelled) setCheckoutLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setCheckoutLoading(false);
        navigate('/');
      }
    }

    loadCheckoutItem();
    return () => {
      cancelled = true;
    };
  }, [location, navigate, API_URL]);

  const isBookCart = checkoutItem?.type === 'book_cart';
  const bookCartItems = useMemo(() => {
    if (!isBookCart) return [];
    return normalizeCart(Array.isArray(checkoutItem?.items) ? checkoutItem.items : []);
  }, [checkoutItem, isBookCart]);

  const bookCartSubtotal = useMemo(() => {
    if (!isBookCart) return Number(checkoutItem?.price || 0);
    return getCartSubtotal(bookCartItems);
  }, [isBookCart, bookCartItems, checkoutItem?.price]);

  const bookCartUnitCount = useMemo(() => {
    if (!isBookCart) return 0;
    return getCartItemCount(bookCartItems);
  }, [isBookCart, bookCartItems]);

  const orderSummaryBookLine = useMemo(() => {
    if (!checkoutItem) return null;
    if (checkoutItem.type === 'book_cart' && bookCartItems[0]) return bookCartItems[0];
    if (
      checkoutItem.type === 'book' ||
      checkoutItem.type === 'book_offer' ||
      checkoutItem.type === 'book_cart'
    ) {
      return checkoutItem;
    }
    return null;
  }, [checkoutItem, bookCartItems]);

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
      const loggedIn = isUserLoggedIn();
      const authToken = loggedIn ? localStorage.getItem('authToken') : null;
      const isGuestBookCheckout = isBookCheckoutItem(checkoutItem) && !loggedIn;

      if (!loggedIn && !isGuestBookCheckout) {
        throw new Error(
          'Please sign in to complete this purchase, or buy an ebook from the store without an account.'
        );
      }

      // Extract reference string if it's an object
      const referenceString = typeof reference === 'object' ? reference.reference : reference;
      console.log('Extracted reference:', referenceString);

      if (!referenceString) {
        throw new Error('Invalid payment reference');
      }
      
      // Calculate the final price with proper decimal handling
      const finalPrice = calculateFinalPrice();
      const itemId = checkoutItem?.type === 'book_cart' ? null : (checkoutItem?.id ?? checkoutItem?._id);
      if (checkoutItem?.type !== 'book_cart' && !itemId) {
        throw new Error('Missing item id — return to the previous page and try checkout again.');
      }
      console.log('Calculated final price:', {
        original: checkoutItem?.price,
        discount: discount,
        final: finalPrice
      });

      await recordCouponUse();

      const metaPurchasePayload = getMetaPixelPurchasePayloadForTrackedBook(checkoutItem, finalPrice);
      if (metaPurchasePayload) {
        trackMetaEvent('Purchase', metaPurchasePayload);
      }

      const guestDownloadPath = (ref) => {
        const params = new URLSearchParams({ reference: ref });
        const email = String(formData.email || '').trim();
        if (email) params.set('email', email);
        return `/download/book?${params.toString()}`;
      };

      const saveGuestPurchaseLocally = (ref) => {
        try {
          const key = 'guestBookPurchases';
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const entry = {
            reference: ref,
            email: formData.email || '',
            purchasedAt: new Date().toISOString(),
            type: checkoutItem?.type,
            itemId:
              checkoutItem?.type === 'book'
                ? String(itemId)
                : checkoutItem?.type === 'book_offer'
                  ? String(checkoutItem.offerGroupId || itemId)
                  : null,
            items:
              checkoutItem?.type === 'book_cart'
                ? expandCartItemsForPayment(checkoutItem.items || [])
                : checkoutItem?.type === 'book_offer'
                  ? (checkoutItem.bookIds || []).map((id) => String(id))
                  : [],
          };
          if (!existing.some((p) => p.reference === ref)) {
            existing.push(entry);
            localStorage.setItem(key, JSON.stringify(existing));
          }
        } catch {
          /* ignore */
        }
      };

      const buildBookPaymentData = () => ({
        itemType: checkoutItem.type,
        ...(checkoutItem?.type === 'book_cart'
          ? { items: expandCartItemsForPayment(checkoutItem?.items || []) }
          : checkoutItem?.type === 'book_offer'
            ? {
                itemId: String(checkoutItem.offerGroupId || itemId),
                offerOptionId: String(checkoutItem.offerOptionId || ''),
              }
            : { itemId: String(itemId) }),
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
        status: 'completed',
        amount: finalPrice,
        currency: 'GHS',
        referralCode: '',
      });

      // Guest ebook checkout — no account required; go straight to download page
      if (isGuestBookCheckout) {
        const paymentData = buildBookPaymentData();
        if (
          !paymentData.momoNumber ||
          paymentData.amount == null ||
          (paymentData.itemType === 'book_cart'
            ? !Array.isArray(paymentData.items) || paymentData.items.length === 0
            : paymentData.itemType === 'book_offer'
              ? !paymentData.itemId || !paymentData.offerOptionId
              : !paymentData.itemId)
        ) {
          throw new Error('Missing required payment details. Check your email and phone number.');
        }
        if (!paymentData.shippingAddress.email?.trim()) {
          throw new Error('Email is required to receive your download link.');
        }

        const paymentResponse = await axios.post(
          `${API_URL}/api/payments/initialize-guest`,
          paymentData,
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (!paymentResponse.data?.success) {
          throw new Error(
            paymentResponse.data?.message ||
              'Could not confirm your payment. Please contact support with your Paystack reference.'
          );
        }

        saveGuestPurchaseLocally(referenceString);
        if (checkoutItem?.type === 'book_cart') {
          localStorage.removeItem('bookCart');
        } else {
          localStorage.removeItem('pendingBookPurchase');
        }

        setIsProcessing(false);
        navigate(guestDownloadPath(referenceString), { replace: true });
        return;
      }
      
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
            navigateState: undefined,
            amount: finalPrice,
            productLabel: checkoutItem.title,
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
            title: "You're subscribed",
            description: `Access to ${name}'s courses is ready in your dashboard.`,
            ctaLabel: 'Go to My Courses',
            navigateTo: '/membership',
            navigateState: { activeTab: 'myCourses', subscriptionSuccess: true },
            amount: finalPrice,
            meta: checkoutItem.description || checkoutItem.planLabel || 'Subscription',
            productLabel: `Subscribe to ${name}`,
          });
          setIsProcessing(false);
          return;
        }
        throw new Error('Subscription payment failed');
      }

      // First save the payment data
      const paymentData = {
        itemType: checkoutItem.type,
        ...(checkoutItem?.type === 'book_cart'
          ? { items: expandCartItemsForPayment(checkoutItem?.items || []) }
          : checkoutItem?.type === 'book_offer'
            ? {
                itemId: String(checkoutItem.offerGroupId || itemId),
                offerOptionId: String(checkoutItem.offerOptionId || ''),
              }
            : { itemId: String(itemId) }),
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
      if (
        !paymentData.itemType ||
        (paymentData.itemType === 'book_cart'
          ? !Array.isArray(paymentData.items) || paymentData.items.length === 0
          : paymentData.itemType === 'book_offer'
            ? !paymentData.itemId || !paymentData.offerOptionId
            : !paymentData.itemId) ||
        !paymentData.momoNumber ||
        paymentData.amount == null
      ) {
        throw new Error('Missing required payment data fields');
      }

      // Ensure we're using the correct API URL
      const apiUrl = API_URL;
      console.log('Using API URL:', apiUrl);

      const membershipBooksState = { activeTab: 'myBooks', bookPurchaseSuccess: true };

      // Initialize payment and get course access (logged-in users only; guests return earlier)
      try {
        const paymentResponse = await axios.post(`${apiUrl}/api/payments/initialize`, paymentData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
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
              navigateState: { fromPurchase: true, courseId: String(itemId) },
              amount: finalPrice,
              productLabel: checkoutItem.title,
            });
          } 
          else if (checkoutItem?.type === 'book_cart') {
            const items = Array.isArray(checkoutItem.items) ? checkoutItem.items : [];
            const purchasedBooks = JSON.parse(localStorage.getItem('purchasedBooks') || '[]');
            const next = [...purchasedBooks];
            const nowIso = new Date().toISOString();

            items.forEach((it) => {
              const id = it?.id ?? it?._id;
              if (!id) return;
              const idStr = String(id);
              if (next.some((b) => String(b?.id ?? '') === idStr)) return;
              next.push({
                ...it,
                id: idStr,
                purchaseDate: nowIso,
                status: 'purchased',
              });
            });

            localStorage.setItem('purchasedBooks', JSON.stringify(next));
            localStorage.removeItem('bookCart');
            setPaymentSuccessModal({
              title: 'Payment successful',
              description: `Your purchase is complete. ${items.length} book(s) are in your library.`,
              ctaLabel: 'View my books',
              navigateTo: '/membership',
              navigateState: membershipBooksState,
              amount: finalPrice,
              productLabel: `${items.length} book${items.length === 1 ? '' : 's'}`,
            });
          }
          else if (checkoutItem?.type === 'book_offer') {
            const books = Array.isArray(checkoutItem.books) ? checkoutItem.books : [];
            const purchasedBooks = JSON.parse(localStorage.getItem('purchasedBooks') || '[]');
            const next = [...purchasedBooks];
            const nowIso = new Date().toISOString();

            books.forEach((it) => {
              const id = it?.id ?? it?._id;
              if (!id) return;
              const idStr = String(id);
              if (next.some((b) => String(b?.id ?? '') === idStr)) return;
              next.push({
                ...it,
                id: idStr,
                purchaseDate: nowIso,
                status: 'purchased',
              });
            });

            localStorage.setItem('purchasedBooks', JSON.stringify(next));
            setPaymentSuccessModal({
              title: 'Payment successful',
              description: `Your purchase is complete. ${books.length || 1} book(s) are ready to download.`,
              ctaLabel: 'View my books',
              navigateTo: '/membership',
              navigateState: membershipBooksState,
              amount: finalPrice,
              productLabel: checkoutItem.title,
            });
          }
          else if (checkoutItem?.type === 'book' && itemId) {
            const purchasedBooks = JSON.parse(localStorage.getItem('purchasedBooks') || '[]');
            if (!purchasedBooks.some(book => book.id === itemId || book.id === String(itemId))) {
              purchasedBooks.push({
                ...checkoutItem,
                id: itemId,
                purchaseDate: new Date().toISOString(),
                status: 'purchased',
              });
              localStorage.setItem('purchasedBooks', JSON.stringify(purchasedBooks));
            }
            localStorage.removeItem('pendingBookPurchase');
            setPaymentSuccessModal({
              title: 'Payment successful',
              description: `Your purchase of ${checkoutItem.title} is complete.`,
              ctaLabel: 'View my books',
              navigateTo: '/membership',
              navigateState: membershipBooksState,
              amount: finalPrice,
              productLabel: checkoutItem.title,
            });
          } else {
            setPaymentSuccessModal({
              title: 'Payment successful',
              description: 'Your purchase is complete.',
              ctaLabel: 'Continue',
              navigateTo: returnInfo.path,
              navigateState: returnInfo.state,
              amount: finalPrice,
            });
          }
          setIsProcessing(false);
        } else {
          throw new Error('Payment initialization failed');
        }
      } catch (error) {
        const status = error.response?.status;
        const authFailed = status === 401 || status === 403;
        if (authFailed && isBookCheckoutItem(checkoutItem)) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('auth-change'));
          try {
            const paymentData = buildBookPaymentData();
            const retry = await axios.post(`${API_URL}/api/payments/initialize-guest`, paymentData, {
              headers: { 'Content-Type': 'application/json' },
            });
            if (retry.data?.success) {
              saveGuestPurchaseLocally(referenceString);
              if (checkoutItem?.type === 'book_cart') localStorage.removeItem('bookCart');
              else localStorage.removeItem('pendingBookPurchase');
              setIsProcessing(false);
              navigate(guestDownloadPath(referenceString), { replace: true });
              return;
            }
          } catch (guestErr) {
            console.error('Guest payment retry failed:', guestErr);
          }
        }
        console.error('Payment initialization error details:', {
          status: error.response?.status,
          data: error.response?.data,
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

      const paymentRef =
        typeof reference === 'object' ? reference?.reference : reference;

      if (
        isBookCheckoutItem(checkoutItem) &&
        !isUserLoggedIn() &&
        paymentRef &&
        /already recorded|duplicate/i.test(String(errorMessage))
      ) {
        setIsProcessing(false);
        const params = new URLSearchParams({ reference: String(paymentRef) });
        const email = String(formData.email || '').trim();
        if (email) params.set('email', email);
        navigate(`/download/book?${params.toString()}`, { replace: true });
        return;
      }

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
      backPath = '/dashboard';
    } else if (checkoutItem?.type === 'book_cart') {
      backPath = '/store';
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
      reference: `${checkoutItem?.type}_${checkoutItem?.id ?? checkoutItem?._id ?? 'cart'}_${checkoutItem?.planId ?? ''}_${Date.now()}`,
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
            value: isBookCart
              ? bookCartItems.map((i) => String(i?.id ?? '')).filter(Boolean).join(',')
              : String(checkoutItem?.id ?? checkoutItem?._id ?? '')
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

  const checkoutSubtotal = () =>
    isBookCart ? bookCartSubtotal : Number(checkoutItem?.price || 0);

  const discountAmount = () => {
    const subtotal = checkoutSubtotal();
    if (!couponApplied || discount <= 0) return 0;
    return Number(((subtotal * discount) / 100).toFixed(2));
  };

  // Validate admin coupon — usage is recorded after successful payment
  const handleApplyCoupon = async () => {
    try {
      setCouponError('');
      const code = String(couponCode || '').trim();
      if (!code) {
        setCouponError('Enter a coupon code');
        return;
      }

      const validateResponse = await axios.post(`${API_URL}/api/validate-coupon`, {
        code,
        price: checkoutSubtotal(),
      });

      if (validateResponse.data.valid) {
        setCouponId(validateResponse.data.couponId);
        setDiscount(validateResponse.data.discount);
        setCouponApplied(true);
        setCouponError('');
        setCouponCode(code.toUpperCase());
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

  const recordCouponUse = async () => {
    if (!couponId) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      await axios.post(
        `${API_URL}/api/apply-coupon`,
        { couponId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      /* non-blocking — payment already succeeded */
    }
  };

  // Calculate final price with discount
  const calculateFinalPrice = () => {
    const subtotal = checkoutSubtotal();
    if (couponApplied && discount > 0) {
      return Number((subtotal - discountAmount()).toFixed(2));
    }
    return Number(subtotal.toFixed(2));
  };

  /** SPA: Pixel Helper on /checkout only sees events fired on this route (not book-page clicks). */
  useEffect(() => {
    if (checkoutLoading || !checkoutItem) return;
    const payload = getMetaPixelPurchasePayloadForTrackedBook(
      checkoutItem,
      calculateFinalPrice()
    );
    if (!payload) return;
    ensureMetaPixel();
    trackMetaEvent('InitiateCheckout', { ...payload, num_items: 1 });
  }, [checkoutLoading, checkoutItem, couponApplied, discount, bookCartSubtotal]);

  const checkoutItemImageSrc = useMemo(
    () => resolveCheckoutItemImageUrl(checkoutItem, API_URL),
    [checkoutItem]
  );

  const isGuestEbookCheckout =
    Boolean(checkoutItem) &&
    !isUserLoggedIn() &&
    (checkoutItem.type === 'book' || checkoutItem.type === 'book_offer');

  const guestMoMoReady =
    formData.email &&
    formData.phoneNumber &&
    formData.phoneNumber.length === 10 &&
    /\S+@\S+\.\S+/.test(formData.email);

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

  if (checkoutLoading || !checkoutItem) {
    return (
      <motion.div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-slate-600">Loading checkout…</p>
        </div>
      </motion.div>
    );
  }

  if (isGuestEbookCheckout) {
    return (
      <GuestEbookCheckoutView
        checkoutItem={checkoutItem}
        checkoutItemImageSrc={checkoutItemImageSrc}
        total={calculateFinalPrice()}
        formData={formData}
        errors={errors}
        guestMoMoReady={guestMoMoReady}
        isProcessing={isProcessing}
        handleBack={handleBack}
        handleChange={handleChange}
        formatPhoneNumber={formatPhoneNumber}
        setFormData={setFormData}
        setErrors={setErrors}
        handleSubmit={handleSubmit}
        getPaystackConfig={getPaystackConfig}
        paymentSuccessModal={paymentSuccessModal}
        completeSuccessAndNavigate={completeSuccessAndNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] pt-6 sm:pt-8">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-[#1B5EF5]"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to{' '}
          {checkoutItem.type === 'book'
            ? 'Library'
            : checkoutItem.type === 'book_cart'
              ? 'Store'
              : checkoutItem.type === 'program'
                ? 'Creator onboarding'
                : checkoutItem.type === 'creator_subscription'
                  ? 'Instructor'
                  : 'Courses'}
        </button>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1B5EF5]">Checkout</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Complete your payment
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">Secure checkout · Powered by Paystack</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-5 md:gap-6">
            {/* Order Summary */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm md:col-span-2 md:p-7">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Order summary
              </h2>
              
              <div className="mb-6 mt-4">
                {orderSummaryBookLine ? (
                  checkoutItem.type === 'book_cart' && bookCartItems.length > 0 ? (
                    <ul className="space-y-5">
                      {bookCartItems.map((it) => (
                        <li
                          key={String(it?.id ?? it?.title)}
                          className="flex flex-col border-b border-blue-100/80 pb-5 last:border-0 last:pb-0"
                        >
                          <CheckoutBookCover item={it} apiUrl={API_URL} className="mb-3 w-full max-w-[220px]" />
                          <h3 className="font-semibold text-gray-900">{it.title}</h3>
                          {it.author ? (
                            <p className="mt-0.5 text-sm text-gray-500">By {it.author}</p>
                          ) : null}
                          <p className="mt-1 text-sm text-gray-500">
                            Digital book
                            {(it.quantity || 1) > 1 ? ` · Qty ${it.quantity}` : ''}
                          </p>
                          <p className="mt-2 text-lg font-bold text-blue-600">
                            GH₵{getCartLineTotal(it).toFixed(2)}
                            {(it.quantity || 1) > 1 ? (
                              <span className="ml-1 text-sm font-normal text-gray-500">
                                ({it.quantity} × GH₵{Number(it.price || 0)})
                              </span>
                            ) : null}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                  <div className="flex flex-col">
                    <CheckoutBookCover item={orderSummaryBookLine} apiUrl={API_URL} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{orderSummaryBookLine.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {checkoutItem.type === 'book_offer' ? 'Book bundle / plan' : 'Digital book'}
                      </p>
                      {orderSummaryBookLine.author ? (
                        <p className="text-sm text-gray-500">By {orderSummaryBookLine.author}</p>
                      ) : null}
                      <p className="mt-2 text-xl font-bold text-blue-600">
                        GH₵
                        {checkoutItem.type === 'book_cart'
                          ? getCartLineTotal(orderSummaryBookLine).toFixed(2)
                          : Number(checkoutItem.price || 0)}
                      </p>
                      {checkoutItem.type === 'book_cart' && (orderSummaryBookLine.quantity || 1) > 1 ? (
                        <p className="text-sm text-gray-500">
                          Qty {orderSummaryBookLine.quantity} × GH₵{Number(orderSummaryBookLine.price || 0)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  )
                ) : (
                  <div className="flex items-start">
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-gray-100 shadow-sm sm:h-24 sm:w-32">
                      {checkoutItemImageSrc ? (
                        <img
                          src={checkoutItemImageSrc}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-full min-h-[5rem] w-full items-center justify-center text-gray-400"
                          aria-hidden
                        >
                          <FiShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4 min-w-0">
                      <h3 className="font-medium text-gray-900">{checkoutItem.title}</h3>
                    {checkoutItem.type === 'creator_subscription' && checkoutItem.description ? (
                      <p className="text-sm text-gray-500">{checkoutItem.description}</p>
                    ) : null}
                    <p className="text-sm text-gray-500">
                      {checkoutItem.type === 'book_cart'
                        ? `${bookCartUnitCount} item${bookCartUnitCount === 1 ? '' : 's'} (${bookCartItems.length} title${bookCartItems.length === 1 ? '' : 's'})`
                        : checkoutItem.type === 'course'
                          ? 'Online Course'
                          : checkoutItem.type === 'creator_subscription'
                            ? 'Creator subscription'
                            : 'Product'}
                    </p>
                    {checkoutItem.type === 'book_cart' ? (
                      <div className="mt-2 space-y-1">
                        {bookCartItems.slice(0, 4).map((it) => (
                          <p key={String(it?.id ?? it?.title)} className="text-xs text-gray-600 line-clamp-1">
                            • {it?.title}
                            {(it.quantity || 1) > 1 ? ` (×${it.quantity})` : ''}
                          </p>
                        ))}
                        {bookCartItems.length > 4 ? (
                          <p className="text-xs text-gray-500">+ {bookCartItems.length - 4} more…</p>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="mt-1 font-bold text-[#1B5EF5]">
                      GH₵{isBookCart ? bookCartSubtotal.toFixed(2) : checkoutItem.price}
                    </p>
                  </div>
                </div>
                )}
              </div>
              
              {/* Coupon — codes created in Admin → Coupons */}
              <div className="mt-5">
                <label htmlFor="checkout-coupon" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Coupon code
                </label>
                <div className="flex gap-2">
                  <input
                    id="checkout-coupon"
                    type="text"
                    placeholder="Enter admin coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!couponApplied) handleApplyCoupon();
                      }
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1B5EF5] focus:ring-2 focus:ring-[#1B5EF5]/15 disabled:bg-slate-50"
                    disabled={couponApplied}
                    autoComplete="off"
                  />
                  {!couponApplied ? (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="shrink-0 rounded-xl bg-[#1B5EF5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Apply
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="shrink-0 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {couponError ? (
                  <p className="mt-1.5 text-sm text-red-600">{couponError}</p>
                ) : null}
                {couponApplied ? (
                  <p className="mt-1.5 text-sm font-medium text-emerald-600">
                    Coupon applied — {discount}% off
                  </p>
                ) : null}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <p className="text-slate-500">Subtotal</p>
                        <p className="font-medium text-slate-900">GH₵{checkoutSubtotal().toFixed(2)}</p>
                    </div>
                    {couponApplied ? (
                        <div className="flex justify-between text-sm">
                            <p className="text-slate-500">Discount ({discount}%)</p>
                            <p className="font-medium text-emerald-600">
                                -GH₵{discountAmount().toFixed(2)}
                            </p>
                        </div>
                    ) : null}
                    <div className="flex justify-between border-t border-slate-100 pt-3">
                        <p className="text-base font-semibold text-slate-900">Total</p>
                        <p className="text-base font-semibold text-slate-900">GH₵{calculateFinalPrice().toFixed(2)}</p>
                    </div>
                </div>
              </div>
              
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200/80">
                <FiLock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p>Payments are encrypted. Your details are never stored on QuickX servers.</p>
              </div>
            </div>
            
            {/* Payment Form */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm md:col-span-3 md:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Payment method
              </h2>
              <p className="mt-1 text-sm text-slate-500">Choose how you want to pay</p>
              
              {/* Payment Method Selection */}
              <div className="mb-6 mt-5">
                <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
                  <button
                    className={`flex flex-1 items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition ${
                      paymentMethod === 'momo' 
                        ? 'bg-white text-[#1B5EF5] shadow-sm ring-1 ring-slate-200/80' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => togglePaymentMethod('momo')}
                    type="button"
                  >
                    <FiPhone className="mr-2 h-4 w-4" />
                    Mobile Money
                  </button>
                  <button
                    className={`flex flex-1 items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition ${
                      paymentMethod === 'card' 
                        ? 'bg-white text-[#1B5EF5] shadow-sm ring-1 ring-slate-200/80' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => togglePaymentMethod('card')}
                    type="button"
                  >
                    <FiCreditCard className="mr-2 h-4 w-4" />
                    Card
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
                          className={`flex flex-1 items-center justify-center rounded-xl bg-[#1B5EF5] px-5 py-3 font-semibold text-white shadow-[0_8px_24px_-10px_rgba(27,94,245,0.65)] transition hover:bg-[#1550d6] focus:outline-none ${isProcessing ? 'cursor-not-allowed opacity-70' : ''}`}
                          disabled={isProcessing}
                        />
                      ) : (
                        <button
                          type="button"
                          className="flex flex-1 cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 px-5 py-3 font-semibold text-white"
                          disabled={true}
                        >
                          Complete required fields
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="submit"
                      className={`flex flex-1 items-center justify-center rounded-xl bg-[#1B5EF5] px-5 py-3 font-semibold text-white shadow-[0_8px_24px_-10px_rgba(27,94,245,0.65)] transition hover:bg-[#1550d6] focus:outline-none ${isProcessing ? 'cursor-not-allowed opacity-70' : ''}`}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          Complete purchase
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

        <AnimatePresence mode="wait">
          {paymentSuccessModal ? (
            <PaymentSuccessModal
              modal={paymentSuccessModal}
              onContinue={completeSuccessAndNavigate}
            />
          ) : null}
        </AnimatePresence>
      </div>
  );
}

export default Checkout; 