'use client';

import { useEffect, useState } from 'react';

export default function AdminTestPage() {
  const [localStorage, setLocalStorage] = useState<any>({});
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Read current localStorage
      const current = {
        admin_token: window.localStorage.getItem('admin_token'),
        admin_session: window.localStorage.getItem('admin_session'),
      };
      setLocalStorage(current);

      // Test localStorage write/read
      try {
        window.localStorage.setItem('test_item', 'test_value');
        const retrieved = window.localStorage.getItem('test_item');
        if (retrieved === 'test_value') {
          setTestResult('✅ localStorage is working correctly');
          window.localStorage.removeItem('test_item');
        } else {
          setTestResult('❌ localStorage read/write failed');
        }
      } catch (error) {
        setTestResult('❌ localStorage is blocked or unavailable: ' + error);
      }
    }
  }, []);

  const clearStorage = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('admin_token');
      window.localStorage.removeItem('admin_session');
      setLocalStorage({ admin_token: null, admin_session: null });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin localStorage Test</h1>
        
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">localStorage Test Result</h2>
          <p className="text-lg">{testResult}</p>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Current Admin Storage</h2>
          <div className="space-y-2">
            <div>
              <strong>admin_token:</strong> 
              <span className="ml-2 font-mono text-sm bg-gray-100 p-1 rounded">
                {localStorage.admin_token ? 
                  localStorage.admin_token.substring(0, 30) + '...' : 
                  'Not found'
                }
              </span>
            </div>
            <div>
              <strong>admin_session:</strong>
              <span className="ml-2 font-mono text-sm bg-gray-100 p-1 rounded">
                {localStorage.admin_session ? 'Present' : 'Not found'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={clearStorage}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Admin Storage
          </button>
        </div>

        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Navigation Test</h2>
          <div className="space-x-4">
            <a href="/admin/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Go to Login
            </a>
            <a href="/admin/dashboard" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}