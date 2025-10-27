'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Instagram, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/lib/hooks/useToast';

function ClientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    // Check if redirected from OAuth callback
    const instagramConnected = searchParams.get('instagram_connected');
    const accountId = searchParams.get('account');
    const error = searchParams.get('error');

    if (instagramConnected === 'true' && accountId) {
      setFeedbackType('success');
      setFeedbackMessage('Instagram account connected successfully!');
      setShowFeedback(true);
      success('Instagram account connected successfully!');

      // Clean URL after 3 seconds
      setTimeout(() => {
        router.replace('/clients');
        setShowFeedback(false);
      }, 3000);
    } else if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: 'You denied access to your Instagram account',
        invalid_request: 'Invalid OAuth request',
        connection_failed: 'Failed to connect Instagram account',
      };

      const errorMsg = errorMessages[error] || 'An error occurred';
      setFeedbackType('error');
      setFeedbackMessage(errorMsg);
      setShowFeedback(true);
      showError(errorMsg);

      // Clean URL after 3 seconds
      setTimeout(() => {
        router.replace('/clients');
        setShowFeedback(false);
      }, 3000);
    }
  }, [searchParams, router, success, showError]);

  return (
    <div>
      <PageHeader
        title="Client Accounts"
        description="Manage your client's Instagram accounts and connections"
      />

      {/* Feedback Banner */}
      {showFeedback && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-lg p-4 ${
            feedbackType === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {feedbackType === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <p className="font-medium">{feedbackMessage}</p>
        </div>
      )}

      {/* Content */}
      <div className="rounded-lg border bg-white p-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
            <Instagram className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Manage Client Accounts
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Connect and manage Instagram accounts for your clients
          </p>
          <button
            onClick={() => router.push('/instagram')}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Go to Instagram Accounts
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={
      <div>
        <PageHeader
          title="Client Accounts"
          description="Manage your client's Instagram accounts and connections"
        />
        <div className="animate-pulse rounded-lg border bg-white p-8">
          <div className="h-32" />
        </div>
      </div>
    }>
      <ClientsPageContent />
    </Suspense>
  );
}
