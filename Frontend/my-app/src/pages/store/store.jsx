import React, { useState, useEffect } from 'react';
import { FiShoppingCart, FiBook, FiArrowRight, FiBookmark, FiX, FiPackage, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Default book cover if image is not available
const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';

const Store = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showHardcopyModal, setShowHardcopyModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [hardcopyRequest, setHardcopyRequest] = useState({
    name: '',
    location: ''
  });
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  /** Hero carousel slides — book-style covers; images keep natural aspect inside frame (no stretch). */
  const heroSlides = [
    { url: '/images/bk-1.jpg', alt: 'Featured digital book — The Wise Scholar', tag: 'Spotlight' },
    { url: '/images/bk-3.jpg', alt: 'Reading collection highlight', tag: 'Trending' },
    { url: '/images/bk-5.jpg', alt: 'New in the library', tag: 'New' }
  ];

  // Fetch books from API
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_URL}/api/books`);
        setBooks(response.data);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load books. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const goHeroSlide = (dir) => {
    setCurrentImageIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return heroSlides.length - 1;
      if (next >= heroSlides.length) return 0;
      return next;
    });
  };

  // Handle adding book to cart
  const handleAddBook = (book) => {
    setSelectedBook(book);
    setShowPurchaseModal(true);
  };

  // Handle purchase confirmation
  const handleConfirmPurchase = () => {
    // Get existing purchased books from localStorage or initialize empty array
    const existingBooks = JSON.parse(localStorage.getItem('purchasedBooks') || '[]');
    
    // Check if book is already in the purchased list
    if (!existingBooks.some(book => book.id === selectedBook._id)) {
      // Add new book to the list with a pending status
      const updatedBooks = [...existingBooks, {
        id: selectedBook._id,
        title: selectedBook.title,
        author: selectedBook.author,
        thumbnail: selectedBook.thumbnail,
        fileUrl: selectedBook.fileUrl,
        description: selectedBook.description,
        status: 'pending' // Mark as pending until payment is completed
      }];
      
      // Save to localStorage
      localStorage.setItem('purchasedBooks', JSON.stringify(updatedBooks));
      
      // Store the current book ID for payment confirmation
      localStorage.setItem('pendingBookPurchase', selectedBook._id);
    }
    
    // Close modal
    setShowPurchaseModal(false);
    
    // Redirect to checkout page with item data
    navigate('/checkout', { 
      state: { 
        item: {
          type: 'book',
          id: selectedBook._id,
          title: selectedBook.title,
          price: selectedBook.price,
          image: selectedBook.thumbnail
        },
        returnPath: '/membership',
        returnTabState: { activeTab: 'myBooks' }
      } 
    });
  };

  // Handle hardcopy request
  const handleHardcopyRequest = (book) => {
    setSelectedBook(book);
    setShowHardcopyModal(true);
  };

  // Handle hardcopy form submission
  const handleHardcopySubmit = (e) => {
    e.preventDefault();
    const message = `New Hardcopy Request:\n\nBook: ${selectedBook.title}\nPrice: GHS${selectedBook.price}\nName: ${hardcopyRequest.name}\nLocation: ${hardcopyRequest.location}`;
    const whatsappUrl = `https://wa.me/233542343069?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowHardcopyModal(false);
    setHardcopyRequest({ name: '', location: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Featured Book */}
      <div className="relative min-h-[52vh] overflow-hidden bg-gradient-to-r from-blue-950 to-blue-900 sm:min-h-[56vh] lg:min-h-[72vh]">
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto flex h-full min-h-0 max-w-6xl flex-col px-4 pb-12 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:px-8 lg:pb-16 lg:pt-24">
          <div className="grid min-w-0 grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="min-w-0 space-y-4 text-white sm:space-y-5 md:space-y-6">
              <div className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100 backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-xs">
                Featured Book
              </div>
              <h1 className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl sm:leading-tight md:text-4xl lg:text-5xl">
                Discover Your Next Digital Adventure
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-blue-100/95 sm:text-base md:text-lg">
                Explore our curated collection of digital books and expand your knowledge
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <a
                  href="#store-books"
                  className="w-full rounded-lg bg-white px-5 py-2.5 text-center text-sm font-semibold text-blue-900 transition-colors duration-300 hover:bg-blue-50 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
                >
                  Browse Collection
                </a>
                <a
                  href="#store-books"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white/95 transition-colors hover:text-blue-200 sm:text-base"
                >
                  <span>Learn More</span>
                  <FiArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Hero carousel — sits on hero background (no card frame); crossfade; arrows + dots */}
            <div className="relative min-w-0 w-full max-w-md justify-self-center lg:max-w-none lg:justify-self-end">
              <div className="relative mx-auto w-full max-w-[min(100%,320px)] sm:max-w-sm">
                <div
                  className="relative aspect-[3/4] w-full"
                  role="region"
                  aria-roledescription="carousel"
                  aria-label="Featured books and promotions"
                >
                  {heroSlides.map((slide, i) => (
                    <img
                      key={slide.url}
                      src={slide.url}
                      alt={slide.alt}
                      className={`absolute inset-0 m-auto max-h-full max-w-full object-contain p-2 transition-opacity duration-700 ease-out sm:p-3 ${
                        i === currentImageIndex ? 'z-10 opacity-100' : 'z-0 opacity-0'
                      }`}
                      draggable={false}
                    />
                  ))}
                  <p className="pointer-events-none absolute bottom-1 left-0 right-0 z-20 text-center text-[11px] font-semibold uppercase tracking-wider text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                    {heroSlides[currentImageIndex]?.tag}
                  </p>
                  <button
                    type="button"
                    onClick={() => goHeroSlide(-1)}
                    className="absolute left-0 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:left-1"
                    aria-label="Previous slide"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goHeroSlide(1)}
                    className="absolute right-0 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 sm:right-1"
                    aria-label="Next slide"
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Slide indicators">
                  {heroSlides.map((slide, i) => (
                    <button
                      key={slide.url}
                      type="button"
                      role="tab"
                      aria-selected={i === currentImageIndex}
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === currentImageIndex ? 'w-8 bg-white' : 'w-2 bg-white/35 hover:bg-white/55'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main id="store-books" className="max-w-6xl mx-auto scroll-mt-24 px-4 py-8 sm:px-6 sm:py-12">
        <div>
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl font-bold tracking-tight text-gray-800 sm:text-2xl md:text-3xl">
                Discover Books
              </h2>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">{error}</div>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Books grid */}
            {!isLoading && !error && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
                {books.map((book) => (
                  <div key={book._id} className="group overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl">
                    <div className="relative h-48 overflow-hidden sm:h-56 md:h-64">
                      <img 
                        src={book.thumbnail}
                        alt={book.title} 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onLoad={() => console.log('Book image loaded:', book.title, book.thumbnail)}
                        onError={(e) => {
                          console.error('Book image failed to load:', book.title, book.thumbnail);
                          e.target.onerror = null; // Prevent infinite loop
                          e.target.src = DEFAULT_BOOK_COVER;
                        }}
                      />
                      <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
                        <button type="button" className="rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white sm:p-2" aria-label="Bookmark">
                          <FiBookmark className="h-3.5 w-3.5 text-indigo-600 sm:h-4 sm:w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="mb-1 line-clamp-2 text-base font-semibold leading-snug text-gray-800 sm:mb-2 sm:text-lg md:text-xl">
                        {book.title}
                      </h3>
                      <p className="mb-3 text-xs text-gray-600 sm:mb-4 sm:text-sm">{book.author}</p>
                      {/* <div className="flex items-center text-amber-400 mb-3">
                        <FiStar className="fill-current" />
                        <FiStar className="fill-current" />
                        <FiStar className="fill-current" />
                        <FiStar className="fill-current" />
                        <FiStar />
                        <span className="text-gray-500 text-sm ml-2">
                          ({book.reviews?.length || 0} reviews)
                        </span>
                      </div> */}
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="text-sm font-bold text-indigo-600 sm:text-base md:text-lg">
                          GHS{book.price}
                        </span>
                        <div className="flex flex-wrap items-center justify-start gap-1.5 sm:justify-end sm:gap-2">
                          <button 
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-indigo-700 sm:px-3.5 sm:py-2 sm:text-sm"
                            onClick={() => handleAddBook(book)}
                          >
                            <FiShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Ebook
                          </button>
                          <button 
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-green-700 sm:px-3.5 sm:py-2 sm:text-sm"
                            onClick={() => handleHardcopyRequest(book)}
                          >
                            <FiPackage className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            Hardcopy
                          </button>
                        </div>
                      </div>
                      {book.type === 'hardcopy' && book.stock < 1 && (
                        <div className="mt-2 text-red-600 text-sm">
                          Out of stock
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && books.length === 0 && (
              <div className="text-center py-12">
                <FiBook className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No books found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Check back later for new titles.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
     
      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && selectedBook && (
        <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Purchase Confirmation</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={() => setShowPurchaseModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-start mb-4">
                <img 
                  src={selectedBook.thumbnail || DEFAULT_BOOK_COVER}
                  alt={selectedBook.title} 
                  className="h-24 w-20 object-cover rounded-md shadow-sm mr-4"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_BOOK_COVER;
                  }}
                />
                <div>
                  <h4 className="font-medium text-gray-900">{selectedBook.title}</h4>
                  <p className="text-sm text-gray-600">{selectedBook.author}</p>
                  <p className="mt-1 text-indigo-600 font-bold">GHS{selectedBook.price}</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">
                Add this book to your dashboard? You'll be directed to complete the purchase.
              </p>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowPurchaseModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  onClick={handleConfirmPurchase}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hardcopy Request Modal */}
      {showHardcopyModal && selectedBook && (
        <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Request Hardcopy</h3>
              <button 
                className="text-gray-400 hover:text-gray-600" 
                onClick={() => setShowHardcopyModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={handleHardcopySubmit} className="p-6">
              <div className="flex items-start mb-4">
                <img 
                  src={selectedBook.thumbnail || DEFAULT_BOOK_COVER}
                  alt={selectedBook.title} 
                  className="h-24 w-20 object-cover rounded-md shadow-sm mr-4"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_BOOK_COVER;
                  }}
                />
                <div>
                  <h4 className="font-medium text-gray-900">{selectedBook.title}</h4>
                  <p className="text-sm text-gray-600">{selectedBook.author}</p>
                  <p className="mt-1 text-indigo-600 font-bold">GHS{selectedBook.price}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={hardcopyRequest.name}
                    onChange={(e) => setHardcopyRequest({ ...hardcopyRequest, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">Your Location</label>
                  <input
                    type="text"
                    id="location"
                    required
                    value={hardcopyRequest.location}
                    onChange={(e) => setHardcopyRequest({ ...hardcopyRequest, location: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowHardcopyModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Store;

