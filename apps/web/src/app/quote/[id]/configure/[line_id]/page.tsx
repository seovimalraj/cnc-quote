'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeftIcon,
  CubeIcon,
  DocumentIcon,
  SaveIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface QuoteLine {
  id: string;
  fileId: string;
  fileName: string;
  process: 'CNC' | 'SheetMetal' | 'InjectionMolding';
  material: string;
  finish?: string;
  qty: number;
  status: 'Analyzing' | 'Priced' | 'Needs_Review' | 'Error';
  pricingBreakdown?: PricingBreakdown;
  leadTimeOptions?: LeadOption[];
  thumbnail?: string;
}

interface PricingBreakdown {
  setup_time_min: number;
  cycle_time_min: number;
  machine_rate_per_hr: number;
  material_buy_cost: number;
  material_waste_factor: number;
  tooling_wear_cost: number;
  finish_cost: number;
  inspection_cost: number;
  risk_adder: number;
  overhead: number;
  margin: number;
  unit_price: number;
}

interface LeadOption {
  id: string;
  region: 'USA' | 'International';
  speed: 'Economy' | 'Standard' | 'Expedite';
  business_days: number;
  unit_price: number;
  msrp: number;
  savings_text: string;
}

interface PartSpecs {
  quantity: number;
  process: 'CNC' | 'SheetMetal' | 'InjectionMolding';
  material: string;
  finish: string;
  threadsInserts: string;
  tolerancePack: 'Std' | 'Tight' | 'Critical';
  surfaceRoughness: string;
  partMarking: string;
  inspection: 'Std' | 'Formal' | 'CMM' | 'FAIR' | 'Source' | 'Custom';
  certificates: string[];
  notes: string;
}

const materials = [
  'Aluminum 6061',
  'Aluminum 7075',
  'Steel 1018',
  'Steel 4140',
  'Stainless Steel 304',
  'Stainless Steel 316',
  'Brass 360',
  'Copper 110',
  'Plastic ABS',
  'Plastic Nylon',
  'Plastic Polycarbonate'
];

const finishes = [
  'None',
  'Anodized Clear',
  'Anodized Black',
  'Anodized Blue',
  'Powder Coat Black',
  'Powder Coat White',
  'Nickel Plating',
  'Chrome Plating',
  'Bead Blast',
  'Polished'
];

const certificates = [
  'Material Test Report',
  'Certificate of Conformance',
  'First Article Inspection',
  'PPAP Level 1',
  'PPAP Level 2',
  'PPAP Level 3',
  'ISO 9001',
  'AS9100'
];

export default function ConfigurePartPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const lineId = params.line_id as string;

  const [line, setLine] = useState<QuoteLine | null>(null);
  const [specs, setSpecs] = useState<PartSpecs>({
    quantity: 1,
    process: 'CNC',
    material: '',
    finish: 'None',
    threadsInserts: '',
    tolerancePack: 'Std',
    surfaceRoughness: '125',
    partMarking: '',
    inspection: 'Std',
    certificates: [],
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pricePreview, setPricePreview] = useState<PricingBreakdown | null>(null);

  useEffect(() => {
    loadLineData();
  }, [quoteId, lineId]);

  useEffect(() => {
    // Autosave when specs change
    const timeoutId = setTimeout(() => {
      if (line && !isLoading) {
        handleAutosave();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [specs]);

  const loadLineData = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, this would fetch the specific line data
      // For now, we'll use mock data
      const mockLine: QuoteLine = {
        id: lineId,
        fileId: 'file-123',
        fileName: 'bracket.stl',
        process: 'CNC',
        material: 'Aluminum 6061',
        finish: 'Anodized Clear',
        qty: 10,
        status: 'Priced',
        pricingBreakdown: {
          setup_time_min: 30,
          cycle_time_min: 15,
          machine_rate_per_hr: 75,
          material_buy_cost: 25.50,
          material_waste_factor: 1.1,
          tooling_wear_cost: 5.00,
          finish_cost: 8.50,
          inspection_cost: 3.00,
          risk_adder: 2.50,
          overhead: 15.00,
          margin: 25.00,
          unit_price: 12.55
        }
      };

      setLine(mockLine);
      setSpecs({
        quantity: mockLine.qty,
        process: mockLine.process,
        material: mockLine.material,
        finish: mockLine.finish || 'None',
        threadsInserts: '',
        tolerancePack: 'Std',
        surfaceRoughness: '125',
        partMarking: '',
        inspection: 'Std',
        certificates: [],
        notes: ''
      });
      setPricePreview(mockLine.pricingBreakdown || null);
    } catch (error) {
      console.error('Failed to load line data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutosave = async () => {
    if (!line) return;

    try {
      setIsSaving(true);

      // Update line specs
      await fetch(`/api/quotes/${quoteId}/lines/${lineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specs)
      });

      // Trigger re-pricing
      const priceResponse = await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          line_id: lineId,
          specs
        })
      });

      if (priceResponse.ok) {
        const newPricing = await priceResponse.json();
        setPricePreview(newPricing);
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpecChange = (field: keyof PartSpecs, value: any) => {
    setSpecs(prev => ({ ...prev, [field]: value }));
  };

  const handleCertificateToggle = (certificate: string) => {
    setSpecs(prev => ({
      ...prev,
      certificates: prev.certificates.includes(certificate)
        ? prev.certificates.filter(c => c !== certificate)
        : [...prev.certificates, certificate]
    }));
  };

  const handleSave = async () => {
    await handleAutosave();
    router.push(`/quote/${quoteId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading part configuration...</p>
        </div>
      </div>
    );
  }

  if (!line) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/quote/${quoteId}`)}
                className="mr-4"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Quote
              </Button>
              <CubeIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Configure Part</h1>
                <p className="text-sm text-gray-600">{line.fileName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {isSaving && (
                <div className="flex items-center text-sm text-blue-600">
                  <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </div>
              )}
              <Button onClick={handleSave}>
                <SaveIcon className="w-4 h-4 mr-2" />
                Save & Return
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel */}
          <div className="space-y-6">
            {/* Files Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <DocumentIcon className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{line.fileName}</p>
                      <p className="text-sm text-gray-600">Primary CAD file</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <DocumentIcon className="w-4 h-4 mr-2" />
                    Add Attachments (Drawings, Specs)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mini Viewer */}
            <Card>
              <CardHeader>
                <CardTitle>3D Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">3D Model Preview</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Specification Form */}
            <Card>
              <CardHeader>
                <CardTitle>Part Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quantity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={specs.quantity}
                      onChange={(e) => handleSpecChange('quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Price Breaks</Label>
                    <div className="text-sm text-gray-600 mt-2">
                      1-9: $12.55 each<br />
                      10-49: $11.30 each<br />
                      50+: $10.05 each
                    </div>
                  </div>
                </div>

                {/* Process */}
                <div>
                  <Label htmlFor="process">Process</Label>
                  <Select value={specs.process} onValueChange={(value) => handleSpecChange('process', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNC">CNC Machining</SelectItem>
                      <SelectItem value="SheetMetal">Sheet Metal</SelectItem>
                      <SelectItem value="InjectionMolding">Injection Molding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Material */}
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select value={specs.material} onValueChange={(value) => handleSpecChange('material', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.map((material) => (
                        <SelectItem key={material} value={material}>
                          {material}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Finish */}
                <div>
                  <Label htmlFor="finish">Finish</Label>
                  <Select value={specs.finish} onValueChange={(value) => handleSpecChange('finish', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {finishes.map((finish) => (
                        <SelectItem key={finish} value={finish}>
                          {finish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Threads & Inserts */}
                <div>
                  <Label htmlFor="threadsInserts">Threads & Inserts</Label>
                  <Textarea
                    id="threadsInserts"
                    placeholder="Specify any threads, inserts, or special features..."
                    value={specs.threadsInserts}
                    onChange={(e) => handleSpecChange('threadsInserts', e.target.value)}
                  />
                </div>

                {/* Tolerance Pack */}
                <div>
                  <Label htmlFor="tolerancePack">Tolerance Package</Label>
                  <Select value={specs.tolerancePack} onValueChange={(value) => handleSpecChange('tolerancePack', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Std">Standard (±0.005")</SelectItem>
                      <SelectItem value="Tight">Tight (±0.002")</SelectItem>
                      <SelectItem value="Critical">Critical (±0.001")</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Surface Roughness */}
                <div>
                  <Label htmlFor="surfaceRoughness">Surface Roughness (µin)</Label>
                  <Select value={specs.surfaceRoughness} onValueChange={(value) => handleSpecChange('surfaceRoughness', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="125">125 µin (Standard)</SelectItem>
                      <SelectItem value="63">63 µin (Fine)</SelectItem>
                      <SelectItem value="32">32 µin (Very Fine)</SelectItem>
                      <SelectItem value="16">16 µin (Mirror)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Part Marking */}
                <div>
                  <Label htmlFor="partMarking">Part Marking</Label>
                  <Input
                    id="partMarking"
                    placeholder="Serial numbers, logos, etc."
                    value={specs.partMarking}
                    onChange={(e) => handleSpecChange('partMarking', e.target.value)}
                  />
                </div>

                {/* Inspection */}
                <div>
                  <Label htmlFor="inspection">Inspection Level</Label>
                  <Select value={specs.inspection} onValueChange={(value) => handleSpecChange('inspection', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Std">Standard</SelectItem>
                      <SelectItem value="Formal">Formal</SelectItem>
                      <SelectItem value="CMM">CMM Inspection</SelectItem>
                      <SelectItem value="FAIR">First Article Inspection Report</SelectItem>
                      <SelectItem value="Source">Source Inspection</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Certificates */}
                <div>
                  <Label>Certificates & Documentation</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {certificates.map((certificate) => (
                      <div key={certificate} className="flex items-center space-x-2">
                        <Checkbox
                          id={certificate}
                          checked={specs.certificates.includes(certificate)}
                          onCheckedChange={() => handleCertificateToggle(certificate)}
                        />
                        <Label htmlFor={certificate} className="text-sm">
                          {certificate}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions or requirements..."
                    value={specs.notes}
                    onChange={(e) => handleSpecChange('notes', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Price Preview */}
        {pricePreview && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Price Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Unit Price</h4>
                    <p className="text-2xl font-bold text-green-600">${pricePreview.unit_price.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">per part</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Total Price</h4>
                    <p className="text-2xl font-bold">${(pricePreview.unit_price * specs.quantity).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">for {specs.quantity} parts</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Cycle Time</h4>
                    <p className="text-lg font-semibold">{pricePreview.cycle_time_min} min</p>
                    <p className="text-sm text-gray-600">per part</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
