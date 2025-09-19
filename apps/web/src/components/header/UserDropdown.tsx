'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const UserDropdown = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg dark:border-gray-800 dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
        aria-label="User menu"
      >
        <Image
          width={32}
          height={32}
          className="w-8 h-8 rounded-full"
          src="/images/user/user-01.png"
          alt="User"
        />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Image
                width={40}
                height={40}
                className="w-10 h-10 rounded-full mr-3"
                src="/images/user/user-01.png"
                alt="User"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">John Doe</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">john@example.com</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Profile
            </Link>
            <Link
              href="/settings"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Settings
            </Link>
            <Link
              href="/billing"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Billing
            </Link>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <Link
              href="/logout"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Sign out
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;