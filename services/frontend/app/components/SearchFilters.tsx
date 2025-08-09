"use client";

import React, { useState, useEffect } from 'react';

interface SearchFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  lotCount: number;
}

export interface FilterState {
  searchTerm: string;
  category: string;
  priceRange: { min: number; max: number };
  status: string;
  sortBy: string;
  showWatchlistOnly: boolean;
}

const categories = [
  'All Categories',
  'Vehicles',
  'Tools & Machinery',
  'Electronics',
  'Furniture',
  'Art & Collectibles',
  'Jewelry',
  'Sports & Recreation',
  'Other'
];

const statusOptions = [
  { value: 'all', label: 'All Lots' },
  { value: 'active', label: 'Active Bidding' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'no_bids', label: 'No Bids Yet' },
  { value: 'winning', label: 'I\'m Winning' },
  { value: 'outbid', label: 'I\'m Outbid' }
];

const sortOptions = [
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'recently_added', label: 'Recently Added' },
  { value: 'most_bids', label: 'Most Popular' }
];

export default function SearchFilters({ onFilterChange, lotCount }: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    category: 'All Categories',
    priceRange: { min: 0, max: 100000 },
    status: 'all',
    sortBy: 'ending_soon',
    showWatchlistOnly: false
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: 'All Categories',
      priceRange: { min: 0, max: 100000 },
      status: 'all',
      sortBy: 'ending_soon',
      showWatchlistOnly: false
    });
  };

  const hasActiveFilters = 
    filters.searchTerm !== '' ||
    filters.category !== 'All Categories' ||
    filters.status !== 'all' ||
    filters.showWatchlistOnly ||
    filters.priceRange.min > 0 ||
    filters.priceRange.max < 100000;

  return (
    <div className="bg-gradient-to-r from-white to-yellow-50 rounded-2xl shadow-lg border border-yellow-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <h3 className="text-lg font-bold text-gray-800">Search & Filter</h3>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
            {lotCount} lots
          </span>
          {hasActiveFilters && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              Filtered
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <span className="text-sm">{isExpanded ? 'Less' : 'More'} Filters</span>
          <svg 
            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search lots by title, description, or category..."
          value={filters.searchTerm}
          onChange={(e) => updateFilter('searchTerm', e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 transition-all"
        />
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {filters.searchTerm && (
          <button
            onClick={() => updateFilter('searchTerm', '')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => updateFilter('showWatchlistOnly', !filters.showWatchlistOnly)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
            filters.showWatchlistOnly
              ? 'bg-red-500 text-white'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          ❤️ Watchlist Only
        </button>
        <button
          onClick={() => updateFilter('status', filters.status === 'ending_soon' ? 'all' : 'ending_soon')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
            filters.status === 'ending_soon'
              ? 'bg-orange-500 text-white'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          }`}
        >
          ⏰ Ending Soon
        </button>
        <button
          onClick={() => updateFilter('status', filters.status === 'no_bids' ? 'all' : 'no_bids')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
            filters.status === 'no_bids'
              ? 'bg-green-500 text-white'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          🎯 No Bids
        </button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-yellow-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-300"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-300"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-300"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range: R{(filters.priceRange.min || 0).toLocaleString()} - R{(filters.priceRange.max || 0).toLocaleString()}
            </label>
            <div className="flex gap-4 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceRange.min}
                onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, min: Number(e.target.value) || 0 })}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-300"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceRange.max}
                onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, max: Number(e.target.value) || 100000 })}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-300"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-center pt-2">
              <button
                onClick={clearFilters}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
