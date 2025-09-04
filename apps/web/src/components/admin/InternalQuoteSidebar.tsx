'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInternalQuote } from '@/components/providers/InternalQuoteProvider'
import { CogIcon, TruckIcon, CalculatorIcon } from '@heroicons/react/24/outline'
import { posthog } from 'posthog-js'

export function InternalQuoteSidebar() {
  const { quote, selectedLineId, updatePricingBreakdown, repriceQuote, isLoading } = useInternalQuote()
  const [isRepricing, setIsRepricing] = useState(false)

  const selectedLine = quote?.lines.find(line => line.id === selectedLineId)

  const handleOverride = async (field: string, value: number) => {
    if (!selectedLineId) return

    try {
      await updatePricingBreakdown(selectedLineId, { [field]: value })
      posthog.capture('admin_override_saved', {
        quote_id: quote?.id,
        line_id: selectedLineId,
        field,
        value
      })
    } catch (error) {
      console.error('Failed to update pricing:', error)
    }
  }

  const handleReprice = async () => {
    setIsRepricing(true)
    try {
      await repriceQuote()
      posthog.capture('admin_reprice', { quote_id: quote?.id })
    } catch (error) {
      console.error('Failed to reprice:', error)
    } finally {
      setIsRepricing(false)
    }
  }

  if (isLoading || !quote) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Technical Pricing Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CogIcon className="w-5 h-5 mr-2" />
            Technical Pricing Inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Machine Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Machine</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="machine-rate" className="text-xs">Machine Rate ($/hr)</Label>
                <Input
                  id="machine-rate"
                  type="number"
                  defaultValue={selectedLine?.pricing_breakdown.machine_rate_per_hr || 75}
                  onBlur={(e) => handleOverride('machine_rate_per_hr', parseFloat(e.target.value))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="setup-time" className="text-xs">Setup Time (min)</Label>
                <Input
                  id="setup-time"
                  type="number"
                  defaultValue={selectedLine?.pricing_breakdown.setup_time_min || 30}
                  onBlur={(e) => handleOverride('setup_time_min', parseFloat(e.target.value))}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Material Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Material</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="material-cost" className="text-xs">Buy Cost ($/kg)</Label>
                <Input
                  id="material-cost"
                  type="number"
                  step="0.01"
                  defaultValue={selectedLine?.pricing_breakdown.material_buy_cost || 25.50}
                  onBlur={(e) => handleOverride('material_buy_cost', parseFloat(e.target.value))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="waste-factor" className="text-xs">Waste Factor</Label>
                <Input
                  id="waste-factor"
                  type="number"
                  step="0.01"
                  defaultValue={selectedLine?.pricing_breakdown.material_waste_factor || 1.1}
                  onBlur={(e) => handleOverride('material_waste_factor', parseFloat(e.target.value))}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Operations Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Operations</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="finish-cost" className="text-xs">Finish Cost ($)</Label>
                <Input
                  id="finish-cost"
                  type="number"
                  step="0.01"
                  defaultValue={selectedLine?.pricing_breakdown.finish_cost || 8.50}
                  onBlur={(e) => handleOverride('finish_cost', parseFloat(e.target.value))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="inspection-cost" className="text-xs">Inspection ($)</Label>
                <Input
                  id="inspection-cost"
                  type="number"
                  step="0.01"
                  defaultValue={selectedLine?.pricing_breakdown.inspection_cost || 3.00}
                  onBlur={(e) => handleOverride('inspection_cost', parseFloat(e.target.value))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="risk-adder" className="text-xs">Risk Adder ($)</Label>
                <Input
                  id="risk-adder"
                  type="number"
                  step="0.01"
                  defaultValue={selectedLine?.pricing_breakdown.risk_adder || 2.50}
                  onBlur={(e) => handleOverride('risk_adder', parseFloat(e.target.value))}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="margin" className="text-xs">Margin (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  step="0.1"
                  defaultValue={selectedLine?.pricing_breakdown.margin || 25.00}
                  onBlur={(e) => handleOverride('margin', parseFloat(e.target.value))}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Recalculate Button */}
          <Button
            onClick={handleReprice}
            disabled={isRepricing}
            className="w-full"
          >
            <CalculatorIcon className="w-4 h-4 mr-2" />
            {isRepricing ? 'Recalculating...' : 'Recalculate'}
          </Button>
        </CardContent>
      </Card>

      {/* Lead Time & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TruckIcon className="w-5 h-5 mr-2" />
            Lead Time & Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label htmlFor="region-select" className="text-sm">Region</Label>
              <Select defaultValue="USA">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USA">Made in USA</SelectItem>
                  <SelectItem value="International">Made Internationally</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="speed-select" className="text-sm">Speed</Label>
              <Select defaultValue="Standard">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expedite">Expedite</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Economy">Economy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="w-full">
              Add Option
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-sm font-medium">${quote.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Taxes (est.)</span>
              <span className="text-sm font-medium">$0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Shipping (est.)</span>
              <span className="text-sm font-medium">$0.00</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Grand Total (est.)</span>
                <span className="text-sm font-bold">${quote.subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
