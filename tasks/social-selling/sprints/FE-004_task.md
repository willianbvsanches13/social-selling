# FE-004: Instagram Accounts Page

**Epic:** Frontend Development - Social Selling Platform
**Sprint:** Sprint 3 - Instagram Integration
**Story Points:** 8
**Priority:** High
**Assigned To:** Frontend Team
**Status:** Ready for Development
**Dependencies:** FE-001, FE-002, FE-003

## Overview

Create a comprehensive Instagram accounts management page where users can view, connect, disconnect, and manage their Instagram business accounts. Includes OAuth flow integration, account status indicators, and account switching functionality.

## Technical Requirements

### Features
- List all connected Instagram accounts
- Connect new Instagram account via OAuth
- Account card with profile information
- Disconnect/remove account functionality
- Account status indicators (active, error, refreshing)
- Refresh account data manually
- Account switching for multi-account users
- Profile picture and follower count display
- Last sync timestamp

## Implementation Details

### 1. Instagram Types

#### src/types/instagram.ts
```typescript
export interface InstagramAccount {
  id: string;
  instagramId: string;
  username: string;
  fullName: string;
  profilePictureUrl: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  biography?: string;
  website?: string;
  status: 'active' | 'error' | 'disconnected' | 'refreshing';
  accessToken: string;
  tokenExpiresAt: string;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramAuthResponse {
  code: string;
  state?: string;
}

export interface ConnectInstagramRequest {
  code: string;
  redirectUri: string;
}
```

### 2. Instagram API Service

#### src/lib/services/instagram.service.ts
```typescript
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { InstagramAccount, ConnectInstagramRequest } from '@/types/instagram';

export const instagramService = {
  async getAccounts(): Promise<InstagramAccount[]> {
    const response = await apiClient.get<InstagramAccount[]>(
      API_ENDPOINTS.INSTAGRAM_ACCOUNTS
    );
    return response.data || [];
  },

  async getAccount(accountId: string): Promise<InstagramAccount> {
    const response = await apiClient.get<InstagramAccount>(
      `${API_ENDPOINTS.INSTAGRAM_ACCOUNTS}/${accountId}`
    );
    return response.data!;
  },

  async connectAccount(data: ConnectInstagramRequest): Promise<InstagramAccount> {
    const response = await apiClient.post<InstagramAccount>(
      API_ENDPOINTS.INSTAGRAM_CONNECT,
      data
    );
    return response.data!;
  },

  async disconnectAccount(accountId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.INSTAGRAM_DISCONNECT(accountId));
  },

  async refreshAccount(accountId: string): Promise<InstagramAccount> {
    const response = await apiClient.post<InstagramAccount>(
      `${API_ENDPOINTS.INSTAGRAM_ACCOUNTS}/${accountId}/refresh`
    );
    return response.data!;
  },

  getAuthUrl(): string {
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/instagram/callback`
    );
    const scope = encodeURIComponent('user_profile,user_media');
    const state = Math.random().toString(36).substring(7);

    // Store state in sessionStorage for verification
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('instagram_oauth_state', state);
    }

    return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${state}`;
  },
};
```

### 3. Instagram Accounts Page

#### src/app/(dashboard)/instagram/page.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Instagram as InstagramIcon,
  Users,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonCard } from '@/components/common/Skeleton';
import { instagramService } from '@/lib/services/instagram.service';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';
import { formatNumber, formatRelativeTime } from '@/lib/utils/formatters';
import type { InstagramAccount } from '@/types/instagram';

export default function InstagramAccountsPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await instagramService.getAccounts();
      setAccounts(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load Instagram accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectAccount = () => {
    const authUrl = instagramService.getAuthUrl();
    window.location.href = authUrl;
  };

  const handleRefreshAccount = async (accountId: string) => {
    try {
      setRefreshingIds((prev) => new Set(prev).add(accountId));
      const updatedAccount = await instagramService.refreshAccount(accountId);
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? updatedAccount : acc))
      );
      success('Account refreshed successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to refresh account');
    } finally {
      setRefreshingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(accountId);
        return newSet;
      });
    }
  };

  const handleDisconnectAccount = async (account: InstagramAccount) => {
    if (!confirm(`Are you sure you want to disconnect @${account.username}?`)) {
      return;
    }

    try {
      await instagramService.disconnectAccount(account.id);
      setAccounts((prev) => prev.filter((acc) => acc.id !== account.id));
      success('Account disconnected successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to disconnect account');
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Instagram Accounts"
          description="Manage your connected Instagram business accounts"
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader
          title="Instagram Accounts"
          description="Manage your connected Instagram business accounts"
        />
        <EmptyState
          icon={InstagramIcon}
          title="No Instagram accounts connected"
          description="Connect your Instagram business account to start managing messages and products"
          action={{
            label: 'Connect Instagram Account',
            onClick: handleConnectAccount,
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Instagram Accounts"
        description="Manage your connected Instagram business accounts"
        action={
          <button
            onClick={handleConnectAccount}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Connect Account
          </button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <InstagramAccountCard
            key={account.id}
            account={account}
            isRefreshing={refreshingIds.has(account.id)}
            onRefresh={() => handleRefreshAccount(account.id)}
            onDisconnect={() => handleDisconnectAccount(account)}
          />
        ))}
      </div>
    </div>
  );
}

interface InstagramAccountCardProps {
  account: InstagramAccount;
  isRefreshing: boolean;
  onRefresh: () => void;
  onDisconnect: () => void;
}

function InstagramAccountCard({
  account,
  isRefreshing,
  onRefresh,
  onDisconnect,
}: InstagramAccountCardProps) {
  const getStatusConfig = (status: InstagramAccount['status']) => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle2,
          text: 'Active',
          className: 'bg-green-100 text-green-700',
          iconClassName: 'text-green-500',
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error',
          className: 'bg-red-100 text-red-700',
          iconClassName: 'text-red-500',
        };
      case 'refreshing':
        return {
          icon: RefreshCw,
          text: 'Refreshing',
          className: 'bg-blue-100 text-blue-700',
          iconClassName: 'text-blue-500 animate-spin',
        };
      default:
        return {
          icon: AlertCircle,
          text: 'Disconnected',
          className: 'bg-gray-100 text-gray-700',
          iconClassName: 'text-gray-500',
        };
    }
  };

  const statusConfig = getStatusConfig(account.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-lg">
      {/* Gradient Background */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-purple-500 to-pink-500" />

      {/* Content */}
      <div className="relative p-6">
        {/* Profile Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img
              src={account.profilePictureUrl}
              alt={account.username}
              className="h-16 w-16 rounded-full border-4 border-white shadow-lg"
            />
            <div>
              <h3 className="text-lg font-semibold text-white">
                {account.fullName}
              </h3>
              <a
                href={`https://instagram.com/${account.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-white/90 hover:text-white"
              >
                @{account.username}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
              statusConfig.className
            )}
          >
            <StatusIcon className={cn('h-3 w-3', statusConfig.iconClassName)} />
            {statusConfig.text}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <ImageIcon className="h-4 w-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(account.mediaCount)}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-600">Posts</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(account.followersCount)}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-600">Followers</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(account.followingCount)}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-600">Following</p>
          </div>
        </div>

        {/* Biography */}
        {account.biography && (
          <p className="mt-4 line-clamp-2 text-sm text-gray-600">
            {account.biography}
          </p>
        )}

        {/* Last Sync */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>Last synced {formatRelativeTime(account.lastSyncAt)}</span>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={onDisconnect}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4. Instagram OAuth Callback Page

#### src/app/auth/instagram/callback/page.tsx
```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { instagramService } from '@/lib/services/instagram.service';
import { useToast } from '@/lib/hooks/useToast';

export default function InstagramCallbackPage() {
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
```

### 5. Account Selector Component

#### src/components/instagram/AccountSelector.tsx
```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { instagramService } from '@/lib/services/instagram.service';
import { cn } from '@/lib/utils/cn';
import type { InstagramAccount } from '@/types/instagram';

interface AccountSelectorProps {
  selectedAccountId?: string;
  onSelect: (accountId: string) => void;
  className?: string;
}

export function AccountSelector({
  selectedAccountId,
  onSelect,
  className,
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await instagramService.getAccounts();
      setAccounts(data.filter((acc) => acc.status === 'active'));

      // Auto-select first account if none selected
      if (!selectedAccountId && data.length > 0) {
        onSelect(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

  if (isLoading) {
    return (
      <div className={cn('h-10 w-48 animate-pulse rounded-lg bg-gray-200', className)} />
    );
  }

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {selectedAccount ? (
          <div className="flex items-center gap-2">
            <img
              src={selectedAccount.profilePictureUrl}
              alt={selectedAccount.username}
              className="h-6 w-6 rounded-full"
            />
            <span>@{selectedAccount.username}</span>
          </div>
        ) : (
          <span>Select account</span>
        )}
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  onSelect(account.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={account.profilePictureUrl}
                    alt={account.username}
                    className="h-6 w-6 rounded-full"
                  />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">@{account.username}</p>
                    <p className="text-xs text-gray-600">{account.fullName}</p>
                  </div>
                </div>
                {account.id === selectedAccountId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

### 6. Account Status Badge Component

#### src/components/instagram/AccountStatusBadge.tsx
```typescript
import React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { InstagramAccount } from '@/types/instagram';

interface AccountStatusBadgeProps {
  status: InstagramAccount['status'];
  className?: string;
}

export function AccountStatusBadge({ status, className }: AccountStatusBadgeProps) {
  const config = {
    active: {
      icon: CheckCircle2,
      text: 'Active',
      className: 'bg-green-100 text-green-700',
      iconClassName: 'text-green-500',
    },
    error: {
      icon: AlertCircle,
      text: 'Error',
      className: 'bg-red-100 text-red-700',
      iconClassName: 'text-red-500',
    },
    refreshing: {
      icon: RefreshCw,
      text: 'Refreshing',
      className: 'bg-blue-100 text-blue-700',
      iconClassName: 'text-blue-500 animate-spin',
    },
    disconnected: {
      icon: AlertCircle,
      text: 'Disconnected',
      className: 'bg-gray-100 text-gray-700',
      iconClassName: 'text-gray-500',
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        config.className,
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', config.iconClassName)} />
      {config.text}
    </div>
  );
}
```

## Testing Strategy

### Unit Tests
```typescript
// src/lib/services/__tests__/instagram.service.test.ts
import { instagramService } from '../instagram.service';

describe('Instagram Service', () => {
  it('fetches accounts successfully', async () => {
    const accounts = await instagramService.getAccounts();
    expect(Array.isArray(accounts)).toBe(true);
  });

  it('generates valid auth URL', () => {
    const url = instagramService.getAuthUrl();
    expect(url).toContain('api.instagram.com/oauth/authorize');
  });
});
```

### Integration Tests
```typescript
// src/app/(dashboard)/instagram/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import InstagramAccountsPage from '../page';

describe('Instagram Accounts Page', () => {
  it('shows empty state when no accounts', async () => {
    render(<InstagramAccountsPage />);
    await waitFor(() => {
      expect(screen.getByText(/No Instagram accounts/i)).toBeInTheDocument();
    });
  });
});
```

## Acceptance Criteria

### Functional Requirements
1. ✅ Instagram accounts list renders
2. ✅ Connect account button works
3. ✅ OAuth flow redirects correctly
4. ✅ Account card displays profile info
5. ✅ Follower count displays
6. ✅ Status badge shows correctly
7. ✅ Refresh account works
8. ✅ Disconnect account works
9. ✅ Empty state shows when no accounts
10. ✅ Loading state displays
11. ✅ Error handling works
12. ✅ OAuth callback handles errors
13. ✅ State parameter validates
14. ✅ Account selector works
15. ✅ Profile picture displays
16. ✅ Last sync time shows
17. ✅ External link works
18. ✅ Responsive design
19. ✅ Toast notifications work
20. ✅ Multiple accounts supported

### Non-Functional Requirements
1. ✅ Secure OAuth flow
2. ✅ CSRF protection
3. ✅ Fast page load
4. ✅ Smooth animations
5. ✅ Accessible components

## Definition of Done

- [ ] Instagram accounts page created
- [ ] OAuth flow implemented
- [ ] Account cards designed
- [ ] Refresh functionality working
- [ ] Disconnect functionality working
- [ ] Account selector component created
- [ ] Status badges implemented
- [ ] Empty state created
- [ ] Loading states working
- [ ] Error handling complete
- [ ] Tests written
- [ ] Code reviewed
- [ ] Responsive design verified

## Related Tasks

- FE-001: Next.js Project Initialization (Dependency)
- FE-002: Authentication Pages (Dependency)
- FE-003: Dashboard Layout (Dependency)
- IG-004: Instagram OAuth Implementation
- FE-005: Direct Messages Inbox

## Estimated Time

- Instagram Accounts Page: 5 hours
- OAuth Callback: 3 hours
- Account Card Component: 3 hours
- Account Selector: 2 hours
- Status Components: 2 hours
- API Integration: 3 hours
- Testing: 3 hours
- **Total: 21 hours**
