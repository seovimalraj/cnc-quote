'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  CogIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  BeakerIcon,
  TruckIcon,
  ShieldCheckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Part, Quote, QuoteConfig } from '@/lib/hooks/use-quote-store'

interface ConfiguratorPanelProps {
  quote: Quote
  selectedPart: Part | null
  onConfigChange: (config: Partial<QuoteConfig>) => void
  onPriceCalculation: () => void
  onDFMValidation: () => void
}

export const ConfiguratorPanel = ({
  quote,
  selectedPart,
  onConfigChange,
  onPriceCalculation,
  onDFMValidation
}: ConfiguratorPanelProps) => {
  const [activeTab, setActiveTab] = useState('process')

  const handleProcessChange = (process: string) => {
    onConfigChange({ process: process as any })
    onDFMValidation()
  }

  const handleMaterialChange = (material: string) => {
    onConfigChange({ material })
    onPriceCalculation()
  }

  const handleFinishChange = (finish: string) => {
    onConfigChange({ finish })
    onPriceCalculation()
  }

  const handleToleranceChange = (tolerance: string) => {
    onConfigChange({ tolerance })
    onDFMValidation()
  }

  const handleQuantityChange = (quantity: number[]) => {
    onConfigChange({ quantity: quantity[0] })
    onPriceCalculation()
  }

  const handleLeadTimeChange = (leadTime: string) => {
    onConfigChange({ leadTime: leadTime as any })
    onPriceCalculation()
  }

  const handleQualityAddonToggle = (addon: string, checked: boolean) => {
    const currentAddons = quote.config.qualityAddons || []
    const newAddons = checked
      ? [...currentAddons, addon]
      : currentAddons.filter(a => a !== addon)
    onConfigChange({ qualityAddons: newAddons })
    onPriceCalculation()
  }

  const handleComplianceToggle = (compliance: string, checked: boolean) => {
    const currentCompliance = quote.config.compliance || []
    const newCompliance = checked
      ? [...currentCompliance, compliance]
      : currentCompliance.filter(c => c !== compliance)
    onConfigChange({ compliance: newCompliance })
  }

  const materials = [
    { id: 'aluminum_6061', name: 'Aluminum 6061', cost: 'Medium', strength: 'High' },
    { id: 'steel_1018', name: 'Steel 1018', cost: 'Low', strength: 'High' },
    { id: 'stainless_304', name: 'Stainless 304', cost: 'High', strength: 'Very High' },
    { id: 'brass_c360', name: 'Brass C360', cost: 'Medium', strength: 'Medium' },
    { id: 'plastic_abs', name: 'ABS Plastic', cost: 'Low', strength: 'Low' },
    { id: 'plastic_pc', name: 'Polycarbonate', cost: 'Medium', strength: 'Medium' }
  ]

  const finishes = [
    { id: 'none', name: 'No Finish', cost: 'Free' },
    { id: 'anodize_clear', name: 'Clear Anodize', cost: 'Low' },
    { id: 'anodize_black', name: 'Black Anodize', cost: 'Low' },
    { id: 'powder_coat', name: 'Powder Coat', cost: 'Medium' },
    { id: 'bead_blast', name: 'Bead Blast', cost: 'Low' },
    { id: 'electropolish', name: 'Electropolish', cost: 'High' }
  ]

  const tolerances = [
    { id: 'standard', name: 'Standard (±0.005")', description: 'Good for most applications' },
    { id: 'tight', name: 'Tight (±0.002")', description: 'Higher precision, higher cost' },
    { id: 'critical', name: 'Critical (±0.001")', description: 'Maximum precision, premium cost' }
  ]

  const qualityAddons = [
    { id: 'cmm_report', name: 'CMM Inspection Report', cost: '$50' },
    { id: 'fair', name: 'First Article Inspection Report', cost: '$100' },
    { id: 'ppap', name: 'PPAP Documentation', cost: '$200' },
    { id: 'cofc', name: 'Certificate of Conformance', cost: '$25' }
  ]

  const complianceOptions = [
    { id: 'itar', name: 'ITAR Compliant', description: 'US-based manufacturing only' },
    { id: 'dfars', name: 'DFARS Materials', description: 'US-origin materials only' },
    { id: 'rohs', name: 'RoHS Compliant', description: 'Lead-free electronics' },
    { id: 'reach', name: 'REACH Compliant', description: 'EU chemical regulations' }
  ]

  return (
    <div className="h-full bg-white border-t border-gray-200">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="process" className="text-xs">
            <CogIcon className="h-4 w-4 mr-1" />
            Process
          </TabsTrigger>
          <TabsTrigger value="material" className="text-xs">
            <CubeIcon className="h-4 w-4 mr-1" />
            Material
          </TabsTrigger>
          <TabsTrigger value="finish" className="text-xs">
            <WrenchScrewdriverIcon className="h-4 w-4 mr-1" />
            Finish
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-xs">
            <ShieldCheckIcon className="h-4 w-4 mr-1" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">
            <DocumentTextIcon className="h-4 w-4 mr-1" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Process Tab */}
        <TabsContent value="process" className="p-4 space-y-4">
          <div>
            <Label className="text-sm font-medium">Manufacturing Process</Label>
            <Select value={quote.config.process} onValueChange={handleProcessChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select process" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cnc">CNC Machining</SelectItem>
                <SelectItem value="sheet_metal">Sheet Metal</SelectItem>
                <SelectItem value="injection_molding">Injection Molding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Tolerance</Label>
            <Select value={quote.config.tolerance} onValueChange={handleToleranceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select tolerance" />
              </SelectTrigger>
              <SelectContent>
                {tolerances.map(tolerance => (
                  <SelectItem key={tolerance.id} value={tolerance.id}>
                    <div>
                      <div className="font-medium">{tolerance.name}</div>
                      <div className="text-xs text-gray-500">{tolerance.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Quantity: {quote.config.quantity}</Label>
            <Slider
              value={[quote.config.quantity]}
              onValueChange={handleQuantityChange}
              max={1000}
              min={1}
              step={1}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>1000</span>
            </div>
          </div>
        </TabsContent>

        {/* Material Tab */}
        <TabsContent value="material" className="p-4">
          <div className="space-y-3">
            {materials.map(material => (
              <Card
                key={material.id}
                className={`cursor-pointer transition-all ${
                  quote.config.material === material.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleMaterialChange(material.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{material.name}</div>
                      <div className="text-sm text-gray-500">
                        Cost: {material.cost} • Strength: {material.strength}
                      </div>
                    </div>
                    {quote.config.material === material.id && (
                      <Badge className="bg-blue-600">Selected</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Finish Tab */}
        <TabsContent value="finish" className="p-4">
          <div className="space-y-3">
            {finishes.map(finish => (
              <Card
                key={finish.id}
                className={`cursor-pointer transition-all ${
                  quote.config.finish === finish.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleFinishChange(finish.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{finish.name}</div>
                      <div className="text-sm text-gray-500">Cost: {finish.cost}</div>
                    </div>
                    {quote.config.finish === finish.id && (
                      <Badge className="bg-blue-600">Selected</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="p-4 space-y-6">
          {/* Lead Time */}
          <div>
            <Label className="text-sm font-medium">Lead Time</Label>
            <Select value={quote.config.leadTime} onValueChange={handleLeadTimeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select lead time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">
                  <div>
                    <div className="font-medium">Economy</div>
                    <div className="text-xs text-gray-500">14 days - Best value</div>
                  </div>
                </SelectItem>
                <SelectItem value="standard">
                  <div>
                    <div className="font-medium">Standard</div>
                    <div className="text-xs text-gray-500">7 days - Balanced</div>
                  </div>
                </SelectItem>
                <SelectItem value="expedite">
                  <div>
                    <div className="font-medium">Expedite</div>
                    <div className="text-xs text-gray-500">3 days - Fastest</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality Add-ons */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quality Add-ons</Label>
            <div className="space-y-3">
              {qualityAddons.map(addon => (
                <div key={addon.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={addon.id}
                    checked={quote.config.qualityAddons?.includes(addon.id) || false}
                    onCheckedChange={(checked) => handleQualityAddonToggle(addon.id, checked as boolean)}
                  />
                  <Label htmlFor={addon.id} className="flex-1">
                    <div className="font-medium">{addon.name}</div>
                    <div className="text-sm text-gray-500">{addon.cost}</div>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Compliance Requirements</Label>
            <div className="space-y-3">
              {complianceOptions.map(option => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={option.id}
                    checked={quote.config.compliance?.includes(option.id) || false}
                    onCheckedChange={(checked) => handleComplianceToggle(option.id, checked as boolean)}
                  />
                  <Label htmlFor={option.id} className="flex-1">
                    <div className="font-medium">{option.name}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="p-4">
          <div>
            <Label className="text-sm font-medium">Special Instructions</Label>
            <Textarea
              placeholder="Add any special requirements, notes, or instructions..."
              value={quote.config.notes || ''}
              onChange={(e) => onConfigChange({ notes: e.target.value })}
              className="mt-2"
              rows={6}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
