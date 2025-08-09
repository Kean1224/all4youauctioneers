'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftIcon,
  PhotoIcon, 
  CurrencyDollarIcon, 
  DocumentCheckIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';

interface SellItemForm {
  title: string;
  description: string;
  category: string;
  condition: string;
  askingPrice: string;
  location: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
}

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
}

export default function ModernSellPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  
  const [formData, setFormData] = useState<SellItemForm>({
    title: '',
    description: '',
    category: '',
    condition: '',
    askingPrice: '',
    location: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    }));
    
    setImages(prev => [...prev, ...newImages].slice(0, 8)); // Max 8 images
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 8,
    maxSize: 5242880 // 5MB
  });

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof SellItemForm] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };



  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return images.length > 0;
      case 2:
        return !!(formData.title && formData.description && formData.category && formData.condition);
      case 3:
        return !!(formData.askingPrice);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setError('');
    } else {
      setError('Please fill in all required fields before continuing.');
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      setError('Please complete all required fields.');
      return;
    }

    // Check for user token before submitting
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to submit an item. Please login or register first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submissionData = new FormData();
      // Add form data
      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          submissionData.append(key, JSON.stringify(value));
        } else if (Array.isArray(value)) {
          submissionData.append(key, JSON.stringify(value));
        } else {
          submissionData.append(key, value.toString());
        }
      });
      // Add images
      images.forEach((image) => {
        submissionData.append('images', image.file);
      });
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sell-item/submit`, {
        method: 'POST',
        body: submissionData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setSuccess(true);
      } else if (response.status === 403) {
        setError('You must be logged in to submit an item. Please login or register first.');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit item. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Sell item error:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Photos', icon: PhotoIcon },
    { number: 2, title: 'Details', icon: DocumentCheckIcon },
    { number: 3, title: 'Your Offer', icon: CurrencyDollarIcon }
  ];

  const categories = [
    'Electronics & Technology',
    'Vehicles & Transport',
    'Home & Garden',
    'Fashion & Accessories',
    'Art & Collectibles',
    'Books & Media',
    'Business & Industrial',
    'Other'
  ];

  const conditions = [
    'New',
    'Like New',
    'Excellent',
    'Good', 
    'Fair',
    'Poor'
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="relative min-h-screen flex items-center justify-center py-12 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center"
          >
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-card border border-white/20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-sora font-bold text-secondary-800 mb-4">
                Offer Submitted!
              </h2>
              <p className="text-secondary-600 font-inter mb-6">
                Your offer has been sent to the admin. You will receive an email once the admin reviews your offer and either accepts or sends a counter-offer.
              </p>
              <div className="space-y-3">
                <Link href="/my-offers">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-3 bg-primary-500 text-secondary-800 rounded-xl font-inter font-bold hover:bg-primary-400 transition-all duration-200 shadow-glow"
                  >
                    View My Offers
                  </motion.button>
                </Link>
                <Link href="/sell">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-3 border-2 border-secondary-300 text-secondary-700 rounded-xl font-inter font-bold hover:border-primary-500 hover:text-primary-600 transition-all duration-200"
                  >
                    Make Another Offer
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/10 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative min-h-screen">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <Link
                href="/"
                className="inline-flex items-center text-white/80 hover:text-white font-inter font-medium transition-colors group"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Link>
            </motion.div>

            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-sora font-bold text-white mb-4">
                Sell Directly to Admin
              </h1>
              <p className="text-xl text-white/80 font-inter max-w-2xl mx-auto">
                Submit your item and your asking price. The admin will review your offer and may accept or send a counter-offer. If accepted, you will be contacted to arrange the sale.
              </p>
            </motion.div>

            {/* Process Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <div className="flex justify-center items-center space-x-8 mb-8">
                {steps.map((stepItem, index) => {
                  const StepIcon = stepItem.icon;
                  const isActive = step === stepItem.number;
                  const isCompleted = step > stepItem.number;
                  
                  return (
                    <div key={stepItem.number} className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-primary-500 text-secondary-800' 
                          : isActive 
                          ? 'bg-white text-secondary-800 shadow-glow' 
                          : 'bg-white/20 text-white/60'
                      }`}>
                        {isCompleted ? (
                          <CheckCircleIcon className="w-8 h-8" />
                        ) : (
                          <StepIcon className="w-8 h-8" />
                        )}
                      </div>
                      <span className={`text-sm font-inter mt-3 ${
                        isActive ? 'text-white font-medium' : 'text-white/60'
                      }`}>
                        {stepItem.title}
                      </span>
                      {index < steps.length - 1 && (
                        <div className="hidden md:block absolute top-8 left-20 w-16 h-0.5 bg-white/20"></div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="w-full bg-white/20 rounded-full h-2">
                <motion.div
                  className="h-2 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                  initial={{ width: '33%' }}
                  animate={{ width: `${(step / 3) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-card border border-white/20">
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Step 1: Photo Upload */}
                  {step === 1 && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-2xl font-sora font-bold text-secondary-800 mb-2">
                          Upload Photos
                        </h3>
                        <p className="text-secondary-600 font-inter">
                          Add up to 8 high-quality photos. The first photo will be your main listing image.
                        </p>
                      </div>

                      {/* Drag & Drop Zone */}
                      <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                          isDragActive 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-secondary-300 hover:border-primary-400 hover:bg-primary-50/50'
                        }`}
                      >
                        <input {...getInputProps()} />
                        <CloudArrowUpIcon className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                        <h4 className="text-lg font-inter font-medium text-secondary-700 mb-2">
                          {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
                        </h4>
                        <p className="text-secondary-500 font-inter mb-4">
                          or click to browse files
                        </p>
                        <div className="inline-flex items-center px-4 py-2 bg-primary-500 text-secondary-800 rounded-lg font-inter font-medium hover:bg-primary-400 transition-colors">
                          <PlusIcon className="w-5 h-5 mr-2" />
                          Choose Files
                        </div>
                        <p className="text-xs text-secondary-400 mt-4">
                          JPG, PNG, WebP • Max 5MB per image • Up to 8 images
                        </p>
                      </div>

                      {/* Image Preview Grid */}
                      {images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {images.map((image, index) => (
                            <motion.div
                              key={image.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative group"
                            >
                              <img
                                src={image.preview}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-32 object-cover rounded-xl"
                              />
                              {index === 0 && (
                                <div className="absolute top-2 left-2 bg-primary-500 text-secondary-800 px-2 py-1 rounded text-xs font-inter font-bold">
                                  Main
                                </div>
                              )}
                              <button
                                onClick={() => removeImage(image.id)}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Item Details */}
                  {step === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-sora font-bold text-secondary-800 mb-2">
                          Item Details
                        </h3>
                        <p className="text-secondary-600 font-inter">
                          Provide detailed information about your item to attract more bidders.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                            Item Title *
                          </label>
                          <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800"
                            placeholder="Enter a descriptive title"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                            Category *
                          </label>
                          <select
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800"
                          >
                            <option value="">Select a category</option>
                            {categories.map(category => (
                              <option key={category} value={category}>{category}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                            Condition *
                          </label>
                          <select
                            name="condition"
                            value={formData.condition}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800"
                          >
                            <option value="">Select condition</option>
                            {conditions.map(condition => (
                              <option key={condition} value={condition}>{condition}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                            Location
                          </label>
                          <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800"
                            placeholder="City, Province"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                          Description *
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={6}
                          className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800"
                          placeholder="Describe your item in detail. Include condition, features, history, and any defects."
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Your Offer (Direct Sale) */}
                  {step === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-sora font-bold text-secondary-800 mb-2">
                          Your Asking Price
                        </h3>
                        <p className="text-secondary-600 font-inter">
                          Enter the price (ZAR) you would like to receive for your item. The admin will review your offer and may accept or send a counter-offer.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                            Asking Price (ZAR) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">R</span>
                            <input
                              type="number"
                              name="askingPrice"
                              value={formData.askingPrice}
                              onChange={handleInputChange}
                              className="w-full pl-8 pr-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800"
                              placeholder="0.00"
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start"
                    >
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-red-600 text-sm font-inter">{error}</p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-secondary-200">
                {step > 1 ? (
                  <motion.button
                    type="button"
                    onClick={prevStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center px-6 py-3 border-2 border-secondary-300 text-secondary-700 font-inter font-bold rounded-xl hover:border-secondary-400 transition-all duration-200"
                  >
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Previous
                  </motion.button>
                ) : (
                  <div></div>
                )}
                
                <div className="ml-auto">
                  {step < 3 ? (
                    <motion.button
                      type="button"
                      onClick={nextStep}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-secondary-800 font-inter font-bold rounded-xl hover:from-primary-400 hover:to-primary-500 transition-all duration-200 shadow-glow"
                    >
                      Next
                      <ArrowLeftIcon className="w-5 h-5 ml-2 rotate-180" />
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                      className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-inter font-bold rounded-xl hover:from-green-400 hover:to-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit for Review
                          <CheckCircleIcon className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
