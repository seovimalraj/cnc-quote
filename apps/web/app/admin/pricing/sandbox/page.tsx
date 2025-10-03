"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowPathIcon, BeakerIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SimulationForm {
  process_type: 'milling' | 'turning' | 'laser_cutting' | 'press_brake' | 'injection';
  machine_id: string;
  material_id: string;
  finish_ids: string[];
  quantity: number;
  is_rush: boolean;
  complexity_multiplier: number;
  volume_cc?: number;
  surface_area_cm2?: number;
  removed_material_cc?: number;
  features?: any;
  include_v2_matrix?: boolean;
  quantities?: number[];
}

interface SimulationResult {
  simulation: any;
  v2_matrix?: any;
  quantities: number[];
  timestamp: string;
  engine_versions: { primary: string; comparison?: string };
}

const defaultForm: SimulationForm = {
  process_type: 'milling',
  machine_id: 'machine_generic',
  material_id: 'material_generic',
  finish_ids: [],
  quantity: 10,
  is_rush: false,
  complexity_multiplier: 1.0,
  volume_cc: 50,
  surface_area_cm2: 120,
  removed_material_cc: 30,
  features: { holes: 4, pockets: 2, slots: 1, faces: 5 },
  include_v2_matrix: true,
  quantities: [1, 10, 50]
};

export default function PricingSandboxPage() {
  const [form, setForm] = useState<SimulationForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [autoSimulate, setAutoSimulate] = useState(true);

  // Debounce simulation
  useEffect(() => {
    if (!autoSimulate) return;
    const t = setTimeout(() => {
      runSimulation();
    }, 500);
    return () => clearTimeout(t);
  }, [form, autoSimulate]);

  const updateField = (key: keyof SimulationForm, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const updateQuantityList = (value: string) => {
    const nums = value.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n) && n > 0);
    updateField('quantities', nums);
  };

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/admin/pricing/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Simulation failed');
      } else {
        setResult(data);
        setLastRun(new Date());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [form]);

  return (
    <RequireAnyRole roles={['admin','org_admin','finance','reviewer']} fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}>
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center"><BeakerIcon className="w-6 h-6 mr-2 text-indigo-600"/>Pricing Simulation Sandbox</h1>
            <p className="text-sm text-gray-600">Experiment with pricing parameters without persisting quote data.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch checked={autoSimulate} onCheckedChange={setAutoSimulate} />
              <span className="text-sm text-gray-600">Auto simulate</span>
            </div>
            <Button onClick={runSimulation} disabled={loading} variant="outline">
              {loading && <ArrowPathIcon className="w-4 h-4 animate-spin mr-2"/>}
              Run Simulation
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="process_type" className="block text-sm font-medium mb-1">Process Type</label>
                <Select value={form.process_type} onValueChange={v => updateField('process_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milling">CNC Milling</SelectItem>
                    <SelectItem value="turning">CNC Turning</SelectItem>
                    <SelectItem value="laser_cutting">Laser Cutting</SelectItem>
                    <SelectItem value="press_brake">Press Brake</SelectItem>
                    <SelectItem value="injection">Injection Molding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="machine_id" className="block text-sm font-medium mb-1">Machine ID</label>
                <Input id="machine_id" value={form.machine_id} onChange={e => updateField('machine_id', e.target.value)} />
              </div>
              <div>
                <label htmlFor="material_id" className="block text-sm font-medium mb-1">Material ID</label>
                <Input id="material_id" value={form.material_id} onChange={e => updateField('material_id', e.target.value)} />
              </div>
              <div>
                <label htmlFor="finish_ids" className="block text-sm font-medium mb-1">Finish IDs (comma)</label>
                <Input id="finish_ids" value={form.finish_ids.join(',')} onChange={e => updateField('finish_ids', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium mb-1">Quantity</label>
                  <Input id="quantity" type="number" value={form.quantity} onChange={e => updateField('quantity', parseInt(e.target.value, 10) || 1)} />
                </div>
                <div>
                  <label htmlFor="quantities_curve" className="block text-sm font-medium mb-1">Quantities Curve</label>
                  <Input id="quantities_curve" placeholder="1,10,50" defaultValue={form.quantities?.join(',')} onBlur={e => updateQuantityList(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="complexity_multiplier" className="block text-sm font-medium mb-1">Complexity Multiplier</label>
                  <Input id="complexity_multiplier" type="number" step="0.05" value={form.complexity_multiplier} onChange={e => updateField('complexity_multiplier', parseFloat(e.target.value) || 1)} />
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <Switch checked={form.is_rush} onCheckedChange={v => updateField('is_rush', v)} />
                  <span className="text-sm">Rush</span>
                </div>
              </div>
              {(form.process_type === 'milling' || form.process_type === 'turning') && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="volume_cc" className="block text-xs font-medium mb-1">Volume (cc)</label>
                    <Input id="volume_cc" type="number" value={form.volume_cc} onChange={e => updateField('volume_cc', parseFloat(e.target.value)||0)} />
                  </div>
                  <div>
                    <label htmlFor="surface_area_cm2" className="block text-xs font-medium mb-1">Surface (cm²)</label>
                    <Input id="surface_area_cm2" type="number" value={form.surface_area_cm2} onChange={e => updateField('surface_area_cm2', parseFloat(e.target.value)||0)} />
                  </div>
                  <div>
                    <label htmlFor="removed_material_cc" className="block text-xs font-medium mb-1">Removed (cc)</label>
                    <Input id="removed_material_cc" type="number" value={form.removed_material_cc} onChange={e => updateField('removed_material_cc', parseFloat(e.target.value)||0)} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center">Include V2 Matrix <Switch className="ml-2" checked={form.include_v2_matrix} onCheckedChange={v => updateField('include_v2_matrix', v)} /></label>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5 text-indigo-600"/><span>Results</span>
                {lastRun && <Badge variant="outline">{lastRun.toLocaleTimeString()}</Badge>}
              </CardTitle>
              {result?.engine_versions?.comparison && (
                <Badge variant="secondary">Comparing V2</Badge>
              )}
            </CardHeader>
            <CardContent>
              {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
              {!error && !result && (
                <div className="text-sm text-gray-500">Adjust inputs to run a simulation.</div>
              )}
              {result && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-3 bg-white border rounded shadow-sm">
                      <div className="text-xs uppercase text-gray-500">Unit Price</div>
                      <div className="text-lg font-semibold">${result.simulation.unit_price.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-white border rounded shadow-sm">
                      <div className="text-xs uppercase text-gray-500">Total Price</div>
                      <div className="text-lg font-semibold">${result.simulation.total_price.toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-white border rounded shadow-sm">
                      <div className="text-xs uppercase text-gray-500">Lead Time (days)</div>
                      <div className="text-lg font-semibold">{result.simulation.lead_time_days}</div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-2">Breakdown</h3>
                    <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {Object.entries(result.simulation.breakdown).map(([k,v]) => (
                        <div key={k} className="p-2 bg-white border rounded text-center">
                          <div className="text-[10px] uppercase tracking-wide text-gray-500">{k.replace(/_/g,' ')}</div>
                          <div className="text-sm font-medium">${typeof v === 'number' ? v.toFixed(2) : v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {result.v2_matrix && !result.v2_matrix.error && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">V2 Quantity Curve</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="p-2 text-left">Qty</th>
                              <th className="p-2 text-left">Unit Price</th>
                              <th className="p-2 text-left">Total Price</th>
                              <th className="p-2 text-left">Margin %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.v2_matrix.map((row: any) => (
                              <tr key={row.quantity} className="border-b">
                                <td className="p-2">{row.quantity}</td>
                                <td className="p-2">${row.unit_price?.toFixed?.(2) ?? '-'}</td>
                                <td className="p-2">${row.total_price?.toFixed?.(2) ?? '-'}</td>
                                <td className="p-2">{(row.margin_percentage * 100).toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {result.v2_matrix?.error && (
                    <div className="text-xs text-amber-600">V2 matrix error: {result.v2_matrix.error}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireAnyRole>
  );
}
