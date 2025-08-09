'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  id: string;
  label: string;
  accept?: string;
  maxSize?: number; // in bytes
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
  error?: string;
  required?: boolean;
  className?: string;
}

export default function FileUpload({
  id,
  label,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  currentFile,
  error,
  required = false,
  className = ''
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      onFileSelect(null);
      return;
    }

    // Validate file type
    const allowedTypes = accept.split(',').map(type => {
      if (type.startsWith('.')) {
        // Convert extension to MIME type
        const ext = type.substring(1);
        switch (ext) {
          case 'pdf': return 'application/pdf';
          case 'jpg':
          case 'jpeg': return 'image/jpeg';
          case 'png': return 'image/png';
          default: return '';
        }
      }
      return type.trim();
    }).filter(Boolean);

    if (!allowedTypes.includes(file.type)) {
      alert(`Please upload only ${accept} files`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      alert(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    onFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileChange(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const removeFile = () => {
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
          dragActive
            ? 'border-yellow-400 bg-yellow-50'
            : currentFile
            ? 'border-green-400 bg-green-50'
            : error
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          required={required}
        />

        {currentFile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center text-green-600">
              <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">File uploaded successfully</span>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{currentFile.name}</p>
              <p>{formatFileSize(currentFile.size)}</p>
            </div>
            <div className="flex justify-center space-x-2 mt-4">
              <button
                type="button"
                onClick={handleClick}
                className="px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
              >
                Replace File
              </button>
              <button
                type="button"
                onClick={removeFile}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-gray-600">
              <p className="font-medium">Click to upload or drag and drop</p>
              <p className="text-sm">
                Supported formats: {accept.replace(/\./g, '').replace(/,/g, ', ').toUpperCase()}
              </p>
              <p className="text-sm">
                Maximum size: {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
            <button
              type="button"
              onClick={handleClick}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
            >
              Choose File
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
