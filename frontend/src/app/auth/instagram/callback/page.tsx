'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { instagramService } from '@/lib/services/instagram.service';
import { useToast } from '@/lib/hooks/useToast';

function InstagramCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting your Instagram account...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        throw new Error(errorDescription || 'Instagram authorization failed');
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Verify state parameter
      const savedState = sessionStorage.getItem('instagram_oauth_state');
      if (state !== savedState) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Connect the account
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/instagram/callback`;
      await instagramService.connectAccount({ code, redirectUri });

      // Clean up
      sessionStorage.removeItem('instagram_oauth_state');

      setStatus('success');
      setMessage('Instagram account connected successfully!');
      success('Instagram account connected successfully!');

      // Redirect to Instagram accounts page
      setTimeout(() => {
        router.push('/instagram');
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to connect Instagram account');
      showError(err.message || 'Failed to connect Instagram account');

      // Redirect back after error
      setTimeout(() => {
        router.push('/instagram');
      }, 3000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Connecting Instagram
              </h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Success!</h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <p className="mt-4 text-xs text-gray-500">Redirecting...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Connection Failed
              </h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <p className="mt-4 text-xs text-gray-500">Redirecting back...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InstagramCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
          <div className="text-center">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    }>
      <InstagramCallbackContent />
    </Suspense>
  );
}
