import React, { useState, useEffect } from 'react';
import { FiX, FiUpload, FiBook, FiSave, FiDollarSign, FiBookOpen, FiPackage, FiTruck, FiHash, FiCalendar } from 'react-icons/fi';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const BookModal = ({ book, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        description: '',
        price: 0,
        type: 'ebook',
        fileUrl: '',
        stock: 0,
        thumbnail: '',
        isbn: '',
        deliveryFee: 0,
        watermarkTemplate: '',
        published: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewImage, setPreviewImage] = useState('');

    useEffect(() => {
        if (book) {
            setFormData({
                title: book.title || '',
                author: book.author || '',
                description: book.description || '',
                price: book.price || 0,
                type: book.type || 'ebook',
                fileUrl: book.fileUrl || '',
                stock: book.stock || 0,
                thumbnail: book.thumbnail || '',
                isbn: book.isbn || '',
                deliveryFee: book.deliveryFee || 0,
                watermarkTemplate: book.watermarkTemplate || '',
                published: book.published || new Date().toISOString().split('T')[0]
            });
            setPreviewImage(book.thumbnail || '');
        }
    }, [book]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setLoading(true);
            setError('');

            // Create a preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);

            // Get token for authentication
            const token = localStorage.getItem('adminToken');
            if (!token) {
                setError('Please login first');
                return;
            }
            
            // Get pre-signed URL from server
            const { data: { url } } = await axios.get(`${API_URL}/s3Url`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!url) {
                throw new Error('Failed to get upload URL');
            }

            // Upload the file directly to S3 using the secure URL
            await axios.put(url, file, {
                headers: {
                    'Content-Type': file.type
                }
            });

            // Extract the file URL from the S3 URL (remove the query parameters)
            const fileUrl = url.split('?')[0];
            console.log('S3 thumbnail URL:', fileUrl);
            
            // Update form data with the S3 URL
            setFormData(prev => ({
                ...prev,
                thumbnail: fileUrl
            }));

        } catch (err) {
            console.error('Error uploading image:', err);
            if (err.response) {
                setError(`Upload failed: ${err.response.data?.message || 'Server error'}`);
            } else if (err.request) {
                setError('Could not connect to server. Please check if the server is running.');
            } else {
                setError('Failed to upload image. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            setError('');

            // Validate required fields
            if (!formData.title || !formData.author || !formData.description) {
                setError('Please fill in all required fields (title, author, description)');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('adminToken');
            if (!token) {
                setError('Authentication required');
                setLoading(false);
                return;
            }

            // Create data object with all needed fields
            const bookData = {
                title: formData.title,
                author: formData.author,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                type: formData.type || 'ebook',
                isbn: formData.isbn || '',
                thumbnail: formData.thumbnail || '',
                published: formData.published || new Date().toISOString().split('T')[0],
                watermarkTemplate: formData.watermarkTemplate || ''
            };

            // Add conditional fields based on book type
            if (formData.type === 'ebook') {
                bookData.fileUrl = formData.fileUrl || '';
            } else if (formData.type === 'hardcopy') {
                bookData.stock = parseInt(formData.stock) || 0;
                bookData.deliveryFee = parseFloat(formData.deliveryFee) || 0;
            }

            let response;
            if (book) {
                // Update existing book
                response = await axios.put(`${API_URL}/api/admin/books/${book._id}`, bookData, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                // Create new book
                response = await axios.post(`${API_URL}/api/admin/books`, bookData, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            if (response.data) {
                onSave();
            }
        } catch (err) {
            console.error('Error saving book:', err);
            setError(err.response?.data?.message || 'Failed to save book. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white p-6 border-b border-gray-200 z-10">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">{book ? 'Edit Book' : 'Add New Book'}</h2>
                        <button 
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-100"
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Book Cover */}
                        <div className="lg:col-span-1">
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Book Cover</h3>
                                <div className="flex flex-col items-center">
                                    <div className="relative w-48 h-64 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden mb-4 bg-white">
                                        {previewImage ? (
                                            <img 
                                                src={previewImage} 
                                                alt="Book cover preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                                                <FiBook className="text-gray-400 mb-2" size={32} />
                                                <span className="text-sm text-gray-500">No cover image</span>
                                            </div>
                                        )}
                                    </div>
                                    <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
                                        <FiUpload className="mr-2" />
                                        <span>Upload Cover</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="mt-2 text-xs text-gray-500">Recommended: 600x800px, JPG or PNG</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Book Details */}
                        <div className="lg:col-span-2">
                            <div className="space-y-6">
                                {/* Basic Information */}
                                <div className="bg-white rounded-xl p-6 border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Book Title
                                            </label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={formData.title}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Author
                                            </label>
                                            <input
                                                type="text"
                                                name="author"
                                                value={formData.author}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                rows="4"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                required
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                <FiCalendar className="mr-1" />
                                                Published Date
                                            </label>
                                            <input
                                                type="date"
                                                name="published"
                                                value={formData.published}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing & Type */}
                                <div className="bg-white rounded-xl p-6 border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Pricing & Type</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                <FiDollarSign className="mr-1" />
                                                Price
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500">$</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleChange}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                <FiBookOpen className="mr-1" />
                                                Book Type
                                            </label>
                                            <select
                                                name="type"
                                                value={formData.type}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                required
                                            >
                                                <option value="ebook">E-Book</option>
                                                <option value="hardcopy">Hard Copy</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                <FiHash className="mr-1" />
                                                ISBN
                                            </label>
                                            <input
                                                type="text"
                                                name="isbn"
                                                value={formData.isbn}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                placeholder="ISBN number"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                File URL
                                            </label>
                                            <input
                                                type="text"
                                                name="fileUrl"
                                                value={formData.fileUrl}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                placeholder="URL to download the book"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Details */}
                                <div className="bg-white rounded-xl p-6 border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                <FiPackage className="mr-1" />
                                                Stock (for hardcopy)
                                            </label>
                                            <input
                                                type="number"
                                                name="stock"
                                                value={formData.stock}
                                                onChange={handleChange}
                                                min="0"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                disabled={formData.type !== 'hardcopy'}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                <FiTruck className="mr-1" />
                                                Delivery Fee (for hardcopy)
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500">$</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    name="deliveryFee"
                                                    value={formData.deliveryFee}
                                                    onChange={handleChange}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                    disabled={formData.type !== 'hardcopy'}
                                                />
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Watermark Template
                                            </label>
                                            <input
                                                type="text"
                                                name="watermarkTemplate"
                                                value={formData.watermarkTemplate}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                placeholder="Watermark template"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium flex items-center"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave className="mr-2" />
                                    Save Book
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookModal; 