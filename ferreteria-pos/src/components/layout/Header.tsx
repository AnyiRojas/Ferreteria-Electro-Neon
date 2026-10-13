'use client';

import { Menu, Bell, Search } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 shadow-sm">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-gray-800 lg:text-xl">
        {title}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <button className="hidden rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 sm:flex">
          <Search className="h-5 w-5" />
        </button>
        <button className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
        </button>
        <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}
