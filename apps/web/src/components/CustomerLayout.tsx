"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppHeader from '@/layout/AppHeader';
import { cn } from '@/lib/utils';

interface CustomerLayoutProps { readonly children: React.ReactNode }

const primaryNav = [
  { label: 'Dashboard', href: '/portal/dashboard' },
  { label: 'Quotes', href: '/portal/quotes' },
  { label: 'Orders', href: '/portal/orders' },
  { label: 'Files', href: '/portal/files' },
  { label: 'Documents', href: '/portal/documents' },
  { label: 'Account', href: '/portal/account' },
  { label: 'Instant Quote', href: '/instant-quote' },
];

export default function CustomerLayout({ children }: Readonly<CustomerLayoutProps>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col w-60 shrink-0 transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-60 lg:translate-x-0'
      )}>
        <div className="h-14 flex items-center px-4 font-semibold text-sm tracking-wide border-b border-gray-200 dark:border-gray-800">
          <Link href="/portal/dashboard" className="text-blue-600">CNC Portal</Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 text-sm">
          <ul className="space-y-0.5 px-2">
            {primaryNav.map(i => {
              const active = pathname === i.href || pathname?.startsWith(i.href + '/');
              return (
                <li key={i.href}>
                  <Link href={i.href} className={cn('flex items-center rounded-md px-3 py-2 font-medium', active ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')}>{i.label}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} CNC Quote</p>
          <p className="mt-1"><Link href="/legal/privacy" className="hover:underline">Privacy</Link> · <Link href="/legal/terms" className="hover:underline">Terms</Link></p>
        </div>
      </aside>
      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-950">{children}</main>
      </div>
      <button onClick={() => setOpen(o=>!o)} className="fixed bottom-4 left-4 z-50 rounded-full bg-blue-600 text-white shadow-lg px-4 py-2 lg:hidden">{open? 'Close' : 'Menu'}</button>
    </div>
  );
}
