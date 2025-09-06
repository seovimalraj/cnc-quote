'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useQuote } from '@/components/providers/QuoteProvider'
import { posthog } from 'posthog-js'

interface LeadOption {
  id: string
  region: 'USA' | 'International'
  speed: 'Economy' | 'Standard' | 'Expedite'
  business_days: number
  unit_price: number
  msrp: number
  savings_text: string
}

interface LeadTimeCardProps {}

export function LeadTimeCard({}: LeadTimeCardProps) {
  const { quote, updateLeadOption, isLoading } = useQuote()
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [etaDate, setEtaDate] = useState<string>('')

  useEffect(() => {
    if (quote?.selected_lead_option_id) {
      setSelectedOptionId(quote.selected_lead_option_id)
    }
  }, [quote?.selected_lead_option_id])

  useEffect(() => {
    // Calculate ETA date based on selected lead option
    if (selectedOptionId && quote?.lines) {
      const selectedOption = quote.lines
        .flatMap(line => line.lead_time_options || [])
        .find(option => option.id === selectedOptionId)

      if (selectedOption) {
        const etaDate = new Date()
        etaDate.setDate(etaDate.getDate() + selectedOption.business_days)
        setEtaDate(etaDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }))
      }
    }
  }, [selectedOptionId, quote?.lines])

  const handleOptionSelect = async (optionId: string) => {
    setSelectedOptionId(optionId)

    try {
      await updateLeadOption(optionId)
      posthog.capture('lead_option_selected', {
        quote_id: quote?.id,
        lead_option_id: optionId
      })
    } catch (error) {
      console.error('Failed to update lead option:', error)
      // Revert selection on error
      setSelectedOptionId(quote?.selected_lead_option_id || null)
    }
  }

  const usaOptions = quote?.lines?.flatMap(line =>
    line.lead_time_options?.filter(opt => opt.region === 'USA') || []
  ) || []

  const internationalOptions = quote?.lines?.flatMap(line =>
    line.lead_time_options?.filter(opt => opt.region === 'International') || []
  ) || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Lead Time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Made in USA Section */}
        {usaOptions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Made in USA</h3>
            <RadioGroup
              value={selectedOptionId || ''}
              onValueChange={handleOptionSelect}
              className="space-y-3"
            >
              {usaOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {option.speed === 'Expedite' && `${option.business_days} Business Days - Expedite`}
                          {option.speed === 'Standard' && `${option.business_days} Business Days - Standard`}
                          {option.speed === 'Economy' && `${option.business_days} Business Days - Economy`}
                        </div>
                        {option.savings_text && (
                          <div className="text-sm text-green-600 mt-1">
                            {option.savings_text}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ${option.unit_price.toFixed(2)}
                        </div>
                        {option.msrp > option.unit_price && (
                          <div className="text-sm text-gray-500 line-through">
                            ${option.msrp.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Made Internationally Section */}
        {internationalOptions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Made Internationally</h3>
            <RadioGroup
              value={selectedOptionId || ''}
              onValueChange={handleOptionSelect}
              className="space-y-3"
            >
              {internationalOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {option.business_days} Business Days - Economy
                        </div>
                        {option.savings_text && (
                          <div className="text-sm text-green-600 mt-1">
                            {option.savings_text}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ${option.unit_price.toFixed(2)}
                        </div>
                        {option.msrp > option.unit_price && (
                          <div className="text-sm text-gray-500 line-through">
                            ${option.msrp.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Learn More Link */}
        <div className="pt-4">
          <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-800">
            Learn More about shipping and lead times
          </Button>
        </div>

        {/* Shipping Estimate Banner */}
        {selectedOptionId && etaDate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              Order today to ship by {etaDate}.
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-xs text-gray-500 border-t pt-4">
          Quoted prices for prototype parts include all applicable tariffs. Quoted prices for production parts are subject to additional tariffs that are the customer's responsibility. Free shipping is applicable for small parcel orders. Freight shipments and orders shipping to non-US destinations will be subject to shipping charges. Continue to Checkout to view shipping options.
        </div>
      </CardContent>
    </Card>
  )
}
