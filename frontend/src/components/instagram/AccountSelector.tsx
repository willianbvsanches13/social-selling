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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    <p className="text-xs text-gray-600">{account.displayName || account.username}</p>
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
