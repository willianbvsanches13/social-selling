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
            <button className="rounded-lg border border-gray-300 p-4 text-left hover:bg-gray-50 transition-colors">
              <h3 className="font-medium text-gray-900">Add New Product</h3>
              <p className="mt-1 text-sm text-gray-600">
                Add a new product to your catalog
              </p>
            </button>
            <button className="rounded-lg border border-gray-300 p-4 text-left hover:bg-gray-50 transition-colors">
              <h3 className="font-medium text-gray-900">Connect Instagram</h3>
              <p className="mt-1 text-sm text-gray-600">
                Link your Instagram business account
              </p>
            </button>
            <button className="rounded-lg border border-gray-300 p-4 text-left hover:bg-gray-50 transition-colors">
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
