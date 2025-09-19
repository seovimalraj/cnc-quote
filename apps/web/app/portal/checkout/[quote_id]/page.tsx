'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  CalculatorIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { ReviewComplianceStep } from '@/components/checkout/ReviewComplianceStep';
import { BillingStep } from '@/components/checkout/BillingStep';
import { ShippingStep } from '@/components/checkout/ShippingStep';
import { TaxStep } from '@/components/checkout/TaxStep';
import { OrderReviewStep } from '@/components/checkout/OrderReviewStep';
import { trackEvent } from '@/lib/analytics/posthog';
interface Quote {
  id: string;
  status: string;
  has_blockers: boolean;
  parts_count: number;
  selected_lead_time: {
    region: string;
    speed: string;
    business_days: number;
  };
  item_subtotal: number;
  estimated_shipping: number;
  estimated_tax: number;
  discounts: number;
  total_due: number;
  lines: QuoteLine[];
}

interface QuoteLine {
  id: string;
  file_name: string;
  quantity: number;
  material: string;
  finish: string;
  lead_option: string;
  price_per_unit: number;
  line_total: number;
}

interface CheckoutState {
  currentStep: number;
  compliance: {
    itar_onshore_only?: boolean;
    dfars_materials?: boolean;
    export_ack: boolean;
  };
  billing: {
    address: Address;
    selected_payment_method_id?: string;
    po?: string;
  };
  shipping: {
    address: Address;
    incoterm: string;
    shipping_rate_id?: string;
    delivery_notes?: string;
  };
  tax: {
    tax_id_value?: string;
    exempt_toggle: boolean;
    certificate_file_id?: string;
  };
  snapshot_locked: boolean;
}

interface Address {
  company?: string;
  attention?: string;
  street1: string;
  street2?: string;
  city: string;
  state_province?: string;
  postal_code: string;
  country: string;
  phone?: string;
}

const STEPS = [
  { id: 1, title: 'Review & Compliance', icon: ShieldCheckIcon },
  { id: 2, title: 'Billing', icon: DocumentTextIcon },
  { id: 3, title: 'Shipping & Incoterms', icon: TruckIcon },
  { id: 4, title: 'Tax', icon: CalculatorIcon },
  { id: 5, title: 'Order Review', icon: EyeIcon },
  { id: 6, title: 'Payment', icon: CreditCardIcon },
];

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
    const quoteId = params?.quote_id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    currentStep: 1,
    compliance: { export_ack: false },
    billing: { address: { street1: '', city: '', postal_code: '', country: '' } },
    shipping: { address: { street1: '', city: '', postal_code: '', country: '' }, incoterm: 'DAP' },
    tax: { exempt_toggle: false },
    snapshot_locked: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mock data
  const mockQuote: Quote = {
    id: quoteId,
    status: 'draft',
    has_blockers: false,
    parts_count: 3,
    selected_lead_time: {
      region: 'US',
      speed: 'Standard',
      business_days: 14,
    },
    item_subtotal: 2500.00,
    estimated_shipping: 150.00,
    estimated_tax: 225.00,
    discounts: 0,
    total_due: 2875.00,
    lines: [
      {
        id: 'line-1',
        file_name: 'bracket.step',
        quantity: 10,
        material: 'Aluminum 6061',
        finish: 'Anodized',
        lead_option: 'Standard',
        price_per_unit: 25.00,
        line_total: 250.00,
      },
      {
        id: 'line-2',
        file_name: 'housing.iges',
        quantity: 5,
        material: 'Steel 1018',
        finish: 'None',
        lead_option: 'Standard',
        price_per_unit: 45.00,
        line_total: 225.00,
      },
    ],
  };

  useEffect(() => {
    // Track page view
    trackEvent('checkout_view', { quote_id: quoteId });

    // Simulate API call
    const fetchQuote = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQuote(mockQuote);
      setLoading(false);
    };

    fetchQuote();
  }, [quoteId]);

  const handleStepChange = (step: number) => {
    setCheckoutState(prev => ({ ...prev, currentStep: step }));
    trackEvent('checkout_step_change', { quote_id: quoteId, step });
  };

  const handleSaveStep = async (stepData: any) => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setCheckoutState(prev => ({
        ...prev,
        ...stepData,
        currentStep: prev.currentStep + 1,
      }));

      // Track step completion
      const stepNames = ['compliance_saved', 'billing_saved', 'shipping_saved', 'tax_saved'];
      if (checkoutState.currentStep <= 4) {
        trackEvent(stepNames[checkoutState.currentStep - 1], { quote_id: quoteId });
      }
    } catch (error) {
      console.error('Failed to save step:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (checkoutState.currentStep) {
      case 1:
        return <ReviewComplianceStep quote={quote} onSave={handleSaveStep} saving={saving} />;
      case 2:
        return <BillingStep quote={quote} onSave={handleSaveStep} saving={saving} />;
      case 3:
        return <ShippingStep quote={quote} onSave={handleSaveStep} saving={saving} />;
      case 4:
        return <TaxStep quote={quote} onSave={handleSaveStep} saving={saving} />;
      case 5:
        return <OrderReviewStep quote={quote} onSave={handleSaveStep} saving={saving} />;
      case 6:
        return <PaymentStep quote={quote} onSave={handleSaveStep} saving={saving} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quote Not Found</h2>
          <p className="text-gray-600">The quote you're looking for doesn't exist or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button
                onClick={() => router.push('/portal/dashboard')}
                className="hover:text-gray-900"
              >
                Dashboard
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <button
                onClick={() => router.push('/portal/quotes')}
                className="hover:text-gray-900"
              >
                Quotes
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <button
                onClick={() => router.push(`/portal/quotes/${quoteId}`)}
                className="hover:text-gray-900"
              >
                {quoteId}
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="font-medium text-gray-900">Checkout</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => router.push(`/portal/quotes/${quoteId}`)}
                variant="outline"
              >
                Back to Quote
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side - Steps */}
          <div className="lg:col-span-8 space-y-6">
            {/* Stepper */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = step.id === checkoutState.currentStep;
                    const isCompleted = step.id < checkoutState.currentStep;

                    return (
                      <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                              isCompleted
                                ? 'bg-green-500 border-green-500 text-white'
                                : isActive
                                ? 'border-blue-500 text-blue-500'
                                : 'border-gray-300 text-gray-400'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircleIcon className="w-5 h-5" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>
                          <span
                            className={`mt-2 text-xs font-medium ${
                              isActive ? 'text-blue-600' : 'text-gray-500'
                            }`}
                          >
                            {step.title}
                          </span>
                        </div>
                        {index < STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-4 ${
                              step.id < checkoutState.currentStep ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Step Content */}
            {renderStepContent()}
          </div>

          {/* Right Side - Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Parts</span>
                    <span>{quote.parts_count} parts</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Lead Time</span>
                    <span>
                      {quote.selected_lead_time.region} {quote.selected_lead_time.speed} ({quote.selected_lead_time.business_days} days)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${quote.item_subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping (est.)</span>
                    <span>${quote.estimated_shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (est.)</span>
                    <span>${quote.estimated_tax.toFixed(2)}</span>
                  </div>
                  {quote.discounts > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discounts</span>
                      <span>-${quote.discounts.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Due Now</span>
                    <span>${quote.total_due.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* DFM Gate Banner */}
              {quote.has_blockers && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">DFM Blockers Present</h3>
                        <p className="text-sm text-red-700 mt-1">
                          DFM blockers must be resolved or overridden before payment.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
