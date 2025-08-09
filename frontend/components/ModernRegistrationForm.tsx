'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  EnvelopeIcon, 
  LockClosedIcon,
  UserIcon,
  PhoneIcon,
  IdentificationIcon,
  HomeIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

interface RegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  idNumber: string;
  address: string;
  city: string;
  postalCode: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingConsent: boolean;
}

interface FileUploads {
  idDocument: File | null;
  proofOfAddress: File | null;
  bankStatement: File | null;
}

export default function ModernRegistrationForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<RegistrationForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    idNumber: '',
    address: '',
    city: '',
    postalCode: '',
    termsAccepted: false,
    privacyAccepted: false,
    marketingConsent: false
  });

  const [files, setFiles] = useState<FileUploads>({
    idDocument: null,
    proofOfAddress: null,
    bankStatement: null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FileUploads) => {
    const file = e.target.files?.[0] || null;
    setFiles(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && formData.phone);
      case 2:
        return !!(formData.password && formData.confirmPassword && formData.password === formData.confirmPassword);
      case 3:
        return !!(formData.idNumber && formData.address && formData.city && formData.postalCode);
      case 4:
        return !!(files.idDocument && files.proofOfAddress && files.bankStatement);
      case 5:
        return formData.termsAccepted && formData.privacyAccepted;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setError('');
    } else {
      setError('Please fill in all required fields correctly.');
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(5)) {
      setError('Please accept the terms and privacy policy.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const registrationData = new FormData();
      
      // Add form data with correct field names for backend
      registrationData.append('firstName', formData.firstName);
      registrationData.append('lastName', formData.lastName);
      registrationData.append('email', formData.email);
      registrationData.append('phone', formData.phone);
      registrationData.append('password', formData.password);
      registrationData.append('idNumber', formData.idNumber);
      registrationData.append('address', formData.address);
      registrationData.append('city', formData.city);
      registrationData.append('postalCode', formData.postalCode);
      registrationData.append('termsAccepted', formData.termsAccepted.toString());
      registrationData.append('privacyAccepted', formData.privacyAccepted.toString());
      registrationData.append('marketingConsent', formData.marketingConsent.toString());

      // Add files with correct field names
      if (files.idDocument) registrationData.append('idDocument', files.idDocument);
      if (files.proofOfAddress) registrationData.append('proofOfAddress', files.proofOfAddress);
      if (files.bankStatement) registrationData.append('bankStatement', files.bankStatement);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.all4youauctions.co.za';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        body: registrationData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Don't redirect immediately - show success message and let user check email
        // User should click the verification link from their email to complete registration
      } else {
        setError(data.error || data.message || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const steps = [
    { number: 1, title: 'Personal Info', icon: UserIcon },
    { number: 2, title: 'Security', icon: LockClosedIcon },
    { number: 3, title: 'Address', icon: HomeIcon },
    { number: 4, title: 'Documents', icon: DocumentArrowUpIcon },
    { number: 5, title: 'Review', icon: CheckCircleIcon }
  ];

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto text-center"
      >
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-card border border-white/20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircleIcon className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-sora font-bold text-secondary-800 mb-4">
            Registration Successful!
          </h2>
          <p className="text-secondary-600 font-inter mb-6">
            Please check your email for verification instructions.
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent mx-auto"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-tr from-primary-400 to-primary-600 flex items-center justify-center shadow-glow">
          <span className="text-3xl">✨</span>
        </div>
        <h1 className="text-3xl font-sora font-bold text-white mb-2">
          Join ALL4YOU Auctioneers
        </h1>
        <p className="text-white/80 font-inter">
          Create your account to start bidding and selling
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {steps.map((stepItem) => {
            const StepIcon = stepItem.icon;
            const isActive = step === stepItem.number;
            const isCompleted = step > stepItem.number;
            
            return (
              <div key={stepItem.number} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-primary-500 text-secondary-800' 
                    : isActive 
                    ? 'bg-white text-secondary-800 shadow-glow' 
                    : 'bg-white/20 text-white/60'
                }`}>
                  {isCompleted ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-6 h-6" />
                  )}
                </div>
                <span className={`text-xs font-inter mt-2 ${
                  isActive ? 'text-white font-medium' : 'text-white/60'
                }`}>
                  {stepItem.title}
                </span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <motion.div
            className="h-2 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
            initial={{ width: '20%' }}
            animate={{ width: `${(step / 5) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-card border border-white/20">
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait" custom={step}>
            <motion.div
              key={step}
              custom={step}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
            >
              {/* Step 1: Personal Information */}
              {step === 1 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-sora font-bold text-secondary-800 mb-6">
                    Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                        First Name *
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-10 pr-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                          placeholder="John"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                        Last Name *
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                          className="w-full pl-10 pr-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                        placeholder="john.doe@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                        placeholder="+27 12 345 6789"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Security */}
              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-sora font-bold text-secondary-800 mb-6">
                    Account Security
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-12 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-12 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                        )}
                      </button>
                    </div>
                    {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1 font-inter">Passwords do not match</p>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-inter font-medium text-blue-800 mb-2">Password Requirements:</h4>
                    <ul className="text-sm text-blue-700 font-inter space-y-1">
                      <li>• At least 8 characters long</li>
                      <li>• Include uppercase and lowercase letters</li>
                      <li>• Include at least one number</li>
                      <li>• Include at least one special character</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Step 3: Address Information */}
              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-sora font-bold text-secondary-800 mb-6">
                    Address Information
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      ID Number *
                    </label>
                    <div className="relative">
                      <IdentificationIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                      <input
                        type="text"
                        name="idNumber"
                        value={formData.idNumber}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                        placeholder="ID number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      Street Address *
                    </label>
                    <div className="relative">
                      <HomeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary-400" />
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                        placeholder="123 Main Street"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                        placeholder="Cape Town"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-inter text-secondary-800 placeholder-secondary-400 bg-white/80 backdrop-blur-sm"
                        placeholder="8001"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Document Uploads */}
              {step === 4 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-sora font-bold text-secondary-800 mb-6">
                    FICA Documents
                  </h3>
                  <p className="text-sm text-secondary-600 mb-6">
                    Please upload the required documents for FICA compliance. All documents should be clear and readable.
                  </p>
                  
                  {/* ID Document Upload */}
                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      ID Document (Copy of ID or Passport) *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="idDocument"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange(e, 'idDocument')}
                        className="hidden"
                      />
                      <label
                        htmlFor="idDocument"
                        className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-secondary-300 rounded-xl cursor-pointer hover:border-primary-400 transition-colors bg-white/60 backdrop-blur-sm"
                      >
                        <div className="text-center">
                          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-secondary-400" />
                          <div className="mt-2">
                            <span className="text-sm font-inter text-secondary-700">
                              {files.idDocument ? files.idDocument.name : 'Click to upload ID document'}
                            </span>
                            <p className="text-xs text-secondary-500 mt-1">JPG, PNG, or PDF (max 10MB)</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    {files.idDocument && (
                      <p className="mt-2 text-sm text-green-600 flex items-center">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        {files.idDocument.name}
                      </p>
                    )}
                  </div>

                  {/* Proof of Address Upload */}
                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      Proof of Address (Utility Bill or Bank Statement) *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="proofOfAddress"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange(e, 'proofOfAddress')}
                        className="hidden"
                      />
                      <label
                        htmlFor="proofOfAddress"
                        className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-secondary-300 rounded-xl cursor-pointer hover:border-primary-400 transition-colors bg-white/60 backdrop-blur-sm"
                      >
                        <div className="text-center">
                          <HomeIcon className="mx-auto h-12 w-12 text-secondary-400" />
                          <div className="mt-2">
                            <span className="text-sm font-inter text-secondary-700">
                              {files.proofOfAddress ? files.proofOfAddress.name : 'Click to upload proof of address'}
                            </span>
                            <p className="text-xs text-secondary-500 mt-1">Utility bill, bank statement, or municipal account</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    {files.proofOfAddress && (
                      <p className="mt-2 text-sm text-green-600 flex items-center">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        {files.proofOfAddress.name}
                      </p>
                    )}
                  </div>

                  {/* Bank Statement Upload */}
                  <div>
                    <label className="block text-sm font-inter font-medium text-secondary-700 mb-2">
                      Bank Statement (Last 3 Months) *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="bankStatement"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange(e, 'bankStatement')}
                        className="hidden"
                      />
                      <label
                        htmlFor="bankStatement"
                        className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-secondary-300 rounded-xl cursor-pointer hover:border-primary-400 transition-colors bg-white/60 backdrop-blur-sm"
                      >
                        <div className="text-center">
                          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-secondary-400" />
                          <div className="mt-2">
                            <span className="text-sm font-inter text-secondary-700">
                              {files.bankStatement ? files.bankStatement.name : 'Click to upload bank statement'}
                            </span>
                            <p className="text-xs text-secondary-500 mt-1">Recent bank statement (last 3 months)</p>
                          </div>
                        </div>
                      </label>
                    </div>
                    {files.bankStatement && (
                      <p className="mt-2 text-sm text-green-600 flex items-center">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        {files.bankStatement.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 5: Review and Terms */}
              {step === 5 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-sora font-bold text-secondary-800 mb-6">
                    Review & Terms
                  </h3>
                  
                  {/* Summary */}
                  <div className="bg-secondary-50 rounded-xl p-6 space-y-4">
                    <h4 className="font-inter font-semibold text-secondary-800">Registration Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-secondary-600">Name:</span>
                        <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                      </div>
                      <div>
                        <span className="text-secondary-600">Email:</span>
                        <p className="font-medium">{formData.email}</p>
                      </div>
                      <div>
                        <span className="text-secondary-600">Phone:</span>
                        <p className="font-medium">{formData.phone}</p>
                      </div>
                      <div>
                        <span className="text-secondary-600">City:</span>
                        <p className="font-medium">{formData.city}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-secondary-600 text-sm">Documents:</span>
                      <div className="space-y-1">
                        {files.idDocument && (
                          <p className="text-sm text-green-600 flex items-center">
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            ID Document: {files.idDocument.name}
                          </p>
                        )}
                        {files.proofOfAddress && (
                          <p className="text-sm text-green-600 flex items-center">
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            Proof of Address: {files.proofOfAddress.name}
                          </p>
                        )}
                        {files.bankStatement && (
                          <p className="text-sm text-green-600 flex items-center">
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            Bank Statement: {files.bankStatement.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="termsAccepted"
                        name="termsAccepted"
                        checked={formData.termsAccepted}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                      />
                      <label htmlFor="termsAccepted" className="ml-3 text-sm text-secondary-700">
                        I accept the{' '}
                        <Link href="/terms" className="text-primary-600 hover:text-primary-700 font-medium">
                          Terms of Service
                        </Link>{' '}
                        and understand the auction platform rules. *
                      </label>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="privacyAccepted"
                        name="privacyAccepted"
                        checked={formData.privacyAccepted}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                      />
                      <label htmlFor="privacyAccepted" className="ml-3 text-sm text-secondary-700">
                        I accept the{' '}
                        <Link href="/privacy" className="text-primary-600 hover:text-primary-700 font-medium">
                          Privacy Policy
                        </Link>{' '}
                        and consent to data processing. *
                      </label>
                    </div>

                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="marketingConsent"
                        name="marketingConsent"
                        checked={formData.marketingConsent}
                        onChange={handleInputChange}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                      />
                      <label htmlFor="marketingConsent" className="ml-3 text-sm text-secondary-700">
                        I consent to receive marketing communications and auction notifications.
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-3 mt-6"
                >
                  <p className="text-red-600 text-sm font-inter">{error}</p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step > 1 && (
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
            )}
            
            <div className="ml-auto">
              {step < 5 ? (
                <motion.button
                  type="button"
                  onClick={nextStep}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-secondary-800 font-inter font-bold rounded-xl hover:from-primary-400 hover:to-primary-500 transition-all duration-200 shadow-glow"
                >
                  Next
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-inter font-bold rounded-xl hover:from-green-400 hover:to-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <CheckCircleIcon className="w-5 h-5 ml-2" />
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-secondary-600 font-inter">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
