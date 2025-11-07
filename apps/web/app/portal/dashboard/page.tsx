'use client';

import {
  TrendingUp,
  Package,
  Clock,
  DollarSign,
  FileText,
  ArrowUpRight,
  ArrowRight,
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerDashboardPage() {
  const stats = [
    {
      label: 'Active Quotes',
      value: '8',
      change: '+2 this week',
      trend: 'up',
      icon: FileText,
      color: 'blue',
      href: '/portal/quotes'
    },
    {
      label: 'Open Orders',
      value: '3',
      change: '1 in production',
      trend: 'neutral',
      icon: Package,
      color: 'green',
      href: '/portal/orders'
    },
    {
      label: 'Total Spent',
      value: '$12,450',
      change: '+15% this month',
      trend: 'up',
      icon: DollarSign,
      color: 'purple',
      href: '/portal/orders'
    },
    {
      label: 'Avg Lead Time',
      value: '5.2 days',
      change: 'On target',
      trend: 'neutral',
      icon: Clock,
      color: 'orange',
      href: '/portal/analytics'
    }
  ];

  const recentQuotes = [
    { id: 'Q-2024-001', description: 'Aluminum bracket assembly', status: 'pending_review', amount: '$245.67', date: 'Oct 25, 2024', parts: 2 },
    { id: 'Q-2024-002', description: 'Stainless steel manifold', status: 'approved', amount: '$1,234.50', date: 'Oct 22, 2024', parts: 1 },
    { id: 'Q-2024-003', description: 'Plastic prototype parts', status: 'draft', amount: '$89.30', date: 'Oct 20, 2024', parts: 5 },
    { id: 'Q-2024-004', description: 'Brass fittings', status: 'approved', amount: '$567.80', date: 'Oct 18, 2024', parts: 10 },
    { id: 'Q-2024-005', description: 'Titanium components', status: 'pending_review', amount: '$2,890.00', date: 'Oct 15, 2024', parts: 3 },
  ];

  const recentOrders = [
    { id: 'ORD-2024-001', description: 'Precision gears (x50)', status: 'in_production', amount: '$2,450.00', dueDate: 'Nov 5, 2024', progress: 65 },
    { id: 'ORD-2024-002', description: 'Custom brackets (x25)', status: 'shipped', amount: '$675.25', dueDate: 'Oct 28, 2024', progress: 100, tracking: 'UPS-1Z999AA10123456784' },
    { id: 'ORD-2024-003', description: 'Prototype housing', status: 'completed', amount: '$1,234.00', dueDate: 'Oct 15, 2024', progress: 100 },
    { id: 'ORD-2024-004', description: 'Machined shafts (x100)', status: 'in_production', amount: '$3,890.50', dueDate: 'Nov 10, 2024', progress: 40 },
    { id: 'ORD-2024-005', description: 'Anodized plates (x15)', status: 'quality_check', amount: '$890.00', dueDate: 'Oct 30, 2024', progress: 90 },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_review: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-600/20',
      approved: 'bg-green-100 text-green-700 ring-1 ring-green-600/20',
      draft: 'bg-gray-100 text-gray-700 ring-1 ring-gray-600/20',
      in_production: 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20',
      quality_check: 'bg-purple-100 text-purple-700 ring-1 ring-purple-600/20',
      shipped: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-600/20',
      completed: 'bg-green-100 text-green-700 ring-1 ring-green-600/20',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; ring: string }> = {
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', ring: 'ring-blue-500/20' },
      green: { bg: 'bg-green-500/10', text: 'text-green-600', ring: 'ring-green-500/20' },
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', ring: 'ring-purple-500/20' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', ring: 'ring-orange-500/20' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Customer Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
            Track your quotes, orders, and manufacturing progress
          </p>
        </div>
        <Link
          href="/instant-quote"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 font-semibold cursor-not-allowed opacity-75"
        >
          <ShoppingCart size={20} />
          Get New Quote
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color);
          return (
            <div
              key={stat.label}
              className="group relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-lg transition-all duration-300 overflow-hidden cursor-not-allowed opacity-90"
            >
              <div className={`absolute inset-0 ${colors.bg} opacity-0 transition-opacity duration-300`} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${colors.bg} ${colors.text} p-3 rounded-xl ring-2 ${colors.ring}`}>
                    <Icon size={24} />
                  </div>
                  <ArrowUpRight className="text-gray-400 transition-colors" size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <TrendingUp size={14} />
                    {stat.change}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={24} className="text-blue-600" />
              Recent Quotes
            </h2>
            <span className="text-blue-600 text-sm font-semibold flex items-center gap-1 cursor-not-allowed opacity-50">
              View All
              <ArrowRight size={16} />
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentQuotes.map((quote) => (
              <div
                key={quote.id}
                className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-not-allowed opacity-75"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {quote.id}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {quote.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {quote.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {quote.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{quote.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/50 dark:to-blue-950/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package size={24} className="text-green-600" />
              Recent Orders
            </h2>
            <span className="text-green-600 text-sm font-semibold flex items-center gap-1 cursor-not-allowed opacity-50">
              View All
              <ArrowRight size={16} />
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-not-allowed opacity-75"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {order.id}
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {order.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Due: {order.dueDate}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{order.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 shadow-2xl shadow-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">Need Custom Parts?</h2>
            <p className="text-blue-100">Get instant quotes for CNC machining and manufacturing</p>
          </div>
          <button
            className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-300 font-bold text-lg shadow-xl cursor-not-allowed opacity-75"
            disabled
          >
            Start New Quote
          </button>
        </div>
      </div>
    </div>
  );
}
