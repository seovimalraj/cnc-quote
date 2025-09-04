'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  EyeIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface OrderReviewStepProps {
  quote: any;
  onSave: (data: any) => void;
  saving: boolean;
}

export function OrderReviewStep({ quote, onSave, saving }: OrderReviewStepProps) {
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const handleDownloadQuotePDF = async () => {
    setPdfGenerating(true);
    try {
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In real implementation: trigger download with signed URL
      const link = document.createElement('a');
      link.href = `/api/quotes/${quote.id}/pdf`;
      link.download = `quote-${quote.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleProceedToPayment = () => {
    if (quote.has_blockers) {
      alert('DFM blockers must be resolved before proceeding to payment.');
      return;
    }

    onSave({
      snapshot_locked: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <EyeIcon className="h-5 w-5" />
          <span>Order Review</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Locked Specifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Locked Specifications</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQuotePDF}
              disabled={pdfGenerating}
              className="flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>{pdfGenerating ? 'Generating...' : 'Download Quote PDF'}</span>
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-600">Quote ID:</span>
                <div className="font-medium">{quote.id}</div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div className="font-medium">
                  <Badge variant="secondary">{quote.status}</Badge>
                </div>
              </div>
              <div>
                <span className="text-gray-600">Lead Time:</span>
                <div className="font-medium">
                  {quote.selected_lead_time.business_days} business days
                </div>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <div className="font-medium">${quote.total_due.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Parts Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Process</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Finish</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Lead Option</TableHead>
                <TableHead>Price/Unit</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.lines.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.file_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">CNC Machining</Badge>
                  </TableCell>
                  <TableCell>{line.material}</TableCell>
                  <TableCell>{line.finish}</TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{line.lead_option}</Badge>
                  </TableCell>
                  <TableCell>${line.price_per_unit.toFixed(2)}</TableCell>
                  <TableCell>${line.line_total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Specifications Locked</h4>
                <p className="text-sm text-blue-700 mt-1">
                  These specifications are now locked for payment. Any changes will require creating a new quote.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Disclaimers */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Terms & Disclaimers</h3>

          <div className="space-y-4 text-sm text-gray-700">
            <div className="bg-gray-50 rounded-lg p-4">
              <p>
                <strong>Prototype Pricing:</strong> Prototype prices include applicable tariffs; production orders may incur additional tariffs.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p>
                <strong>Free Shipping:</strong> Applicable for small parcel orders; freight and non-US destinations billed at checkout or invoicing.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p>
                <strong>Manufacturing Standards:</strong> Manufacturing will follow organization's standard unless otherwise specified.
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Parts ({quote.parts_count}):</span>
              <span>${quote.item_subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping (estimated):</span>
              <span>${quote.estimated_shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (estimated):</span>
              <span>${quote.estimated_tax.toFixed(2)}</span>
            </div>
            {quote.discounts > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discounts:</span>
                <span>-${quote.discounts.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Due Now:</span>
                <span>${quote.total_due.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* DFM Blocker Warning */}
        {quote.has_blockers && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 text-red-600 mt-0.5">⚠️</div>
              <div>
                <h4 className="text-sm font-medium text-red-900">DFM Blockers Present</h4>
                <p className="text-sm text-red-700 mt-1">
                  DFM blockers must be resolved or overridden before payment can be processed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline">
            Back
          </Button>
          <Button
            onClick={handleProceedToPayment}
            disabled={saving || quote.has_blockers}
            className="px-8"
          >
            {saving ? 'Processing...' : 'Proceed to Payment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
