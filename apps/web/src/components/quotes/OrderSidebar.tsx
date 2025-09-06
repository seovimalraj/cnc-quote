'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuote } from '@/components/providers/QuoteProvider'
import { posthog } from 'posthog-js'

interface OrderSidebarProps {}

export function OrderSidebar({}: OrderSidebarProps) {
  const { quote, isLoading, hasBlockers } = useQuote()
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false)

  const handleContinueToCheckout = async () => {
    if (!quote?.selected_lead_option_id || hasBlockers) {
      return
    }

    setIsCreatingCheckout(true)

    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quote.id,
          currency: quote.currency,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()

      posthog.capture('checkout_started', {
        quote_id: quote.id,
        currency: quote.currency,
        subtotal: quote.subtotal,
      })

      // Redirect to payment processor
      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      setIsCreatingCheckout(false)
    }
  }

  const isCheckoutEnabled = quote?.selected_lead_option_id && !hasBlockers && !isCreatingCheckout

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Subtotal Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subtotal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">
            ${quote?.subtotal?.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {quote?.currency || 'USD'}
          </div>
        </CardContent>
      </Card>

      {/* CTA Card */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Button
              onClick={handleContinueToCheckout}
              disabled={!isCheckoutEnabled}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
            >
              {isCreatingCheckout ? 'Creating Checkout...' : 'Continue to Checkout'}
            </Button>

            {!quote?.selected_lead_option_id && (
              <div className="text-sm text-amber-600 text-center">
                Please select a lead time option to continue
              </div>
            )}

            {hasBlockers && (
              <div className="text-sm text-red-600 text-center">
                Please resolve DFM issues before checkout
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="text-xs text-gray-500 space-y-2">
        <div>• Secure payment processing</div>
        <div>• Instant order confirmation</div>
        <div>• Production starts immediately</div>
      </div>
    </div>
  )
}
