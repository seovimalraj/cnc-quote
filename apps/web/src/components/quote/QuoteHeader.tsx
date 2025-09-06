'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  CubeIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  UserCircleIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'

interface QuoteHeaderProps {
  user: any
  onShowPricing: () => void
  isMobile: boolean
}

export const QuoteHeader = ({ user, onShowPricing, isMobile }: QuoteHeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* Logo and Title */}
      <div className="flex items-center space-x-4">
        <CubeIcon className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Instant Quote</h1>
          <p className="text-sm text-gray-500">CNC • Sheet Metal • Injection Molding</p>
        </div>
      </div>

      {/* Desktop Actions */}
      {!isMobile && (
        <div className="flex items-center space-x-4">
          {/* Organization Switcher */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Org:</span>
            <select className="text-sm border border-gray-300 rounded px-2 py-1">
              <option>Default Organization</option>
            </select>
          </div>

          {/* Help */}
          <Button variant="ghost" size="sm">
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="sm">
            <BellIcon className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            {user ? (
              <>
                <UserCircleIcon className="h-6 w-6 text-gray-400" />
                <span className="text-sm text-gray-700">{user.name}</span>
              </>
            ) : (
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Actions */}
      {isMobile && (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onShowPricing}>
            View Price
          </Button>
          <Button variant="ghost" size="sm">
            <Bars3Icon className="h-5 w-5" />
          </Button>
        </div>
      )}
    </header>
  )
}
