'use client';

import DefaultLayout from '@/components/Layouts/DefaultLayout';
import SafeDate from '@/components/SafeDate';
import { useState } from 'react';
import {
  DocumentDuplicateIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CogIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  PaintBrushIcon,
  SaveIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Quote {
  id: string;
  customer: string;
  email: string;
  company: string;
  phone: string;
  material: string;
  quantity: number;
  surface: string;
  tolerance: string;
  leadTime: string;
  files: number;
  price: number;
  status: 'pending' | 'processing' | 'quoted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface PricingConfig {
  version: string;
  machines: Record<string, MachineConfig>;
  materials: Record<string, MaterialConfig>;
  finishes: Record<string, FinishConfig>;
  tolerance_packs: Record<string, TolerancePackConfig>;
  inspection: InspectionConfig;
  speed_region: Record<string, Record<string, SpeedRegionConfig>>;
  risk_matrix: Record<string, RiskConfig>;
  overhead_margin: OverheadMarginConfig;
}

interface MachineConfig {
  axes: number;
  envelope: { x: number; y: number; z: number };
  hourly_rate: number;
  setup_rate: number;
  min_setup_min: number;
  feed_rate_map: Record<string, number>;
  rapid_rate: number;
  toolchange_s: number;
  region: string;
  capacity: number;
}

interface MaterialConfig {
  grade: string;
  density_kg_m3: number;
  buy_price: number;
  stock_forms: string[];
  waste_factor_percent: number;
  finish_compat: string[];
  min_wall_mm: number;
  min_hole_mm: number;
  machinability: number;
}

interface FinishConfig {
  model: 'per_area' | 'per_part' | 'tiered';
  rate: number;
  min_lot: number;
  capacity_dims: { max_area: number };
  leadtime_add: number;
  region_allowed: string[];
}

interface TolerancePackConfig {
  cycle_time_multiplier: number;
  surface_default: number;
  inspection_requirements: string;
}

interface InspectionConfig {
  base_usd: number;
  per_dim_usd: number;
  program_min: number;
}

interface SpeedRegionConfig {
  multiplier: number;
  leadtime_days: number;
}

interface RiskConfig {
  time_multiplier: number;
  risk_percent?: number;
  risk_flat?: number;
}

interface OverheadMarginConfig {
  overhead_percent: number;
  target_margin_percent: number;
}

interface Quote {
  id: string;
  customer: string;
  email: string;
  company: string;
  phone: string;
  material: string;
  quantity: number;
  surface: string;
  tolerance: string;
  leadTime: string;
  files: number;
  price: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

const mockQuotes: Quote[] = [
  {
    id: 'Q-2024-001',
    customer: 'John Smith',
    email: 'john.smith@aerospace.com',
    company: 'Aerospace Dynamics',
    phone: '+1 (555) 123-4567',
    material: 'Aluminum 6061-T6',
    quantity: 50,
    surface: 'Anodized',
    tolerance: 'Tight (±0.002")',
    leadTime: '5-7 Business Days',
    files: 3,
    price: 12450,
    status: 'pending',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'Q-2024-002',
    customer: 'Sarah Johnson',
    email: 'sarah.j@medtech.com',
    company: 'MedTech Solutions',
    phone: '+1 (555) 987-6543',
    material: 'Stainless Steel 316',
    quantity: 25,
    surface: 'As Machined',
    tolerance: 'Standard (±0.005")',
    leadTime: '2-3 Business Days',
    files: 2,
    price: 8750,
    status: 'processing',
    createdAt: '2024-01-14T14:15:00Z',
    updatedAt: '2024-01-15T09:45:00Z',
  },
    {
      id: 'Q-2024-003',
      customer: 'Michael Chen',
      email: 'm.chen@autoparts.com',
      company: 'AutoParts Manufacturing',
      phone: '+1 (555) 456-7890',
      material: 'Mild Steel',
      quantity: 100,
      surface: 'Powder Coating',
      tolerance: 'Standard (±0.005")',
      leadTime: '5-7 Business Days',
      files: 4,
      price: 15600,
      status: 'quoted',
      createdAt: '2024-01-13T11:20:00Z',
      updatedAt: '2024-01-14T16:30:00Z',
    },
    {
      id: 'Q-2024-004',
      customer: 'Emily Rodriguez',
      email: 'e.rodriguez@robotics.com',
      company: 'Advanced Robotics Inc',
      phone: '+1 (555) 234-5678',
      material: 'Titanium Grade 2',
      quantity: 10,
      surface: 'As Machined',
      tolerance: 'Precision (±0.001")',
      leadTime: '24-48 Hours',
      files: 5,
      price: 28900,
      status: 'approved',
      createdAt: '2024-01-12T16:45:00Z',
      updatedAt: '2024-01-13T10:15:00Z',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'quoted': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockIcon className="h-4 w-4" />;
      case 'processing': return <DocumentDuplicateIcon className="h-4 w-4" />;
      case 'quoted': return <DocumentDuplicateIcon className="h-4 w-4" />;
      case 'approved': return <CheckCircleIcon className="h-4 w-4" />;
      case 'rejected': return <XCircleIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const updateQuoteStatus = (quoteId: string, newStatus: Quote['status']) => {
    // In a real app, this would make an API call
    console.log(`Updating quote ${quoteId} to status: ${newStatus}`);
  };

  // Pricing Configuration Functions
  const loadPricingConfig = async () => {
    try {
      setIsLoadingPricing(true);
      const response = await fetch('/api/admin/pricing/config');
      if (response.ok) {
        const data = await response.json();
        setPricingConfig(data);
      } else {
        // Use mock data if API doesn't exist yet
        setPricingConfig({
          version: 'v1.2.3',
          machines: {
            '3-axis-milling': {
              axes: 3,
              envelope: { x: 1200, y: 800, z: 600 },
              hourly_rate: 75,
              setup_rate: 85,
              min_setup_min: 30,
              feed_rate_map: { aluminum: 800, steel: 400, plastic: 1200 },
              rapid_rate: 2000,
              toolchange_s: 15,
              region: 'USA',
              capacity: 0.85
            }
          },
          materials: {
            'Aluminum 6061': {
              grade: '6061',
              density_kg_m3: 2700,
              buy_price: 2.50,
              stock_forms: ['plate', 'bar', 'extrusion'],
              waste_factor_percent: 15,
              finish_compat: ['anodize', 'powder_coat', 'polish'],
              min_wall_mm: 1.5,
              min_hole_mm: 3.0,
              machinability: 0.8
            }
          },
          finishes: {
            'Anodized Clear': {
              model: 'per_area',
              rate: 0.15,
              min_lot: 10,
              capacity_dims: { max_area: 10000 },
              leadtime_add: 2,
              region_allowed: ['USA', 'International']
            }
          },
          tolerance_packs: {
            'Std': { cycle_time_multiplier: 1.0, surface_default: 125, inspection_requirements: 'basic' },
            'Tight': { cycle_time_multiplier: 1.3, surface_default: 63, inspection_requirements: 'formal' },
            'Critical': { cycle_time_multiplier: 1.8, surface_default: 32, inspection_requirements: 'cmm' }
          },
          inspection: {
            base_usd: 25,
            per_dim_usd: 5,
            program_min: 30
          },
          speed_region: {
            'USA': {
              'Economy': { multiplier: 0.7, leadtime_days: 7 },
              'Standard': { multiplier: 1.0, leadtime_days: 4 },
              'Expedite': { multiplier: 1.4, leadtime_days: 3 }
            }
          },
          risk_matrix: {
            'thin_wall': { time_multiplier: 1.2, risk_percent: 5 },
            'undercut': { time_multiplier: 1.5, risk_flat: 50 }
          },
          overhead_margin: {
            overhead_percent: 25,
            target_margin_percent: 35
          }
        });
      }
    } catch (error) {
      console.error('Failed to load pricing config:', error);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const handleSavePricing = async () => {
    if (!pricingConfig) return;

    try {
      setIsSavingPricing(true);
      const response = await fetch('/api/admin/pricing/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingConfig)
      });

      if (response.ok) {
        setHasPricingChanges(false);
        setLastPricingSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to save pricing config:', error);
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handlePublishPricing = async () => {
    if (!pricingConfig) return;

    try {
      setIsSavingPricing(true);
      const response = await fetch('/api/admin/pricing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: pricingConfig })
      });

      if (response.ok) {
        const result = await response.json();
        setPricingConfig(prev => prev ? { ...prev, version: result.newVersion } : null);
        setHasPricingChanges(false);
        setLastPricingSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to publish pricing config:', error);
    } finally {
      setIsSavingPricing(false);
    }
  };

  const updatePricingConfig = (path: string, value: any) => {
    setPricingConfig(prev => {
      if (!prev) return prev;
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
    setHasPricingChanges(true);
  };

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('quotes');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [hasPricingChanges, setHasPricingChanges] = useState(false);
  const [lastPricingSaved, setLastPricingSaved] = useState<Date | null>(null);

  return (
    <DefaultLayout>
      <div className="grid grid-cols-1 gap-9">
        {/* Header with Navigation */}
        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-black dark:text-white">
                Admin Dashboard
              </h3>
              <div className="flex space-x-2">
                <Button
                  variant={activeTab === 'quotes' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('quotes')}
                >
                  Quote Management
                </Button>
                <Button
                  variant={activeTab === 'pricing' ? 'default' : 'outline'}
                  onClick={() => {
                    setActiveTab('pricing');
                    if (!pricingConfig) loadPricingConfig();
                  }}
                >
                  <CogIcon className="w-4 h-4 mr-2" />
                  Pricing Engine
                </Button>
                <Button
                  variant={activeTab === 'checkout' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('checkout')}
                >
                  <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                  Checkout Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'quotes' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
              <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <DocumentDuplicateIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-title-md font-bold text-black dark:text-white">
                      {quotes.length}
                    </h4>
                    <span className="text-sm font-medium">Total Quotes</span>
                  </div>
                </div>
              </div>

              <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <ClockIcon className="h-6 w-6 text-meta-5" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-title-md font-bold text-black dark:text-white">
                      {mockQuotes.filter(q => q.status === 'pending').length}
                    </h4>
                    <span className="text-sm font-medium">Pending Review</span>
                  </div>
                </div>
              </div>

              <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <CheckCircleIcon className="h-6 w-6 text-meta-3" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-title-md font-bold text-black dark:text-white">
                      {mockQuotes.filter(q => q.status === 'approved').length}
                    </h4>
                    <span className="text-sm font-medium">Approved</span>
                  </div>
                </div>
              </div>

              <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <DocumentDuplicateIcon className="h-6 w-6 text-meta-6" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-title-md font-bold text-black dark:text-white">
                      {formatCurrency(mockQuotes.reduce((sum, q) => sum + q.price, 0))}
                    </h4>
                    <span className="text-sm font-medium">Total Value</span>
                  </div>
                </div>
              </div>
            </div>

            </>
            ) : activeTab === 'pricing' ? (
          /* Pricing Configuration Tab */
          <div className="space-y-6">
            {/* Pricing Header */}
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CogIcon className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-black dark:text-white">
                        Pricing Engine Configuration
                      </h3>
                      <p className="text-sm text-gray-600">
                        Version {pricingConfig?.version || 'Loading...'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {lastPricingSaved && (
                      <span className="text-sm text-gray-500">
                        Last saved: {lastPricingSaved.toLocaleTimeString()}
                      </span>
                    )}
                    {hasPricingChanges && (
                      <Badge variant="secondary">Unsaved Changes</Badge>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleSavePricing}
                      disabled={!hasPricingChanges || isSavingPricing}
                    >
                      {isSavingPricing ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <SaveIcon className="w-4 h-4 mr-2" />
                      )}
                      Save Draft
                    </Button>
                    <Button
                      onClick={handlePublishPricing}
                      disabled={isSavingPricing}
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Publish New Version
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {isLoadingPricing ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mr-4" />
                <span className="text-gray-600">Loading pricing configuration...</span>
              </div>
            ) : pricingConfig ? (
              <Tabs defaultValue="machines" className="space-y-6">
                <TabsList className="grid w-full grid-cols-8">
                  <TabsTrigger value="machines">Machines</TabsTrigger>
                  <TabsTrigger value="materials">Materials</TabsTrigger>
                  <TabsTrigger value="finishes">Finishes</TabsTrigger>
                  <TabsTrigger value="tolerances">Tolerances</TabsTrigger>
                  <TabsTrigger value="inspection">Inspection</TabsTrigger>
                  <TabsTrigger value="speed">Speed/Region</TabsTrigger>
                  <TabsTrigger value="risk">Risk Matrix</TabsTrigger>
                  <TabsTrigger value="overhead">Overhead</TabsTrigger>
                </TabsList>

                {/* Machines Tab */}
                <TabsContent value="machines">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <WrenchScrewdriverIcon className="w-5 h-5 mr-2" />
                        Machine Configurations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(pricingConfig.machines).map(([key, machine]) => (
                        <div key={key} className="border rounded-lg p-4">
                          <h3 className="font-medium text-lg mb-4">{key}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <Label>Axes</Label>
                              <Input
                                type="number"
                                value={machine.axes}
                                onChange={(e) => updatePricingConfig(`machines.${key}.axes`, parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Hourly Rate ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={machine.hourly_rate}
                                onChange={(e) => updatePricingConfig(`machines.${key}.hourly_rate`, parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Setup Rate ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={machine.setup_rate}
                                onChange={(e) => updatePricingConfig(`machines.${key}.setup_rate`, parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Min Setup (min)</Label>
                              <Input
                                type="number"
                                value={machine.min_setup_min}
                                onChange={(e) => updatePricingConfig(`machines.${key}.min_setup_min`, parseInt(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Materials Tab */}
                <TabsContent value="materials">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CubeIcon className="w-5 h-5 mr-2" />
                        Material Configurations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(pricingConfig.materials).map(([key, material]) => (
                        <div key={key} className="border rounded-lg p-4">
                          <h3 className="font-medium text-lg mb-4">{key}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <Label>Density (kg/m³)</Label>
                              <Input
                                type="number"
                                value={material.density_kg_m3}
                                onChange={(e) => updatePricingConfig(`materials.${key}.density_kg_m3`, parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Buy Price ($/kg)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={material.buy_price}
                                onChange={(e) => updatePricingConfig(`materials.${key}.buy_price`, parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Waste Factor (%)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={material.waste_factor_percent}
                                onChange={(e) => updatePricingConfig(`materials.${key}.waste_factor_percent`, parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Machinability</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={material.machinability}
                                onChange={(e) => updatePricingConfig(`materials.${key}.machinability`, parseFloat(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Finishes Tab */}
                <TabsContent value="finishes">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PaintBrushIcon className="w-5 h-5 mr-2" />
                        Finish Configurations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(pricingConfig.finishes).map(([key, finish]) => (
                        <div key={key} className="border rounded-lg p-4">
                          <h3 className="font-medium text-lg mb-4">{key}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <Label>Model</Label>
                              <Select
                                value={finish.model}
                                onValueChange={(value) => updatePricingConfig(`finishes.${key}.model`, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="per_area">Per Area</SelectItem>
                                  <SelectItem value="per_part">Per Part</SelectItem>
                                  <SelectItem value="tiered">Tiered</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Rate ($)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={finish.rate}
                                onChange={(e) => updatePricingConfig(`finishes.${key}.rate`, parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Min Lot</Label>
                              <Input
                                type="number"
                                value={finish.min_lot}
                                onChange={(e) => updatePricingConfig(`finishes.${key}.min_lot`, parseInt(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Lead Time Add (days)</Label>
                              <Input
                                type="number"
                                value={finish.leadtime_add}
                                onChange={(e) => updatePricingConfig(`finishes.${key}.leadtime_add`, parseInt(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Speed/Region Tab */}
                <TabsContent value="speed">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                        Speed & Region Multipliers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {Object.entries(pricingConfig.speed_region).map(([region, speeds]) => (
                        <div key={region} className="border rounded-lg p-4">
                          <h3 className="font-medium text-lg mb-4">{region}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(speeds).map(([speed, config]) => (
                              <div key={speed} className="border rounded p-3">
                                <h4 className="font-medium mb-2">{speed}</h4>
                                <div className="space-y-2">
                                  <div>
                                    <Label>Multiplier</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={config.multiplier}
                                      onChange={(e) => updatePricingConfig(`speed_region.${region}.${speed}.multiplier`, parseFloat(e.target.value))}
                                    />
                                  </div>
                                  <div>
                                    <Label>Lead Time (days)</Label>
                                    <Input
                                      type="number"
                                      value={config.leadtime_days}
                                      onChange={(e) => updatePricingConfig(`speed_region.${region}.${speed}.leadtime_days`, parseInt(e.target.value))}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Overhead Tab */}
                <TabsContent value="overhead">
                  <Card>
                    <CardHeader>
                      <CardTitle>Overhead & Margin Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label>Overhead Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={pricingConfig.overhead_margin.overhead_percent}
                            onChange={(e) => updatePricingConfig('overhead_margin.overhead_percent', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Target Margin Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={pricingConfig.overhead_margin.target_margin_percent}
                            onChange={(e) => updatePricingConfig('overhead_margin.target_margin_percent', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Other tabs would follow the same pattern */}
                <TabsContent value="tolerances">
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      Tolerance pack configurations would be implemented here
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="inspection">
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      Inspection configurations would be implemented here
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="risk">
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      Risk matrix configurations would be implemented here
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load pricing configuration</p>
              </div>
            )}
          </div>
            ) : activeTab === 'checkout' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
              {/* Checkout Stats Cards */}
              <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <CurrencyDollarIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-title-md font-bold text-black dark:text-white">
                      $12,450
                    </h4>
                    <span className="text-sm font-medium">Revenue This Month</span>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-meta-3">
                    +12.5%
                  </span>
                </div>
              </div>

              <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <CheckCircleIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-title-md font-bold text-black dark:text-white">
                      23
                    </h4>
                    <span className="text-sm font-medium">Orders Completed</span>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-meta-3">
                    +8.2%
                  </span>
                </div>
              </div>

              <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <ClockIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-title-md font-bold text-black dark:text-white">
                      12
                    </h4>
                    <span className="text-sm font-medium">Abandoned Checkouts</span>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-meta-3">
                    -3.1%
                  </span>
                </div>
              </div>

              <div className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <h4 className="text-title-md font-bold text-black dark:text-white">
                      68%
                    </h4>
                    <span className="text-sm font-medium">Conversion Rate</span>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-meta-3">
                    +5.4%
                  </span>
                </div>
              </div>
            </div>

            {/* Checkout Analytics Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Checkout Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Checkout Started</span>
                      <span className="font-medium">100%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Billing Info Completed</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shipping Info Completed</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Payment Completed</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Order Confirmed</span>
                      <span className="font-medium">65%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Abandoned Checkouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">At Billing Step</span>
                      <span className="font-medium">15%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">At Shipping Step</span>
                      <span className="font-medium">7%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">At Payment Step</span>
                      <span className="font-medium">10%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Payment Failed</span>
                      <span className="font-medium">3%</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Run Abandonment Detection
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mock order data - would be fetched from API */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Order #ORD-2024-001</p>
                      <p className="text-sm text-gray-600">Quote #Q-12345 • $1,250.00</p>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Order #ORD-2024-002</p>
                      <p className="text-sm text-gray-600">Quote #Q-12346 • $3,450.00</p>
                    </div>
                    <Badge variant="secondary">Processing</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </DefaultLayout>
  );
};
