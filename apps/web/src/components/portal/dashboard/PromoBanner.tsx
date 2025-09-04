'use client'

import { useState } from 'react'
import { XMarkIcon, TagIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { posthog } from 'posthog-js'

interface Promotion {
  id: string
  variant: 'informational' | 'discount' | 'warning'
  title: string
  subtitle?: string
  code?: string
  cta_label?: string
  dismissible: boolean
}

interface PromoBannerProps {
  promotion: Promotion
}

export function PromoBanner({ promotion }: PromoBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isApplying, setIsApplying] = useState(false)

  if (!isVisible) return null

  const handleApplyCode = async () => {
    if (!promotion.code) return

    setIsApplying(true)
    posthog.capture('promo_apply_clicked', {
      promo_id: promotion.id,
      code: promotion.code
    })

    try {
      // In a real implementation, this would call the API
      // await fetch(`/api/quotes/${quoteId}/apply-promo`, {
      //   method: 'PUT',
      //   body: JSON.stringify({ code: promotion.code })
      // })

      // For now, just show success
      alert(`Code ${promotion.code} applied successfully!`)
    } catch (error) {
      console.error('Error applying promo code:', error)
    } finally {
      setIsApplying(false)
    }
  }

  const handleDismiss = async () => {
    posthog.capture('promo_dismissed', { promo_id: promotion.id })

    try {
      // Store dismissal in localStorage as fallback
      localStorage.setItem(`promo_dismissed_${promotion.id}`, 'true')

      // In a real implementation, this would call the API
      // await fetch(`/api/portal/promotions/${promotion.id}/dismiss`, {
      //   method: 'POST'
      // })
    } catch (error) {
      console.error('Error dismissing promotion:', error)
    }

    setIsVisible(false)
  }

  const getVariantStyles = () => {
    switch (promotion.variant) {
      case 'discount':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white'
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
      case 'informational':
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
    }
  }

  return (
    <div className={`rounded-lg p-6 ${getVariantStyles()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TagIcon className="w-6 h-6" />
          <div>
            <h3 className="text-lg font-semibold">{promotion.title}</h3>
            {promotion.subtitle && (
              <p className="text-sm opacity-90 mt-1">{promotion.subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {promotion.code && promotion.cta_label && (
            <Button
              onClick={handleApplyCode}
              disabled={isApplying}
              variant="secondary"
              size="sm"
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              {isApplying ? 'Applying...' : promotion.cta_label}
            </Button>
          )}

          {promotion.dismissible && (
            <button
              onClick={handleDismiss}
              className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded-md p-1"
              aria-label="Dismiss promotion"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {promotion.code && (
        <div className="mt-4 flex items-center space-x-2">
          <span className="text-sm font-medium">Code:</span>
          <code className="bg-white bg-opacity-20 px-2 py-1 rounded text-sm font-mono">
            {promotion.code}
          </code>
        </div>
      )}
    </div>
  )
}
