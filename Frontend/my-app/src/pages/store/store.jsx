import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiStar, FiShoppingCart, FiBook, FiTrendingUp, FiArrowRight, FiBookmark, FiX, FiPackage } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Default book cover if image is not available
const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';

const Store = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
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

  // Hero section images
  const heroImages = [
    {
      url: '/images/bk-1.jpg',
      alt: 'Library bookshelf'
    },
    {
      url: '/images/bk-3.jpg',
      alt: 'Reading corner'
    },
    {
      url: '/images/bk-5.jpg',
      alt: 'Modern library'
    }
  ];

  // Fetch books from API
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Construct query parameters
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedCategory !== 'all') params.append('type', selectedCategory);
        
        const response = await axios.get(`${API_URL}/api/books?${params.toString()}`);
        setBooks(response.data);
      } catch (err) {
        console.error('Error fetching books:', err);
        setError('Failed to load books. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [searchQuery, selectedCategory]);

  // Rotate images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Featured Book */}
      <div className="relative h-[80vh] bg-gradient-to-r from-blue-900 to-indigo-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative h-full max-w-6xl pt-18 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full items-center gap-12">
            <div className="text-white space-y-6">
              <div className="inline-block px-4 py-2 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm">
                Featured Book
              </div>
              <h1 className="text-5xl font-bold leading-tight">
                Discover Your Next Digital Adventure
              </h1>
              <p className="text-xl text-blue-100 max-w-lg">
                Explore our curated collection of digital books and expand your knowledge
              </p>
              <div className="flex items-center space-x-4">
                <button className="bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-300">
                  Browse Collection
                </button>
                <button className="flex items-center space-x-2 text-white hover:text-blue-200 transition-colors duration-300">
                  <span>Learn More</span>
                  <FiArrowRight />
                </button>
              </div>
            </div>
            <div className="hidden lg:block relative perspective-1000">
              <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
              <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
              <div className="relative animate-float-3d">
                <div className="relative w-full max-w-md mx-auto transform-gpu">
                  <img
                    src={heroImages[currentImageIndex].url}
                    alt={heroImages[currentImageIndex].alt}
                    className="w-full drop-shadow-2xl h-96 object-cover transition-opacity duration-1000"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'translateZ(0)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div>
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Discover Books</h2>
              <div className="flex space-x-3">
                {/* Search input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search books..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                
                {/* Category filter */}
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Categories</option>
                  <option value="ebook">E-Books</option>
                  <option value="hardcopy">Hardcopy</option>
                </select>
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {books.map((book) => (
                  <div key={book._id} className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                    <div className="h-64 overflow-hidden relative">
                      <img 
                        src={book.thumbnail}
                        alt={book.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onLoad={() => console.log('Book image loaded:', book.title, book.thumbnail)}
                        onError={(e) => {
                          console.error('Book image failed to load:', book.title, book.thumbnail);
                          e.target.onerror = null; // Prevent infinite loop
                          e.target.src = DEFAULT_BOOK_COVER;
                        }}
                      />
                      <div className="absolute top-3 right-3">
                        <button className="bg-white/80 hover:bg-white p-2 rounded-full shadow-sm">
                          <FiBookmark className="text-indigo-600" />
                        </button>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{book.title}</h3>
                      <p className="text-gray-600 mb-3">{book.author}</p>
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
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-600 font-bold text-lg">
                          GHS{book.price}
                        </span>
                        <div className="flex gap-2">
                          <button 
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                            onClick={() => handleAddBook(book)}
                          >
                            <FiShoppingCart size={16} />
                            <span>Add</span>
                          </button>
                          <button 
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                            onClick={() => handleHardcopyRequest(book)}
                          >
                            <FiPackage size={16} />
                            <span>Hardcopy</span>
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
                  Try adjusting your search or filter to find what you're looking for.
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

