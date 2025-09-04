'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { DFMPanel } from '@/components/dfm/DFMPanel'
import { Viewer3D } from '@/components/viewer/Viewer3D'
import {
  ChevronLeftIcon,
  HomeIcon,
  DocumentTextIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MinusIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

// Mock data based on the specification
const mockQuoteData = {
  id: 'Q-2024-001',
  status: 'draft',
  total_amount: 2456.78,
  currency: 'USD',
  items: [
    {
      id: 'line-1',
      file_name: 'bracket.step',
      thumb_url: '/api/placeholder/100/100',
      version_tag: 'v1.2',
      qty: 50,
      process: 'CNC',
      material: 'Aluminum 6061-T6',
      finish: 'Anodized',
      threads: true,
      inserts: false,
      tolerance: '±0.005"',
      roughness: '125uin Ra',
      inspection_level: 'Standard',
      dims: { x_mm: 100, y_mm: 50, z_mm: 25, vol_mm3: 125000 },
      lead_time_choice: null,
      unit_price: 45.67,
      dfm: {
        status: 'ok',
        issues: []
      }
    },
    {
      id: 'line-2',
      file_name: 'shaft.dxf',
      thumb_url: '/api/placeholder/100/100',
      version_tag: 'v1.0',
      qty: 25,
      process: 'CNC',
      material: '4140 Steel',
      finish: 'None',
      threads: false,
      inserts: false,
      tolerance: '±0.005"',
      roughness: '125uin Ra',
      inspection_level: 'Standard',
      dims: { x_mm: 200, y_mm: 20, z_mm: 20, vol_mm3: 80000 },
      lead_time_choice: null,
      unit_price: 32.45,
      dfm: {
        status: 'warn',
        issues: [
          { code: 'TIGHT_TOL', severity: 'warning', msg: 'Tight tolerance may increase cost' }
        ]
      }
    }
  ]
};

const mockLeadTimeOptions = {
  usa: [
    { id: 'usa-economy', region: 'USA', speed: 'Economy', business_days: 15, unit_price: 45.67, msrp: 52.00, savings_text: 'Save $6.33' },
    { id: 'usa-standard', region: 'USA', speed: 'Standard', business_days: 10, unit_price: 52.45, msrp: 60.00, savings_text: 'Save $7.55' },
    { id: 'usa-expedite', region: 'USA', speed: 'Expedite', business_days: 5, unit_price: 65.89, msrp: 75.00, savings_text: 'Save $9.11' }
  ],
  international: [
    { id: 'intl-economy', region: 'International', speed: 'Economy', business_days: 25, unit_price: 48.90, msrp: 55.00, savings_text: 'Save $6.10' },
    { id: 'intl-standard', region: 'International', speed: 'Standard', business_days: 18, unit_price: 58.75, msrp: 65.00, savings_text: 'Save $6.25' },
    { id: 'intl-expedite', region: 'International', speed: 'Expedite', business_days: 12, unit_price: 72.15, msrp: 80.00, savings_text: 'Save $7.85' }
  ]
};

export default function QuoteDetailsPage() {
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState(mockQuoteData);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [leadTimeSelections, setLeadTimeSelections] = useState<Record<string, string>>({});
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromos, setAppliedPromos] = useState<string[]>([]);
  const [itarMode, setItarMode] = useState(false);

  // Calculate totals based on selections
  const calculateTotals = () => {
    let subtotal = 0;
    quote.items.forEach(item => {
      const leadTimeId = leadTimeSelections[item.id];
      const leadTimeOption = [...mockLeadTimeOptions.usa, ...mockLeadTimeOptions.international]
        .find(option => option.id === leadTimeId);

      const price = leadTimeOption ? leadTimeOption.unit_price : item.unit_price;
      subtotal += price * item.qty;
    });
    return subtotal;
  };

  const handleLeadTimeSelect = (itemId: string, leadTimeId: string) => {
    setLeadTimeSelections(prev => ({ ...prev, [itemId]: leadTimeId }));
  };

  const handleQtyChange = (itemId: string, newQty: number) => {
    setQuote(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, qty: Math.max(1, newQty) } : item
      )
    }));
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev =>
      selected
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleApplyPromo = () => {
    if (promoCode && !appliedPromos.includes(promoCode)) {
      setAppliedPromos(prev => [...prev, promoCode]);
      setPromoCode('');
    }
  };

  const getConfigSummary = (item: any) => {
    return `${item.process} • ${item.material} • ${item.dims.x_mm}×${item.dims.y_mm}×${item.dims.z_mm}mm • ${item.finish}`;
  };

  const getDfmStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'warn':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'blocker':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button className="flex items-center hover:text-gray-900">
                <HomeIcon className="h-4 w-4 mr-1" />
                Dashboard
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Quotes</span>
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="font-medium text-gray-900">{quote.id}</span>
            </div>

            {/* Title */}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-semibold text-gray-900">{quote.id}</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Certifications
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/portal/quotes/${quoteId}/analyze`}>
                  <CubeIcon className="h-4 w-4 mr-2" />
                  Analyze DFM
                </a>
              </Button>
              <Button variant="outline" size="sm">
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <ShareIcon className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Toggles and Tools */}
          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm">
                <Checkbox
                  checked={itarMode}
                  onCheckedChange={setItarMode}
                />
                <span>ITAR/EAR Controlled Handling</span>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <EyeIcon className="h-4 w-4 mr-2" />
                Collapse All
              </Button>
              <Button variant="ghost" size="sm">
                <ClockIcon className="h-4 w-4 mr-2" />
                Recent Activity Log
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parts List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Parts ({quote.items.length})</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input placeholder="Search parts..." className="pl-10 w-64" />
                    </div>
                    <Button variant="outline" size="sm">
                      <FunnelIcon className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quote.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                        />
                        <span className="text-sm font-medium text-gray-500 w-8">#{index + 1}</span>
                        <img
                          src={item.thumb_url}
                          alt={item.file_name}
                          className="w-12 h-12 rounded border"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{item.file_name}</h4>
                            <Badge variant="secondary">{item.version_tag}</Badge>
                            {getDfmStatusIcon(item.dfm.status)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{getConfigSummary(item)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <ArrowPathIcon className="h-4 w-4 mr-2" />
                            Revise CAD
                          </Button>
                          <Button variant="outline" size="sm">
                            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                            Upload Drawings
                          </Button>
                          <Button variant="outline" size="sm">
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="mt-4 flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Qty:</span>
                          <div className="flex items-center border rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQtyChange(item.id, item.qty - 1)}
                              disabled={item.qty <= 1}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <span className="px-3 py-1 text-sm">{item.qty}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQtyChange(item.id, item.qty + 1)}
                            >
                              <PlusIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          Unit: ${leadTimeSelections[item.id] ?
                            [...mockLeadTimeOptions.usa, ...mockLeadTimeOptions.international]
              .find(opt => opt.id === leadTimeSelections[item.id])?.unit_price.toFixed(2) :
            item.unit_price.toFixed(2)}
                        </div>
                        <div className="text-sm font-medium">
                          Total: ${(leadTimeSelections[item.id] ?
                            [...mockLeadTimeOptions.usa, ...mockLeadTimeOptions.international]
              .find(opt => opt.id === leadTimeSelections[item.id])?.unit_price :
            item.unit_price * item.qty).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upload More Card */}
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-8 text-center">
                <CubeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload Another 3D Model
                </h3>
                <p className="text-gray-600 mb-4">
                  Max size 200MB each. Supported: STEP, STL, IGES, DXF, and more
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Button variant="outline">
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Recent Uploads
                  </Button>
                  <Button>
                    Browse Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Legal Note */}
            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
              <p>
                Quoted prices include applicable tariffs. Production orders may incur additional shipping duties.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Lead Time Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Lead Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="usa" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="usa">USA</TabsTrigger>
                    <TabsTrigger value="international">International</TabsTrigger>
                  </TabsList>

                  <TabsContent value="usa" className="mt-4 space-y-3">
                    {mockLeadTimeOptions.usa.map((option) => (
                      <div key={option.id} className="space-y-2">
                        {quote.items.map((item) => (
                          <div key={`${item.id}-${option.id}`} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`lead-time-${item.id}`}
                              value={option.id}
                              checked={leadTimeSelections[item.id] === option.id}
                              onChange={() => handleLeadTimeSelect(item.id, option.id)}
                              className="text-blue-600"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{option.speed}</span>
                                <span className="text-sm text-green-600">{option.savings_text}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>{option.business_days} business days</span>
                                <span>${option.unit_price.toFixed(2)}/unit</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="international" className="mt-4 space-y-3">
                    {mockLeadTimeOptions.international.map((option) => (
                      <div key={option.id} className="space-y-2">
                        {quote.items.map((item) => (
                          <div key={`${item.id}-${option.id}`} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`lead-time-${item.id}`}
                              value={option.id}
                              checked={leadTimeSelections[item.id] === option.id}
                              onChange={() => handleLeadTimeSelect(item.id, option.id)}
                              className="text-blue-600"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{option.speed}</span>
                                <span className="text-sm text-green-600">{option.savings_text}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>{option.business_days} business days</span>
                                <span>${option.unit_price.toFixed(2)}/unit</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Promo Section */}
            <Card>
              <CardHeader>
                <CardTitle>Apply Promo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <Button onClick={handleApplyPromo}>
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                {appliedPromos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {appliedPromos.map((promo, index) => (
                      <Badge key={index} variant="secondary" className="mr-2">
                        {promo}
                        <button
                          onClick={() => setAppliedPromos(prev => prev.filter(p => p !== promo))}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subtotal Card */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">${calculateTotals().toFixed(2)}</span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Offset Carbon Emissions</span>
                    <span className="text-xs">Info</span>
                  </div>

                  <Button className="w-full" size="lg">
                    Continue to Checkout
                  </Button>

                  <Button variant="outline" className="w-full">
                    Forward to Purchaser
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
