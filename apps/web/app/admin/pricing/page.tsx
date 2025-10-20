'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  CogIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline';
import type { AdminPricingConfig as PricingConfig } from '@cnc-quote/shared';
import { RevisionAssistantPanel } from '@/components/admin/pricing/RevisionAssistantPanel';

type PricingConfigMeta = {
  status: 'draft' | 'published' | 'default';
  updated_at?: string;
  published_at?: string;
};

export default function AdminPricingPage() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [meta, setMeta] = useState<PricingConfigMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assistantRunId, setAssistantRunId] = useState<string | null>(null);

  useEffect(() => {
    loadPricingConfig();
  }, []);

  const loadPricingConfig = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const response = await fetch('/api/admin/pricing/config');
      if (!response.ok) {
        throw new Error(`Failed to load pricing config (${response.status})`);
      }

      const payload = await response.json();
      const nextConfig: PricingConfig = payload?.config ?? payload;
      setConfig(nextConfig);
  setAssistantRunId(null);

      const nextMeta: PricingConfigMeta = {
        status: payload?.status ?? payload?.meta?.status ?? 'draft',
        updated_at: payload?.updated_at ?? payload?.meta?.updated_at,
        published_at: payload?.published_at ?? payload?.meta?.published_at,
      };
      setMeta(nextMeta);
      setHasChanges(false);
      if (nextMeta.updated_at) {
        setLastSaved(new Date(nextMeta.updated_at));
      } else {
        setLastSaved(null);
      }
    } catch (error) {
      console.error('Failed to load pricing config:', error);
      setLoadError((error as Error).message);
      setConfig(null);
      setMeta(null);
      setLastSaved(null);
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

      if (!response.ok) {
        throw new Error(`Failed to save pricing config (${response.status})`);
      }

      const payload = await response.json();
      const nextConfig: PricingConfig = payload?.config ?? config;
      const nextMeta: PricingConfigMeta = {
        status: payload?.status ?? payload?.meta?.status ?? meta?.status ?? 'draft',
        updated_at: payload?.updated_at ?? payload?.meta?.updated_at,
        published_at: payload?.published_at ?? payload?.meta?.published_at ?? meta?.published_at,
      };

      setConfig(nextConfig);
      setMeta(nextMeta);
      setHasChanges(false);
      if (nextMeta.updated_at) {
        setLastSaved(new Date(nextMeta.updated_at));
      } else {
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
      const payloadToSend: Record<string, unknown> = { config };
      if (assistantRunId) {
        payloadToSend.assistantRunId = assistantRunId;
      }

      const response = await fetch('/api/admin/pricing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSend)
      });

      if (!response.ok) {
        throw new Error(`Failed to publish pricing config (${response.status})`);
      }

      const payload = await response.json();
      const nextConfig: PricingConfig = payload?.config ?? config;
      const nextMeta: PricingConfigMeta = {
        status: payload?.status ?? payload?.meta?.status ?? 'published',
        updated_at: payload?.updated_at ?? payload?.meta?.updated_at,
        published_at: payload?.published_at ?? payload?.meta?.published_at,
      };

      setConfig(nextConfig);
      setMeta(nextMeta);
      setHasChanges(false);
      if (nextMeta.updated_at || nextMeta.published_at) {
        setLastSaved(new Date(nextMeta.updated_at ?? nextMeta.published_at!));
      } else {
        setLastSaved(new Date());
      }
      setAssistantRunId(null);
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
    setAssistantRunId(null);
    setMeta(prev => {
      if (!prev) {
        return { status: 'draft' };
      }
      if (prev.status === 'draft') {
        return { ...prev, updated_at: undefined };
      }
      return { status: 'draft', published_at: prev.published_at };
    });
    setLastSaved(null);
  };

  const handleApplyProposal = useCallback((proposal: PricingConfig, context: { runId: string }) => {
    setConfig(proposal);
    setHasChanges(true);
    setMeta(prev => ({ status: 'draft', updated_at: undefined, published_at: prev?.published_at }));
    setLastSaved(null);
    setAssistantRunId(context.runId);
  }, []);

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

  if (!config) {
    return (
      <RequireAnyRole roles={['admin','org_admin','finance']} fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <CogIcon className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-gray-600">Unable to load pricing configuration.</p>
            {loadError && <p className="text-sm text-red-600">{loadError}</p>}
            <Button onClick={loadPricingConfig} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </RequireAnyRole>
    );
  }

  return (
    <RequireAnyRole roles={['admin','org_admin','finance']} fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}>
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
              {meta && (
                <Badge
                  variant={meta.status === 'published' ? 'default' : 'outline'}
                  className={meta.status === 'published' ? 'bg-green-600 text-white' : ''}
                >
                  {meta.status === 'default'
                    ? 'System Default'
                    : `${meta.status.charAt(0).toUpperCase()}${meta.status.slice(1)}`}
                </Badge>
              )}
              {meta?.published_at && meta.status === 'published' && (
                <span className="text-xs text-gray-500">
                  Published {new Date(meta.published_at).toLocaleString()}
                </span>
              )}
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {hasChanges && (
                <Badge variant="secondary">Unsaved Changes</Badge>
              )}
              <Button variant="outline" asChild>
                <Link href="/admin/pricing/sandbox">Simulation Sandbox</Link>
              </Button>
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
        <div className="grid gap-6 mb-8">
          <RevisionAssistantPanel currentConfig={config} onApplyProposal={handleApplyProposal} />
        </div>
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
    </RequireAnyRole>
  );
}
