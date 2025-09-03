'use client';

import Link from 'next/link';
import { 
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  return (
    <header className="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          {/* Hamburger Toggle BTN */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="z-99999 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden"
          >
            <Bars3Icon className="w-5.5 h-5.5" />
          </button>

          <Link className="block flex-shrink-0 lg:hidden" href="/">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-lg font-bold text-black dark:text-white">CNC Quote</span>
            </div>
          </Link>
        </div>

        <div className="hidden sm:block">
          <form action="https://formbold.com/s/unique_form_id" method="POST">
            <div className="relative">
              <button className="absolute left-0 top-1/2 -translate-y-1/2">
                <MagnifyingGlassIcon className="w-5 h-5 text-body hover:text-primary dark:text-bodydark dark:hover:text-primary" />
              </button>

              <input
                type="text"
                placeholder="Type to search..."
                className="w-full bg-transparent pl-9 pr-4 text-black focus:outline-none dark:text-white xl:w-125"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            {/* Search */}
            <li className="block sm:hidden">
              <button className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-3">
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
            </li>

            {/* Notification Menu Area */}
            <li className="relative">
              <button className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white">
                <span className="absolute -top-0.5 -right-0.5 z-1 h-2 w-2 rounded-full bg-meta-1">
                  <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
                </span>
                <BellIcon className="w-4 h-4" />
              </button>
            </li>

            {/* Chat Notification Area */}
            <li className="relative">
              <button className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white">
                <span className="absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1">
                  <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
                </span>
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
              </button>
            </li>
          </ul>

          {/* User Area */}
          <div className="relative">
            <Link
              className="flex items-center gap-4"
              href="/profile"
            >
              <span className="hidden text-right lg:block">
                <span className="block text-sm font-medium text-black dark:text-white">
                  Thomas Anree
                </span>
                <span className="block text-xs">UX Designer</span>
              </span>

              <span className="h-12 w-12 rounded-full">
                <UserCircleIcon className="w-12 h-12 text-gray-400" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
