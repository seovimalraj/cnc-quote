'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { MetricsPanel } from '@/components/viewer/MetricsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import type {
  CncPriceRequest,
  SheetMetalPriceRequest,
  InjectionMoldingPriceRequest,
  PriceResponse
} from '@cnc-quote/shared';

const supabase = createClient();

export default function SimulatePage() {
  const { id: machineId } = useParams();
  const [machine, setMachine] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [priceResponse, setPriceResponse] = useState<PriceResponse | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load machine details
    if (machineId) {
      supabase
        .from('machines')
        .select('*, complexity_settings(*), complexity_brackets(*)')
        .eq('id', machineId)
        .single()
        .then(({ data }) => {
          if (data) {
            setMachine(data);
          }
        });
    }
  }, [machineId]);

  const handleFileSelect = async (file: any) => {
    setSelectedFile(file);
    setIsLoading(true);

    try {
      // Get preview URL
      const previewRes = await fetch(`/api/cad/preview/${file.id}`);
      const previewData = await previewRes.json();
      setPreviewUrl(previewData.url);

      // Get analysis
      const analysisRes = await fetch(`/api/cad/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id }),
      });
      const { taskId } = await analysisRes.json();

      // Poll for analysis completion
      const interval = setInterval(async () => {
        const res = await fetch(`/api/cad/analysis/${taskId}`);
        const result = await res.json();
        
        if (res.status === 200) {
          clearInterval(interval);
          setMetrics(result);
          await calculatePrice(result);
          setIsLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to analyze file',
        variant: 'destructive',
      });
    }
  };

  const calculatePrice = async (metrics: any) => {
    if (!machine || !metrics) return;

    const baseRequest = {
      machine_id: machineId as string,
      quantity,
      is_rush: false,
    };

    let priceRequest;

    switch (machine.process_type) {
      case 'milling':
      case 'turning':
        priceRequest = {
          ...baseRequest,
          process_type: machine.process_type,
          volume_cc: metrics.volume,
          surface_area_cm2: metrics.surface_area,
          removed_material_cc: metrics.volume * 0.3, // Estimate
          features: metrics.primitive_features,
          complexity_multiplier: 1.0, // Will be calculated
        } as CncPriceRequest;
        break;

      case 'laser':
      case 'punch':
      case 'waterjet':
        priceRequest = {
          ...baseRequest,
          process_type: machine.process_type,
          thickness_mm: 3, // Example
          cut_length_mm: metrics.bbox.max.x * 2 + metrics.bbox.max.y * 2,
          pierces: metrics.primitive_features.holes,
          nest_utilization: 0.8,
        } as SheetMetalPriceRequest;
        break;

      case 'injection_molding':
        priceRequest = {
          ...baseRequest,
          process_type: 'injection_molding',
          part_volume_cc: metrics.volume,
          shot_weight_g: metrics.volume * 1.05, // Density estimate
          cycle_time_s: 30, // Example
          cavity_count: 1,
          tonnage_required: metrics.surface_area * 0.1, // Estimate
          cooling_time_s: 15,
        } as InjectionMoldingPriceRequest;
        break;
    }

    try {
      const res = await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priceRequest),
      });
      const data = await res.json();
      setPriceResponse(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate price',
        variant: 'destructive',
      });
    }
  };

  if (!machine) return null;

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Price Simulator - {machine.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="file">
            <TabsList>
              <TabsTrigger value="file">From File</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  {selectedFile ? (
                    <>
                      {previewUrl ? (
                        <ModelViewer url={previewUrl} showWireframe />
                      ) : (
                        <div className="flex items-center justify-center h-[400px] bg-background border rounded-lg">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setSelectedFile(null)}
                      >
                        Choose Another File
                      </Button>
                    </>
                  ) : (
                    <div className="h-[400px] border rounded-lg p-4">
                      {/* File selector */}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(parseInt(e.target.value));
                        if (metrics) calculatePrice(metrics);
                      }}
                    />
                  </div>

                  {metrics && <MetricsPanel metrics={metrics} />}

                  {priceResponse && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Price Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Unit Price</span>
                            <span>${priceResponse.unit_price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Price</span>
                            <span>${priceResponse.total_price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Lead Time</span>
                            <span>{priceResponse.lead_time_days} days</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual">
              {/* Manual metric entry form */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
