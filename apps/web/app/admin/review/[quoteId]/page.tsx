"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Clock, User, ArrowLeft, Send, MessageSquare, Eye, FileText, Settings } from 'lucide-react';

interface DfmFinding {
  id: string;
  check_id: string;
  severity: 'info' | 'warning' | 'blocker';
  message: string;
  metrics: any;
  face_ids: number[];
  edge_ids: number[];
  ack: boolean;
  note: string | null;
}

interface ReviewWorkspace {
  quote: {
    id: string;
    org_name: string;
    status: string;
    value_estimate: number;
  };
  lines: Array<{
    id: string;
    part_name: string;
    quantity: number;
    process: string;
    material: string;
    finish: string;
    dfm_status: string;
    unit_price: number;
    total_price: number;
  }>;
  dfm_results: {
    summary: {
      passed: number;
      total: number;
      warnings: number;
      blockers: number;
    };
    findings: DfmFinding[];
  };
  pricing: {
    subtotal: number;
    taxes: number;
    shipping: number;
    total: number;
  };
}

export default function ReviewerWorkspace() {
  const params = useParams();
  const quoteId = params?.quoteId as string;

  const [workspace, setWorkspace] = useState<ReviewWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('parts_pricing');
  const [selectedFinding, setSelectedFinding] = useState<DfmFinding | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<any>({});
  const [simulatedPrice, setSimulatedPrice] = useState<any>(null);
  const [showRequestChanges, setShowRequestChanges] = useState(false);

  useEffect(() => {
    loadWorkspace();
  }, [quoteId]);

  const loadWorkspace = async () => {
    try {
      const response = await fetch(`/api/admin/review/${quoteId}`);
      const data = await response.json();
      setWorkspace(data);
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePrice = async () => {
    try {
      const response = await fetch(`/api/admin/review/${quoteId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priceOverrides)
      });
      const data = await response.json();
      setSimulatedPrice(data);
    } catch (error) {
      console.error('Failed to simulate price:', error);
    }
  };

  const handleApplyOverrides = async (reason: any) => {
    try {
      await fetch(`/api/admin/review/${quoteId}/override`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: priceOverrides, reason })
      });
      loadWorkspace();
      setSimulatedPrice(null);
      setPriceOverrides({});
    } catch (error) {
      console.error('Failed to apply overrides:', error);
    }
  };

  const handleAcknowledgeFinding = async (findingId: string, note?: string) => {
    try {
      await fetch(`/api/admin/review/${quoteId}/dfm/${findingId}/ack`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      loadWorkspace();
    } catch (error) {
      console.error('Failed to acknowledge finding:', error);
    }
  };

  const handleRequestChanges = async (request: any) => {
    try {
      await fetch(`/api/admin/review/${quoteId}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      setShowRequestChanges(false);
    } catch (error) {
      console.error('Failed to request changes:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'blocker': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocker': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!workspace) {
    return <div>Failed to load workspace</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queue
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{workspace.quote.id}</h1>
              <p className="text-sm text-gray-600">{workspace.quote.org_name}</p>
            </div>
            <Badge variant="outline">{workspace.quote.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select>
              <SelectTrigger className="w-32">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Assign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_jane">Jane</SelectItem>
                <SelectItem value="user_john">John</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowRequestChanges(true)}>
              Request Changes
            </Button>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Approve & Send
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Pane */}
        <div className="flex-1 bg-white border-r">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b px-6 py-2">
              <TabsList>
                <TabsTrigger value="parts_pricing">Parts & Pricing</TabsTrigger>
                <TabsTrigger value="dfm">DFM ({workspace.dfm_results.summary.blockers} blockers)</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="parts_pricing" className="p-6 h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Process</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Finish</TableHead>
                    <TableHead>DFM</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspace.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.part_name}</TableCell>
                      <TableCell>{line.quantity}</TableCell>
                      <TableCell>{line.process}</TableCell>
                      <TableCell>{line.material}</TableCell>
                      <TableCell>{line.finish}</TableCell>
                      <TableCell>
                        <Badge className={line.dfm_status === 'blocker' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {line.dfm_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(line.unit_price)}</TableCell>
                      <TableCell>{formatCurrency(line.total_price)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="dfm" className="p-6 h-full overflow-auto">
              <div className="grid grid-cols-3 gap-6 h-full">
                {/* DFM Panel */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {workspace.dfm_results.summary.passed}/{workspace.dfm_results.summary.total} passed
                        • {workspace.dfm_results.summary.warnings} warnings
                        • {workspace.dfm_results.summary.blockers} blockers
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <div className="space-y-2">
                    {workspace.dfm_results.findings.map((finding) => (
                      <Card
                        key={finding.id}
                        className={`cursor-pointer transition-colors ${
                          selectedFinding?.id === finding.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedFinding(finding)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(finding.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getSeverityColor(finding.severity)}>
                                  {finding.severity}
                                </Badge>
                                <span className="text-xs text-gray-500">{finding.check_id}</span>
                              </div>
                              <p className="text-sm">{finding.message}</p>
                              {!finding.ack && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcknowledgeFinding(finding.id);
                                  }}
                                >
                                  Acknowledge
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 3D Viewer */}
                <div className="col-span-2">
                  <Card className="h-full">
                    <CardContent className="p-4 h-full flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>3D Viewer</p>
                        <p className="text-sm">Model would load here</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="p-6">
              <div className="space-y-4">
                {/* Activity timeline would go here */}
                <p className="text-gray-500">Activity timeline coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Pane */}
        <div className="w-96 bg-white border-l p-6 space-y-6 overflow-auto">
          {/* Pricing Overrides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pricing Overrides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Machine Rate ($/hr)</Label>
                  <Input
                    type="number"
                    value={priceOverrides.machine_rate_per_hr || ''}
                    onChange={(e) => setPriceOverrides({
                      ...priceOverrides,
                      machine_rate_per_hr: parseFloat(e.target.value)
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Setup Time (min)</Label>
                  <Input
                    type="number"
                    value={priceOverrides.machine_setup_min || ''}
                    onChange={(e) => setPriceOverrides({
                      ...priceOverrides,
                      machine_setup_min: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleSimulatePrice}>
                  Simulate
                </Button>
                <Button size="sm" disabled={!simulatedPrice}>
                  Apply Overrides
                </Button>
              </div>

              {simulatedPrice && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Original:</span>
                    <span>{formatCurrency(simulatedPrice.original.unit_price)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Simulated:</span>
                    <span>{formatCurrency(simulatedPrice.simulated.unit_price)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Δ:</span>
                    <span>{formatCurrency(simulatedPrice.diff.unit_price)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(workspace.pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes (est.)</span>
                <span>{formatCurrency(workspace.pricing.taxes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping (est.)</span>
                <span>{formatCurrency(workspace.pricing.shipping)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Grand Total</span>
                <span>{formatCurrency(workspace.pricing.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request Changes Modal */}
      <Dialog open={showRequestChanges} onOpenChange={setShowRequestChanges}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>To</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="org_admin">Org Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea placeholder="Describe the required changes..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleRequestChanges({})}>
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
