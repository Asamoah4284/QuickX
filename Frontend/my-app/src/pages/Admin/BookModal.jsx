import React, { useState, useEffect } from 'react';
import { FiX, FiUpload, FiBook, FiSave, FiDollarSign, FiBookOpen, FiPackage, FiTruck, FiHash, FiCalendar, FiTrash2, FiPlus, FiImage } from 'react-icons/fi';
import axios from 'axios';
import { API_URL } from '@/config/api';
import { uploadFileToS3 } from '../../utils/uploadToS3';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

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
        galleryImages: [],
        isbn: '',
        deliveryFee: 0,
        watermarkTemplate: '',
        published: new Date().toISOString().split('T')[0],
        listingStatus: 'published',
        deliveryOptions: {
            availableTypes: ['pickup', 'pay_on_delivery', 'instant_pay'],
            estimatedDays: '2 - 4 business days',
            pickupLocations: '',
            deliveryFee: 0,
        },
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewImage, setPreviewImage] = useState('');

    useEffect(() => {
        if (book) {
            const rawDelivery = book.deliveryOptions || {};
            const availableTypes =
                Array.isArray(rawDelivery.availableTypes) && rawDelivery.availableTypes.length > 0
                    ? rawDelivery.availableTypes
                    : ['pickup', 'pay_on_delivery', 'instant_pay'];
            const estimatedDays = rawDelivery.estimatedDays || '2 - 4 business days';
            const pickupLocations = rawDelivery.pickupLocations || '';
            const deliveryFee = rawDelivery.deliveryFee != null ? rawDelivery.deliveryFee : (book.deliveryFee || 0);

            setFormData({
                title: book.title || '',
                author: book.author || '',
                description: book.description || '',
                price: book.price || 0,
                type: book.type || 'ebook',
                fileUrl: book.fileUrl || '',
                stock: book.stock || 0,
                thumbnail: book.thumbnail ? publicAssetUrl(book.thumbnail) : '',
                galleryImages: Array.isArray(book.galleryImages)
                    ? book.galleryImages.map(publicAssetUrl).filter(Boolean)
                    : [],
                isbn: book.isbn || '',
                deliveryFee: book.deliveryFee || 0,
                watermarkTemplate: book.watermarkTemplate || '',
                published: book.published || new Date().toISOString().split('T')[0],
                listingStatus: book.listingStatus || 'published',
                deliveryOptions: {
                    availableTypes,
                    estimatedDays,
                    pickupLocations,
                    deliveryFee,
                },
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

    const handleDeliveryTypeToggle = (type) => {
        setFormData(prev => {
            const current = prev.deliveryOptions?.availableTypes || [];
            const next = current.includes(type)
                ? current.filter(t => t !== type)
                : [...current, type];
            return {
                ...prev,
                deliveryOptions: {
                    ...prev.deliveryOptions,
                    availableTypes: next.length > 0 ? next : [type],
                }
            };
        });
    };

    const handleDeliveryOptionChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            deliveryOptions: {
                ...prev.deliveryOptions,
                [field]: value,
            }
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
            const fileUrl = await uploadFileToS3({ file, token, type: 'image' });

            setFormData(prev => ({
                ...prev,
                thumbnail: fileUrl
            }));
            setPreviewImage(fileUrl);
        } catch (err) {
            console.error('Error uploading image:', err);
            setError(err.message || 'Failed to upload image. Please try again.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
            const uploadedUrls = [];
            for (const file of files) {
                const fileUrl = await uploadFileToS3({ file, token, type: 'image' });
                if (fileUrl) uploadedUrls.push(fileUrl);
            }

            setFormData(prev => ({
                ...prev,
                galleryImages: [...(prev.galleryImages || []), ...uploadedUrls]
            }));
        } catch (err) {
            console.error('Error uploading gallery images:', err);
            setError(err.message || 'Failed to upload gallery images. Please try again.');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleRemoveGalleryImage = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            galleryImages: (prev.galleryImages || []).filter((_, idx) => idx !== indexToRemove)
        }));
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

            const token =
                localStorage.getItem('adminToken') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('token');
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
                galleryImages: formData.galleryImages || [],
                published: formData.published || new Date().toISOString().split('T')[0],
                watermarkTemplate: formData.watermarkTemplate || '',
                listingStatus: formData.listingStatus || 'published',
                deliveryOptions: {
                    availableTypes: formData.deliveryOptions?.availableTypes || ['pickup', 'pay_on_delivery', 'instant_pay'],
                    estimatedDays: formData.deliveryOptions?.estimatedDays || '2 - 4 business days',
                    pickupLocations: formData.deliveryOptions?.pickupLocations || '',
                    deliveryFee: parseFloat(formData.deliveryOptions?.deliveryFee) || 0,
                },
            };

            // Add conditional fields based on book type
            if (formData.type === 'ebook') {
                bookData.fileUrl = formData.fileUrl || '';
            } else if (formData.type === 'hardcopy') {
                bookData.stock = parseInt(formData.stock) || 0;
                bookData.deliveryFee = parseFloat(formData.deliveryOptions?.deliveryFee ?? formData.deliveryFee) || 0;
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

                            {/* Book Gallery Photos */}
                            <div className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                        <FiImage className="text-blue-600" />
                                        Gallery Photos
                                    </h3>
                                    <span className="text-xs text-gray-500">
                                        {formData.galleryImages?.length || 0} images
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                    Upload additional photos showing inside pages, table of contents, or 3D mockups.
                                </p>

                                {formData.galleryImages && formData.galleryImages.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                                        {formData.galleryImages.map((imgUrl, idx) => (
                                            <div key={`${imgUrl}-${idx}`} className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                                                <img src={imgUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveGalleryImage(idx)}
                                                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 text-white opacity-90 hover:opacity-100 hover:scale-110 transition shadow"
                                                    title="Remove image"
                                                >
                                                    <FiX size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-blue-500 text-blue-600 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors shadow-sm text-xs font-semibold">
                                    <FiPlus size={15} />
                                    <span>Add Gallery Photos</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleGalleryUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* Book Status & Store Visibility */}
                            <div className="mt-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
                                    Store Status
                                </h3>
                                <p className="text-xs text-gray-500 mb-3.5 leading-relaxed">
                                    Control whether this book is live for buyers on the storefront.
                                </p>
                                <div className="space-y-2.5">
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                        (formData.listingStatus || 'published') === 'published'
                                            ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="listingStatus"
                                            value="published"
                                            checked={(formData.listingStatus || 'published') === 'published'}
                                            onChange={() => setFormData(prev => ({ ...prev, listingStatus: 'published' }))}
                                            className="mt-1 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-emerald-900">Live (Published)</span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    Active
                                                </span>
                                            </div>
                                            <p className="text-xs text-emerald-700/80 mt-0.5">
                                                Visible to buyers in the store and ready for purchase.
                                            </p>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                        formData.listingStatus === 'draft'
                                            ? 'border-slate-500 bg-slate-100 ring-2 ring-slate-400/20'
                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="listingStatus"
                                            value="draft"
                                            checked={formData.listingStatus === 'draft'}
                                            onChange={() => setFormData(prev => ({ ...prev, listingStatus: 'draft' }))}
                                            className="mt-1 text-slate-600 focus:ring-slate-500"
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-slate-800">Draft (Hidden)</span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                                    Hidden
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Hidden from buyers. Only visible to admins in the dashboard.
                                            </p>
                                        </div>
                                    </label>
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

                                {/* Physical Delivery & Fulfillment Configuration */}
                                <div className="bg-white rounded-xl p-6 border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center">
                                        <FiTruck className="mr-2 text-blue-600" />
                                        Physical Delivery &amp; Fulfillment
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Configure physical order delivery types, days timeframe, and fulfillment details.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                                Available Delivery Types (Customers can choose from selected)
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <label className="flex items-start p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.deliveryOptions?.availableTypes || []).includes('pickup')}
                                                        onChange={() => handleDeliveryTypeToggle('pickup')}
                                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="ml-2.5">
                                                        <span className="block text-sm font-medium text-gray-900">Station Pickup</span>
                                                        <span className="block text-xs text-gray-500">Pick up at designated store</span>
                                                    </div>
                                                </label>

                                                <label className="flex items-start p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.deliveryOptions?.availableTypes || []).includes('pay_on_delivery')}
                                                        onChange={() => handleDeliveryTypeToggle('pay_on_delivery')}
                                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="ml-2.5">
                                                        <span className="block text-sm font-medium text-gray-900">Pay on Delivery</span>
                                                        <span className="block text-xs text-gray-500">Pay courier on arrival</span>
                                                    </div>
                                                </label>

                                                <label className="flex items-start p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.deliveryOptions?.availableTypes || []).includes('instant_pay')}
                                                        onChange={() => handleDeliveryTypeToggle('instant_pay')}
                                                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="ml-2.5">
                                                        <span className="block text-sm font-medium text-gray-900">Instant Pay</span>
                                                        <span className="block text-xs text-gray-500">Online checkout (MoMo/Card)</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                    <FiCalendar className="mr-1 text-gray-500" />
                                                    Delivery Timeframe (Days)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.deliveryOptions?.estimatedDays || ''}
                                                    onChange={(e) => handleDeliveryOptionChange('estimatedDays', e.target.value)}
                                                    placeholder="e.g. 2 - 4 business days"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                    <FiDollarSign className="mr-1 text-gray-500" />
                                                    Standard Delivery Fee (GH₵)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.deliveryOptions?.deliveryFee ?? ''}
                                                    onChange={(e) => handleDeliveryOptionChange('deliveryFee', parseFloat(e.target.value) || 0)}
                                                    placeholder="0 for free delivery"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Pickup Station Address &amp; Instructions
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.deliveryOptions?.pickupLocations || ''}
                                                onChange={(e) => handleDeliveryOptionChange('pickupLocations', e.target.value)}
                                                placeholder="e.g. QuickX Partner Hub, Accra Mall Shop 14"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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