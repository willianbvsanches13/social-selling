'use client';

import React, { useState, useEffect } from 'react';
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
  const { success, error: showError } = useToast();
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await instagramService.getAccounts();
      setAccounts(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Instagram accounts';
      showError(errorMessage);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh account';
      showError(errorMessage);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect account';
      showError(errorMessage);
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
          description="Connect your Instagram business account to start managing messages and content"
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
                {account.displayName || account.username}
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
                {formatNumber(account.mediaCount || 0)}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-600">Posts</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(account.followerCount || 0)}
              </p>
            </div>
            <p className="mt-1 text-xs text-gray-600">Followers</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-gray-400" />
              <p className="text-lg font-bold text-gray-900">
                {formatNumber(account.followingCount || 0)}
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
        {account.lastSyncAt && (
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>Last synced {formatRelativeTime(account.lastSyncAt)}</span>
          </div>
        )}

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
