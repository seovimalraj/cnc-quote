"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppHeader from '@/layout/AppHeader';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Factory,
  TrendingUp,
  Settings,
  FileText,
  Users,
  Calendar,
  Clipboard,
  MessageSquare,
  Award,
  Palette
} from 'lucide-react';

interface SupplierLayoutProps {
  readonly children: React.ReactNode;
}

const primaryNav = [
  { 
    label: 'Dashboard', 
    href: '/supplier/dashboard',
    icon: LayoutDashboard 
  },
  { 
    label: 'RFQs', 
    href: '/supplier/rfqs',
    icon: Clipboard 
  },
  { 
    label: 'Orders', 
    href: '/supplier/orders',
    icon: Package 
  },
  { 
    label: 'Messages', 
    href: '/supplier/messages',
    icon: MessageSquare 
  },
  { 
    label: 'Capacity', 
    href: '/supplier/capacity',
    icon: Factory 
  },
  { 
    label: 'Certifications', 
    href: '/supplier/certifications',
    icon: Award 
  },
  { 
    label: 'Finishes', 
    href: '/supplier/finishes',
    icon: Palette 
  },
  { 
    label: 'Inventory', 
    href: '/supplier/inventory',
    icon: FileText 
  },
  { 
    label: 'Analytics', 
    href: '/supplier/analytics',
    icon: TrendingUp 
  },
  { 
    label: 'Schedule', 
    href: '/supplier/schedule',
    icon: Calendar 
  },
  { 
    label: 'Settings', 
    href: '/supplier/settings',
    icon: Settings 
  },
];

export default function SupplierLayout({ children }: Readonly<SupplierLayoutProps>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-gray-950 dark:via-emerald-950 dark:to-teal-950">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-white/80 backdrop-blur-xl dark:bg-gray-900/80 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col w-64 shrink-0 transition-all duration-300 shadow-xl',
          open ? 'translate-x-0' : '-translate-x-64 lg:translate-x-0'
        )}
      >
        <div className="h-16 flex items-center px-6 font-bold text-lg tracking-tight border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-emerald-600 to-teal-600">
          <Link href="/supplier/dashboard" className="text-white flex items-center gap-2">
            <Factory size={24} />
            <span>Frigate Fast Sourcing</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 text-sm scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          <ul className="space-y-1 px-3">
            {primaryNav.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-4 py-2.5 font-medium transition-all duration-200',
                      active
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800/50 hover:shadow-md'
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
          <p className="font-semibold">&copy; {new Date().getFullYear()} CNC Quote</p>
          <p className="mt-2 space-x-2">
            <Link href="/legal/privacy" className="hover:text-emerald-600 transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/legal/terms" className="hover:text-emerald-600 transition-colors">
              Terms
            </Link>
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Mobile menu toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 left-6 z-50 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl px-6 py-3 lg:hidden hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 font-medium"
      >
        {open ? 'Close' : 'Menu'}
      </button>
    </div>
  );
}
