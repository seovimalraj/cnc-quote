"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppHeader from '@/layout/AppHeader';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Users, 
  Building2, 
  TruckIcon,
  BarChart3,
  FileCheck,
  Package,
  Settings,
  Wrench,
  Database,
  Factory,
  Gauge,
  Palette,
  DollarSign,
  Award,
  Shield,
  UsersRound,
  Key,
  Webhook,
  Clipboard,
  MessageSquare
} from 'lucide-react';

interface AdminLayoutProps { 
  readonly children: React.ReactNode 
}

const navigationGroups = [
  {
    name: 'Main',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Quotes', href: '/admin/quotes', icon: FileText },
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'RFQs & Bids', href: '/admin/rfqs', icon: Clipboard },
      { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
      { label: 'Customers', href: '/admin/customers', icon: Users },
      { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
      { label: 'Suppliers', href: '/admin/suppliers', icon: TruckIcon },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { label: 'Invoices', href: '/admin/invoices', icon: FileCheck },
      { label: 'Shipments', href: '/admin/shipments', icon: Package },
    ]
  },
  {
    name: 'Catalog',
    items: [
      { label: 'Materials', href: '/admin/catalog/materials', icon: Database },
      { label: 'Machines', href: '/admin/machines', icon: Factory },
      { label: 'Capacity', href: '/admin/capacity', icon: Gauge },
      { label: 'Finishes', href: '/admin/catalog/finishes', icon: Palette },
      { label: 'Pricing Engine', href: '/admin/pricing', icon: DollarSign },
      { label: 'Certifications', href: '/admin/catalog/certifications', icon: Award },
    ]
  },
  {
    name: 'Settings',
    items: [
      { label: 'Organization', href: '/admin/settings/organization', icon: Shield },
      { label: 'Team', href: '/admin/settings/team', icon: UsersRound },
      { label: 'API Keys', href: '/admin/settings/api-keys', icon: Key },
      { label: 'Webhooks', href: '/admin/settings/webhooks', icon: Webhook },
    ]
  }
];

export default function AdminLayout({ children }: Readonly<AdminLayoutProps>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
      {/* Sidebar */}
      <aside className={cn(
        'bg-white/80 backdrop-blur-xl dark:bg-gray-900/80 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col w-64 shrink-0 transition-all duration-300 shadow-xl',
        open ? 'translate-x-0' : '-translate-x-64 lg:translate-x-0'
      )}>
        {/* Header */}
        <div className="h-16 flex items-center px-6 font-bold text-lg tracking-tight border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-slate-700 to-gray-800 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <Settings size={24} className="animate-pulse" />
            <span>Admin Panel</span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 text-sm scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          {navigationGroups.map((group, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="px-6 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {group.name}
              </h3>
              <ul className="space-y-1 px-3">
                {group.items.map(item => {
                  const active = pathname === item.href || (pathname?.startsWith(item.href + '/') && item.href !== '/admin') || (item.href === '/admin' && pathname === '/admin');
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link 
                        href={item.href} 
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-4 py-2.5 font-medium transition-all duration-200',
                          active 
                            ? 'bg-gradient-to-r from-slate-700 to-gray-800 text-white shadow-lg shadow-slate-500/30' 
                            : 'text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800/50 hover:shadow-md'
                        )}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
          <p className="font-semibold">&copy; {new Date().getFullYear()} Frigate CNC</p>
          <p className="mt-2 space-x-2">
            <Link href="/legal/privacy" className="hover:text-slate-700 transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/legal/terms" className="hover:text-slate-700 transition-colors">Terms</Link>
          </p>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
      
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setOpen(o => !o)} 
        className="fixed bottom-6 left-6 z-50 rounded-full bg-gradient-to-r from-slate-700 to-gray-800 text-white shadow-2xl px-6 py-3 lg:hidden hover:shadow-slate-500/50 transition-all duration-300 hover:scale-105 font-medium"
      >
        {open ? 'Close' : 'Menu'}
      </button>
    </div>
  );
}