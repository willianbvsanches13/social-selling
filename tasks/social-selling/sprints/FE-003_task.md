# FE-003: Dashboard Layout

**Epic:** Frontend Development - Social Selling Platform
**Sprint:** Sprint 2 - Frontend Foundation
**Story Points:** 8
**Priority:** High
**Assigned To:** Frontend Team
**Status:** Ready for Development
**Dependencies:** FE-001, FE-002

## Overview

Create a comprehensive dashboard layout with responsive sidebar navigation, top bar with user menu and notifications, breadcrumbs, loading states, empty states, and skeleton screens. This layout will be the foundation for all authenticated pages.

## Technical Requirements

### Features
- Main dashboard layout with collapsible sidebar
- Responsive navigation menu (mobile + desktop)
- Top bar with user menu, notifications, and search
- Breadcrumbs navigation
- Loading skeletons
- Empty state components
- Mobile-friendly hamburger menu
- Dark mode support (foundation)

## Implementation Details

### 1. Dashboard Layout Component

#### src/app/(dashboard)/layout.tsx
```typescript
'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { useUIStore } from '@/lib/store/uiStore';
import { cn } from '@/lib/utils/cn';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useUIStore();

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />

          <main
            className={cn(
              'flex-1 overflow-y-auto transition-all duration-300',
              sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
            )}
          >
            <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => useUIStore.getState().setSidebarOpen(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
```

### 2. Enhanced Header Component

#### src/components/layout/Header.tsx
```typescript
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu,
  Bell,
  User,
  LogOut,
  Settings,
  Search,
  Moon,
  Sun,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUIStore } from '@/lib/store/uiStore';
import { cn } from '@/lib/utils/cn';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function Header() {
  const { user, logout } = useAuth();
  const { toggleSidebar, theme, setTheme } = useUIStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock notifications - replace with real data
  const notifications: Notification[] = [
    {
      id: '1',
      title: 'New Message',
      message: 'You have a new message from customer',
      time: '5 min ago',
      read: false,
      type: 'info',
    },
    {
      id: '2',
      title: 'Order Placed',
      message: 'Customer placed an order for Product X',
      time: '1 hour ago',
      read: false,
      type: 'success',
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>

          {/* Search Bar */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="block w-64 rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5 text-gray-600" />
            ) : (
              <Sun className="h-5 w-5 text-gray-600" />
            )}
          </button>

          {/* Help */}
          <Link
            href="/help"
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5 text-gray-600" />
          </Link>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-lg p-2 hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="border-b p-4">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            'border-b p-4 hover:bg-gray-50 cursor-pointer',
                            !notification.read && 'bg-blue-50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'mt-1 h-2 w-2 rounded-full',
                                notification.type === 'success' && 'bg-green-500',
                                notification.type === 'error' && 'bg-red-500',
                                notification.type === 'warning' && 'bg-yellow-500',
                                notification.type === 'info' && 'bg-blue-500'
                              )}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {notification.message}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {notification.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-sm text-gray-500">
                        No notifications
                      </div>
                    )}
                  </div>
                  <div className="border-t p-3">
                    <Link
                      href="/notifications"
                      className="block text-center text-sm font-medium text-primary hover:text-primary-700"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.firstName}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </div>
              )}
              <span className="hidden text-sm font-medium text-gray-700 lg:block">
                {user?.firstName} {user?.lastName}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="border-b p-4">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
```

### 3. Enhanced Sidebar Component

#### src/components/layout/Sidebar.tsx
```typescript
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  BarChart3,
  Package,
  Settings,
  Instagram,
  Users,
  Tags,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUIStore } from '@/lib/store/uiStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare, badge: 5 },
  { name: 'Instagram', href: '/instagram', icon: Instagram },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  {
    name: 'Products',
    href: '/products',
    icon: Package,
    children: [
      { name: 'All Products', href: '/products', icon: Package },
      { name: 'Categories', href: '/products/categories', icon: Tags },
    ],
  },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-white transition-transform duration-300 ease-in-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
            <Instagram className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Social Selling</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpand(item.name)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-transform',
                      expandedItems.includes(item.name) && 'rotate-90'
                    )}
                  />
                </button>
                {expandedItems.includes(item.name) && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive(child.href)
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <child.icon className="h-4 w-4" />
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary to-purple-600 p-4 text-white">
          <h4 className="font-semibold">Upgrade to Pro</h4>
          <p className="mt-1 text-sm opacity-90">
            Get unlimited access to all features
          </p>
          <button className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-gray-100">
            Upgrade Now
          </button>
        </div>
      </div>
    </aside>
  );
}
```

### 4. Breadcrumbs Component

#### src/components/common/Breadcrumbs.tsx
```typescript
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbs = React.useMemo(() => {
    if (items) return items;

    const paths = pathname?.split('/').filter(Boolean) || [];
    return paths.map((path, index) => ({
      label: path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '),
      href: '/' + paths.slice(0, index + 1).join('/'),
    }));
  }, [pathname, items]);

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)} aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="flex items-center text-gray-500 hover:text-gray-700"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.href}>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-gray-900">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-gray-500 hover:text-gray-700"
            >
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
```

### 5. Loading Skeleton Components

#### src/components/common/Skeleton.tsx
```typescript
import React from 'react';
import { cn } from '@/lib/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-white p-6">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="mt-4 h-20 w-full" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="border-b p-4">
        <Skeleton className="h-6 w-1/4" />
      </div>
      <div className="divide-y">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border bg-white p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 6. Empty State Component

#### src/components/common/EmptyState.tsx
```typescript
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <Icon className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-gray-600">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

### 7. Page Header Component

#### src/components/common/PageHeader.tsx
```typescript
import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href: string }>;
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-4" />}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          )}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    </div>
  );
}
```

### 8. Stats Card Component

#### src/components/common/StatsCard.tsx
```typescript
import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          {trend.direction === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend.value}%
          </span>
          <span className="text-sm text-gray-600">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
```

### 9. Dashboard Home Page

#### src/app/(dashboard)/dashboard/page.tsx
```typescript
'use client';

import React from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { MessageSquare, Package, TrendingUp, Users } from 'lucide-react';

export default function DashboardPage() {
  const stats = [
    {
      title: 'Total Messages',
      value: '1,234',
      icon: MessageSquare,
      trend: { value: 12.5, label: 'from last month', direction: 'up' as const },
    },
    {
      title: 'Products',
      value: '45',
      icon: Package,
      trend: { value: 5.2, label: 'from last month', direction: 'up' as const },
    },
    {
      title: 'Conversion Rate',
      value: '23.5%',
      icon: TrendingUp,
      trend: { value: 3.1, label: 'from last month', direction: 'down' as const },
    },
    {
      title: 'Total Customers',
      value: '892',
      icon: Users,
      trend: { value: 8.7, label: 'from last month', direction: 'up' as const },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening with your business today."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <div className="mt-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    New message from customer
                  </p>
                  <p className="text-xs text-gray-600">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid gap-3">
            <button className="rounded-lg border border-gray-300 p-4 text-left hover:bg-gray-50">
              <h3 className="font-medium text-gray-900">Add New Product</h3>
              <p className="mt-1 text-sm text-gray-600">
                Add a new product to your catalog
              </p>
            </button>
            <button className="rounded-lg border border-gray-300 p-4 text-left hover:bg-gray-50">
              <h3 className="font-medium text-gray-900">Connect Instagram</h3>
              <p className="mt-1 text-sm text-gray-600">
                Link your Instagram business account
              </p>
            </button>
            <button className="rounded-lg border border-gray-300 p-4 text-left hover:bg-gray-50">
              <h3 className="font-medium text-gray-900">View Analytics</h3>
              <p className="mt-1 text-sm text-gray-600">
                Check your performance metrics
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 10. Loading Component

#### src/app/(dashboard)/loading.tsx
```typescript
import { SkeletonCard } from '@/components/common/Skeleton';

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
```

## Testing Strategy

### Component Tests
```typescript
// src/components/layout/__tests__/Sidebar.test.tsx
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    // Test implementation
  });
});
```

## Acceptance Criteria

### Functional Requirements
1. ✅ Dashboard layout renders correctly
2. ✅ Sidebar navigation works
3. ✅ Sidebar collapses on mobile
4. ✅ Header displays user info
5. ✅ Notifications dropdown works
6. ✅ User menu dropdown works
7. ✅ Breadcrumbs auto-generate from route
8. ✅ Theme toggle works
9. ✅ Search bar functions
10. ✅ Loading skeletons display
11. ✅ Empty states show correctly
12. ✅ Stats cards display data
13. ✅ Page header component works
14. ✅ Mobile menu works
15. ✅ Active route highlighted
16. ✅ Logout functionality works
17. ✅ Responsive on all screen sizes
18. ✅ Navigation items expandable
19. ✅ Badge counts display
20. ✅ Footer displays correctly

### Non-Functional Requirements
1. ✅ Smooth animations
2. ✅ Accessible navigation
3. ✅ Fast page transitions
4. ✅ SEO-friendly markup
5. ✅ Clean component structure

## Definition of Done

- [ ] All layout components created
- [ ] Responsive design implemented
- [ ] Loading states working
- [ ] Empty states created
- [ ] Navigation functional
- [ ] Component tests written
- [ ] Code reviewed
- [ ] Accessibility verified
- [ ] Mobile tested

## Related Tasks

- FE-001: Next.js Project Initialization (Dependency)
- FE-002: Authentication Pages (Dependency)
- FE-004: Instagram Accounts Page
- FE-005: Direct Messages Inbox
- FE-006: Product Catalog Management

## Estimated Time

- Layout Structure: 4 hours
- Header Component: 3 hours
- Sidebar Component: 3 hours
- Common Components: 4 hours
- Dashboard Page: 2 hours
- Responsive Design: 3 hours
- Testing: 3 hours
- **Total: 22 hours**
