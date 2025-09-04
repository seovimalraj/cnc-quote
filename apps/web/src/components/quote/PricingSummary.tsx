'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CurrencyDollarIcon,
  ClockIcon,
  TruckIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ShareIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'
import { Part, Quote } from '@/lib/hooks/use-quote-store'

interface PricingSummaryProps {
  quote: Quote
  parts: Part[]
  isLoading: boolean
  error: string | null
  onCheckout: () => void
  onSaveQuote: () => void
  onSendForApproval: () => void
}

export const PricingSummary = ({
  quote,
  parts,
  isLoading,
  error,
  onCheckout,
  onSaveQuote,
  onSendForApproval
}: PricingSummaryProps) => {
  const leadTimeOptions = quote.pricing.leadTime
  const currentLeadTime = leadTimeOptions[quote.config.leadTime]

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Quote Summary</h2>
        <p className="text-sm text-gray-500">{parts.length} part{parts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Parts List */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Parts</h3>
          <div className="space-y-2">
            {parts.map((part, index) => (
              <div key={part.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{index + 1}.</span>
                  <span className="text-sm text-gray-900 truncate">{part.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {part.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Lead Time Selector */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Lead Time</h3>
          <div className="space-y-2">
            {Object.entries(leadTimeOptions).map(([key, option]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all ${
                  quote.config.leadTime === key
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => {/* This would be handled by parent */}}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium capitalize">{key}</div>
                        <div className="text-xs text-gray-500">{option.days} days</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${option.price.toFixed(2)}</div>
                      {quote.config.leadTime === key && (
                        <Badge className="bg-blue-600 text-xs">Selected</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        {/* Cost Breakdown */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Cost Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Material</span>
              <span>${quote.pricing.breakdown.material.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Machine Time</span>
              <span>${quote.pricing.breakdown.machine.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Finish</span>
              <span>${quote.pricing.breakdown.finish.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Inspection</span>
              <span>${quote.pricing.breakdown.inspection.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Logistics</span>
              <span>${quote.pricing.breakdown.logistics.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Risk</span>
              <span>${quote.pricing.breakdown.risk.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span>${quote.pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>${quote.pricing.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>${quote.pricing.shipping.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-lg font-semibold text-gray-900">
              ${quote.pricing.total.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Per part × {quote.config.quantity} qty
          </div>
        </div>

        {/* Quality Add-ons */}
        {quote.config.qualityAddons && quote.config.qualityAddons.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Quality Add-ons</h3>
            <div className="space-y-1">
              {quote.config.qualityAddons.map(addon => (
                <Badge key={addon} variant="secondary" className="text-xs">
                  {addon.replace('_', ' ').toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Compliance */}
        {quote.config.compliance && quote.config.compliance.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Compliance</h3>
            <div className="space-y-1">
              {quote.config.compliance.map(compliance => (
                <Badge key={compliance} variant="outline" className="text-xs">
                  <ShieldCheckIcon className="h-3 w-3 mr-1" />
                  {compliance.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CO2 Estimate */}
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <TruckIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">CO2 Estimate</span>
          </div>
          <div className="text-sm text-green-700 mt-1">
            ~2.3 kg CO2 per part
          </div>
          <div className="text-xs text-green-600 mt-1">
            Based on material, process, and shipping
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button
          className="w-full"
          onClick={onCheckout}
          disabled={isLoading || quote.status === 'error'}
        >
          <CurrencyDollarIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Calculating...' : 'Checkout'}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onSaveQuote}>
            <BookmarkIcon className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button variant="outline" onClick={onSendForApproval}>
            <ShareIcon className="h-4 w-4 mr-1" />
            Send for Approval
          </Button>
        </div>

        <Button variant="ghost" className="w-full text-xs">
          <DocumentTextIcon className="h-4 w-4 mr-1" />
          Generate PDF Quote
        </Button>
      </div>
    </div>
  )
}
