'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUIStore } from '@/lib/store/uiStore';

export function Header() {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useUIStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 inline-flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Social Selling</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            <button className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground">
              <Bell className="h-5 w-5" />
            </button>

            <div className="relative group">
              <button className="inline-flex items-center justify-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground">
                <User className="h-5 w-5" />
              </button>

              <div className="absolute right-0 mt-2 w-48 rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {user?.email}
                  </div>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm hover:bg-accent"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
