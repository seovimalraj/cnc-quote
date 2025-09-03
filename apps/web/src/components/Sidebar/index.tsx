'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  CubeIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BuildingOffice2Icon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ href, icon: Icon, label, isActive, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    className={`relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
      isActive && '!bg-graydark dark:!bg-meta-4'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </Link>
);

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const pathname = usePathname();

  const menuItems = [
    { href: '/', icon: HomeIcon, label: 'Dashboard' },
    { href: '/widget', icon: CubeIcon, label: 'Quote Widget' },
    { href: '/portal', icon: DocumentTextIcon, label: 'Customer Portal' },
    { href: '/admin', icon: BuildingOffice2Icon, label: 'Admin Panel' },
    { href: '/admin/quotes', icon: ClipboardDocumentListIcon, label: 'Quotes Management' },
    { href: '/admin/catalog', icon: ChartBarIcon, label: 'Catalog Management' },
    { href: '/admin/users', icon: UserGroupIcon, label: 'User Management' },
    { href: '/admin/settings', icon: CogIcon, label: 'Settings' },
  ];

  return (
    <>
      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`absolute left-0 top-0 z-30 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
          <Link href="/">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CubeIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CNC Quote</span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="block lg:hidden"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Sidebar Menu */}
        <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
          <nav className="mt-5 py-4 px-4 lg:mt-9 lg:px-6">
            <div>
              <h3 className="mb-4 ml-4 text-sm font-semibold text-bodydark2">MENU</h3>
              <ul className="mb-6 flex flex-col gap-1.5">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <SidebarLink
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      isActive={pathname === item.href}
                      onClick={() => setSidebarOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 ml-4 text-sm font-semibold text-bodydark2">OTHERS</h3>
              <ul className="mb-6 flex flex-col gap-1.5">
                <li>
                  <SidebarLink
                    href="/auth/signin"
                    icon={ArrowLeftOnRectangleIcon}
                    label="Authentication"
                    isActive={pathname.startsWith('/auth')}
                    onClick={() => setSidebarOpen(false)}
                  />
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
