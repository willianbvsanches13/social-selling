import React from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { InstagramAccount } from '@/types/instagram';

interface AccountStatusBadgeProps {
  status: InstagramAccount['status'];
  className?: string;
}

export function AccountStatusBadge({ status, className }: AccountStatusBadgeProps) {
  const configMap = {
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
    token_expired: {
      icon: AlertCircle,
      text: 'Token Expired',
      className: 'bg-yellow-100 text-yellow-700',
      iconClassName: 'text-yellow-500',
    },
    disconnected: {
      icon: AlertCircle,
      text: 'Disconnected',
      className: 'bg-gray-100 text-gray-700',
      iconClassName: 'text-gray-500',
    },
  };

  const config = configMap[status] || configMap.disconnected;
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
