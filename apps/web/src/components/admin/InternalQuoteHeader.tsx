'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInternalQuote } from '@/components/providers/InternalQuoteProvider'
import { LockClosedIcon, PaperAirplaneIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import { posthog } from 'posthog-js'

export function InternalQuoteHeader() {
  const { quote, lockPrice, sendToCustomer, isLoading } = useInternalQuote()
  const [isLocking, setIsLocking] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const handleLockPrice = async () => {
    setIsLocking(true)
    try {
      await lockPrice()
      posthog.capture('admin_lock_price', { quote_id: quote?.id })
    } catch (error) {
      console.error('Failed to lock price:', error)
    } finally {
      setIsLocking(false)
    }
  }

  const handleSendToCustomer = async () => {
    setIsSending(true)
    try {
      await sendToCustomer()
      posthog.capture('admin_send_quote', { quote_id: quote?.id })
    } catch (error) {
      console.error('Failed to send quote:', error)
    } finally {
      setIsSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800'
      case 'Analyzing': return 'bg-blue-100 text-blue-800'
      case 'Priced': return 'bg-green-100 text-green-800'
      case 'Needs_Review': return 'bg-yellow-100 text-yellow-800'
      case 'Reviewed': return 'bg-purple-100 text-purple-800'
      case 'Sent': return 'bg-indigo-100 text-indigo-800'
      case 'Accepted': return 'bg-emerald-100 text-emerald-800'
      case 'Expired': return 'bg-red-100 text-red-800'
      case 'Abandoned': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading || !quote) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="animate-pulse flex items-center space-x-2">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Left side - Quote info */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Quote {quote.id}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getStatusColor(quote.status)}>
                {quote.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-500">
                {quote.organization_id}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleLockPrice}
            disabled={isLocking}
            className="whitespace-nowrap"
          >
            <LockClosedIcon className="w-4 h-4 mr-2" />
            {isLocking ? 'Locking...' : 'Lock Price'}
          </Button>

          <Button
            onClick={handleSendToCustomer}
            disabled={isSending}
            className="whitespace-nowrap"
          >
            <PaperAirplaneIcon className="w-4 h-4 mr-2" />
            {isSending ? 'Sending...' : 'Send to Customer'}
          </Button>

          <Button variant="ghost" size="sm">
            <EllipsisVerticalIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
