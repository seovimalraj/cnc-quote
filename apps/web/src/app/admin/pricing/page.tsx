'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  CogIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline';

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

export default function AdminPricingPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadPricingConfig();
  }, []);

  const loadPricingConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/pricing/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        // Use mock data if API doesn't exist yet
        setConfig({
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
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/pricing/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setHasChanges(false);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to save pricing config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/pricing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });

      if (response.ok) {
        const result = await response.json();
        setConfig(prev => prev ? { ...prev, version: result.newVersion } : null);
        setHasChanges(false);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to publish pricing config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
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
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading pricing configuration...</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <CogIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Pricing Engine Admin</h1>
                <p className="text-sm text-gray-600">Version {config.version}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {hasChanges && (
                <Badge variant="secondary">Unsaved Changes</Badge>
              )}
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <DocumentCheckIcon className="w-4 h-4 mr-2" />
                )}
                Save Draft
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isSaving}
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Publish New Version
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                {Object.entries(config.machines).map(([key, machine]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-4">{key}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Axes</Label>
                        <Input
                          type="number"
                          value={machine.axes}
                          onChange={(e) => updateConfig(`machines.${key}.axes`, parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Hourly Rate ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={machine.hourly_rate}
                          onChange={(e) => updateConfig(`machines.${key}.hourly_rate`, parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Setup Rate ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={machine.setup_rate}
                          onChange={(e) => updateConfig(`machines.${key}.setup_rate`, parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Min Setup (min)</Label>
                        <Input
                          type="number"
                          value={machine.min_setup_min}
                          onChange={(e) => updateConfig(`machines.${key}.min_setup_min`, parseInt(e.target.value))}
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
                {Object.entries(config.materials).map(([key, material]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-4">{key}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Density (kg/m³)</Label>
                        <Input
                          type="number"
                          value={material.density_kg_m3}
                          onChange={(e) => updateConfig(`materials.${key}.density_kg_m3`, parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Buy Price ($/kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={material.buy_price}
                          onChange={(e) => updateConfig(`materials.${key}.buy_price`, parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Waste Factor (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={material.waste_factor_percent}
                          onChange={(e) => updateConfig(`materials.${key}.waste_factor_percent`, parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Machinability</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={material.machinability}
                          onChange={(e) => updateConfig(`materials.${key}.machinability`, parseFloat(e.target.value))}
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
                {Object.entries(config.finishes).map(([key, finish]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <h3 className="font-medium text-lg mb-4">{key}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Model</Label>
                        <Select
                          value={finish.model}
                          onValueChange={(value) => updateConfig(`finishes.${key}.model`, value)}
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
                          onChange={(e) => updateConfig(`finishes.${key}.rate`, parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Min Lot</Label>
                        <Input
                          type="number"
                          value={finish.min_lot}
                          onChange={(e) => updateConfig(`finishes.${key}.min_lot`, parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Lead Time Add (days)</Label>
                        <Input
                          type="number"
                          value={finish.leadtime_add}
                          onChange={(e) => updateConfig(`finishes.${key}.leadtime_add`, parseInt(e.target.value))}
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
                {Object.entries(config.speed_region).map(([region, speeds]) => (
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
                                onChange={(e) => updateConfig(`speed_region.${region}.${speed}.multiplier`, parseFloat(e.target.value))}
                              />
                            </div>
                            <div>
                              <Label>Lead Time (days)</Label>
                              <Input
                                type="number"
                                value={config.leadtime_days}
                                onChange={(e) => updateConfig(`speed_region.${region}.${speed}.leadtime_days`, parseInt(e.target.value))}
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
                      value={config.overhead_margin.overhead_percent}
                      onChange={(e) => updateConfig('overhead_margin.overhead_percent', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Target Margin Percentage (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.overhead_margin.target_margin_percent}
                      onChange={(e) => updateConfig('overhead_margin.target_margin_percent', parseFloat(e.target.value))}
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
      </div>
    </div>
  );
}
