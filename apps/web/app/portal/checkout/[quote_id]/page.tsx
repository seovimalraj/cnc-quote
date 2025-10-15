'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ContractsVNext } from '@cnc-quote/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
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
import { CheckoutQuoteSummary, transformQuoteToCheckoutSummary } from '@/lib/checkout/quoteTransform';
interface CheckoutState {
  currentStep: number;
  compliance: {
    itar_onshore_only?: boolean;
    dfars_materials?: boolean;
    export_ack: boolean;
  };
  billing: {
    address: Address;
    address_book_id?: string;
    selected_payment_method_id?: string;
    po?: string;
  };
  shipping: {
    address: Address;
    address_book_id?: string;
    incoterm: string;
    shipping_rate_id?: string;
    delivery_notes?: string;
    selected_rate?: ContractsVNext.ShippingRateVNext | null;
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
  { id: 1, title: 'Review & Compliance', slug: 'review_compliance', icon: ShieldCheckIcon },
  { id: 2, title: 'Billing', slug: 'billing', icon: DocumentTextIcon },
  { id: 3, title: 'Shipping & Incoterms', slug: 'shipping', icon: TruckIcon },
  { id: 4, title: 'Tax', slug: 'tax', icon: CalculatorIcon },
  { id: 5, title: 'Order Review', slug: 'order_review', icon: EyeIcon },
  { id: 6, title: 'Payment', slug: 'payment', icon: CreditCardIcon },
] as const;

type CheckoutStep = typeof STEPS[number];
type StepSlug = CheckoutStep['slug'];

const STEP_EVENT_MAP: Partial<Record<StepSlug, string>> = {
  review_compliance: 'compliance_saved',
  billing: 'billing_saved',
  shipping: 'shipping_saved',
  tax: 'tax_saved',
};

interface PersistedCheckoutStep {
  step_id: string;
  payload: Record<string, unknown> | null;
}

const sanitizeForPersistence = (payload: Partial<CheckoutState>) => {
  const replacer = (_key: string, value: unknown) => {
    if (typeof File !== 'undefined' && value instanceof File) {
      return {
        name: value.name,
        type: value.type,
        size: value.size,
        lastModified: value.lastModified,
      };
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  };

  try {
    return JSON.parse(JSON.stringify(payload, replacer));
  } catch (error) {
    console.warn('Failed to serialize checkout payload for persistence:', error);
    return payload;
  }
};

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params?.quote_id as string;

  const mergePersistedStep = useCallback((draft: CheckoutState, step: PersistedCheckoutStep) => {
    if (!step || typeof step.step_id !== 'string') {
      return 0;
    }

    const stepIndex = STEPS.findIndex((entry) => entry.slug === step.step_id);
    if (stepIndex === -1) {
      return 0;
    }

    const payload = step.payload;
    if (!payload || typeof payload !== 'object') {
      return stepIndex + 1;
    }

    if ('compliance' in payload && typeof payload.compliance === 'object' && payload.compliance !== null) {
      draft.compliance = {
        ...draft.compliance,
        ...(payload.compliance as CheckoutState['compliance']),
      };
    }

    if ('billing' in payload && typeof payload.billing === 'object' && payload.billing !== null) {
      draft.billing = {
        ...draft.billing,
        ...(payload.billing as CheckoutState['billing']),
      };
    }

    if ('shipping' in payload && typeof payload.shipping === 'object' && payload.shipping !== null) {
      draft.shipping = {
        ...draft.shipping,
        ...(payload.shipping as CheckoutState['shipping']),
      };
    }

    if ('tax' in payload && typeof payload.tax === 'object' && payload.tax !== null) {
      draft.tax = {
        ...draft.tax,
        ...(payload.tax as CheckoutState['tax']),
      };
    }

    if ('snapshot_locked' in payload && typeof payload.snapshot_locked === 'boolean') {
      draft.snapshot_locked = payload.snapshot_locked;
    }

    return stepIndex + 1;
  }, []);

  const [quote, setQuote] = useState<CheckoutQuoteSummary | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    currentStep: 1,
    compliance: { export_ack: false },
    billing: {
      address: {
        company: '',
        attention: '',
        street1: '',
        street2: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'US',
        phone: '',
      },
      address_book_id: undefined,
    },
    shipping: {
      address: {
        company: '',
        attention: '',
        street1: '',
        street2: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'US',
        phone: '',
      },
      address_book_id: undefined,
      incoterm: 'DAP',
      selected_rate: null,
    },
    tax: { exempt_toggle: false },
    snapshot_locked: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    // Track page view
    trackEvent('checkout_view', { quote_id: quoteId });

    const controller = new AbortController();

    const fetchQuote = async () => {
      setLoading(true);
      setQuoteError(null);

      try {
        const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}?view=vnext`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setQuote(null);
            setQuoteError('Quote not found');
            return;
          }
          throw new Error(`Failed to load quote (status ${response.status})`);
        }

        const raw = await response.json();
        const parsed = ContractsVNext.QuoteSummarySchema.parse(raw);
        setQuote(transformQuoteToCheckoutSummary(parsed));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Unable to load quote';
        setQuoteError(message);
        setQuote(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchQuote();

    return () => {
      controller.abort();
    };
  }, [quoteId]);

  useEffect(() => {
    if (!quoteId) {
      return;
    }

    const controller = new AbortController();

    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/checkout/steps?quoteId=${encodeURIComponent(quoteId)}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            return;
          }
          throw new Error(`Failed to load checkout progress (status ${response.status})`);
        }

        const result = await response.json();
        const steps: PersistedCheckoutStep[] = Array.isArray(result.steps) ? result.steps : [];

        if (steps.length === 0) {
          return;
        }

        setCheckoutState(prev => {
          const nextState: CheckoutState = {
            ...prev,
            compliance: { ...prev.compliance },
            billing: { ...prev.billing },
            shipping: { ...prev.shipping },
            tax: { ...prev.tax },
          };

          let highestCompletedStep = 0;

          for (const step of steps) {
            highestCompletedStep = Math.max(highestCompletedStep, mergePersistedStep(nextState, step));
          }

          if (highestCompletedStep > 0) {
            const candidateStep = Math.min(highestCompletedStep + 1, STEPS.length);
            nextState.currentStep = Math.max(nextState.currentStep, candidateStep);
          }

          return nextState;
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Unable to load checkout progress:', error);
      }
    };

    loadProgress();

    return () => {
      controller.abort();
    };
  }, [quoteId, mergePersistedStep]);

  const computedQuote = useMemo(() => {
    if (!quote) {
      return null;
    }

    const selectedRate = checkoutState.shipping.selected_rate ?? null;
    const shippingAmount = selectedRate?.cost_estimate ?? quote.estimated_shipping ?? 0;
    const taxAmount = checkoutState.tax.exempt_toggle ? 0 : quote.estimated_tax ?? 0;
    const totalDue = Number((quote.item_subtotal + shippingAmount + taxAmount - quote.discounts).toFixed(2));

    return {
      ...quote,
      estimated_shipping: shippingAmount,
      estimated_tax: taxAmount,
      total_due: totalDue,
      selected_shipping_rate: selectedRate,
    };
  }, [quote, checkoutState.shipping.selected_rate, checkoutState.tax.exempt_toggle]);

  const currentQuote = computedQuote ?? quote;

  const currencyFormatter = useMemo(() => {
    const currency = currentQuote?.currency ?? 'USD';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [currentQuote?.currency]);

  const handleSaveStep = async (stepData: Partial<CheckoutState>) => {
    setSaving(true);
    try {
      const stepIndex = checkoutState.currentStep - 1;
      const stepDefinition = STEPS[stepIndex];
      if (!stepDefinition) {
        throw new Error(`Unknown checkout step index ${checkoutState.currentStep}`);
      }

      if (!quoteId) {
        throw new Error('Missing quote identifier for checkout step persistence');
      }

      const response = await fetch('/api/checkout/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId,
          stepId: stepDefinition.slug,
          payload: sanitizeForPersistence(stepData),
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || `Failed to persist checkout step "${stepDefinition.slug}"`);
      }

      const nextStep = Math.min(checkoutState.currentStep + 1, STEPS.length);

      setCheckoutState(prev => ({
        ...prev,
        ...stepData,
        currentStep: nextStep,
      }));

      const eventName = STEP_EVENT_MAP[stepDefinition.slug];
      if (eventName) {
        trackEvent(eventName, { quote_id: quoteId });
      }
    } catch (error) {
      console.error('Failed to save step:', error);
      alert('Saving this step failed. Please retry in a moment.');
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    if (!currentQuote) {
      return null;
    }

    switch (checkoutState.currentStep) {
      case 1:
        return <ReviewComplianceStep quote={currentQuote} onSave={handleSaveStep} saving={saving} />;
      case 2:
        return (
          <BillingStep
            quote={currentQuote}
            initialData={checkoutState.billing}
            onSave={handleSaveStep}
            saving={saving}
          />
        );
      case 3:
        return (
          <ShippingStep
            quote={currentQuote}
            initialData={checkoutState.shipping}
            onSave={handleSaveStep}
            saving={saving}
          />
        );
      case 4:
        return <TaxStep quote={currentQuote} onSave={handleSaveStep} saving={saving} />;
      case 5:
        return <OrderReviewStep quote={currentQuote} onSave={handleSaveStep} saving={saving} />;
      case 6:
        return <PaymentStep quote={currentQuote} onSave={handleSaveStep} saving={saving} />;
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

  if (quoteError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load quote</h2>
          <p className="text-gray-600 mb-4">{quoteError}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!currentQuote) {
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
                    let indicatorState: 'completed' | 'active' | 'pending';
                    if (isCompleted) {
                      indicatorState = 'completed';
                    } else if (isActive) {
                      indicatorState = 'active';
                    } else {
                      indicatorState = 'pending';
                    }

                    let indicatorClass = 'border-gray-300 text-gray-400';
                    if (indicatorState === 'completed') {
                      indicatorClass = 'bg-green-500 border-green-500 text-white';
                    } else if (indicatorState === 'active') {
                      indicatorClass = 'border-blue-500 text-blue-500';
                    }
                    const connectorClass = step.id < checkoutState.currentStep ? 'bg-green-500' : 'bg-gray-300';

                    return (
                      <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${indicatorClass}`}>
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
                          <div className={`flex-1 h-0.5 mx-4 ${connectorClass}`} />
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
                      {currentQuote.selected_lead_time.region} {currentQuote.selected_lead_time.speed} ({currentQuote.selected_lead_time.business_days} days)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{currencyFormatter.format(currentQuote.item_subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping (est.)</span>
                    <div className="text-right">
                      <div>{currencyFormatter.format(currentQuote.estimated_shipping)}</div>
                      {currentQuote.selected_shipping_rate ? (
                        <div className="text-xs text-gray-500">
                          {currentQuote.selected_shipping_rate.carrier} {currentQuote.selected_shipping_rate.service}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (est.)</span>
                    <span>{currencyFormatter.format(currentQuote.estimated_tax)}</span>
                  </div>
                  {currentQuote.discounts > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discounts</span>
                      <span>-{currencyFormatter.format(currentQuote.discounts)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Due Now</span>
                    <span>{currencyFormatter.format(currentQuote.total_due)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* DFM Gate Banner */}
              {currentQuote.has_blockers && (
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
