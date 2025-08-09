'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please make sure you used the complete link from your email.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          
          // Store the JWT token for immediate login
          if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userEmail', data.user.email);
            localStorage.setItem('userName', data.user.name);
            
            // Redirect to homepage after 3 seconds
            setTimeout(() => {
              router.push('/');
            }, 3000);
          }
        } else {
          if (data.error?.includes('expired')) {
            setStatus('expired');
          } else {
            setStatus('error');
          }
          setMessage(data.error || 'Verification failed');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const handleResendVerification = async () => {
    if (!email) {
      alert('Please enter your email address');
      return;
    }

    setResendLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('New verification email sent! Please check your inbox.');
      } else {
        alert(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-200 via-white to-blue-200 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-yellow-200 p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="text-6xl mb-4">⏳</div>
              <h1 className="text-2xl font-bold text-gray-700 mb-4">Verifying Email...</h1>
              <p className="text-gray-600">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-green-700 mb-4">Email Verified!</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
                <p className="text-green-700 font-semibold">🎉 Welcome to All4You Auctions!</p>
                <p className="text-green-600 text-sm mt-1">You are now logged in and will be redirected to the homepage shortly.</p>
              </div>
              <Link 
                href="/" 
                className="inline-block bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-6 py-3 rounded-lg transition-all duration-150"
              >
                Go to Homepage
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-red-700 mb-4">Verification Failed</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="space-y-4">
                <Link 
                  href="/register" 
                  className="block w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-6 py-3 rounded-lg transition-all duration-150"
                >
                  Try Registering Again
                </Link>
                <Link 
                  href="/login" 
                  className="block w-full bg-gray-500 hover:bg-gray-600 text-white font-bold px-6 py-3 rounded-lg transition-all duration-150"
                >
                  Login Instead
                </Link>
              </div>
            </>
          )}

          {status === 'expired' && (
            <>
              <div className="text-6xl mb-4">⏰</div>
              <h1 className="text-2xl font-bold text-orange-700 mb-4">Link Expired</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              
              <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-6">
                <p className="text-orange-700 font-semibold">Don't worry, we can send you a new link!</p>
                <p className="text-orange-600 text-sm mt-1">Enter your email below to receive a fresh verification link.</p>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500"
                />
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-all duration-150"
                >
                  {resendLoading ? 'Sending...' : 'Send New Verification Email'}
                </button>
                
                <div className="text-center">
                  <Link 
                    href="/register" 
                    className="text-yellow-600 hover:text-yellow-700 underline text-sm"
                  >
                    Or start over with a new registration
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-yellow-200 via-white to-blue-200 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-yellow-200 p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold text-gray-700 mb-4">Loading...</h1>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
