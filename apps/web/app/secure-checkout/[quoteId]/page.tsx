'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CreditCardIcon,
  TruckIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { analytics } from '@/lib/analytics';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface Quote {
  id: string;
  subtotal: number;
  currency: string;
  lines: QuoteLine[];
  selectedLeadOption?: LeadOption;
}

interface QuoteLine {
  id: string;
  fileName: string;
  process: string;
  material: string;
  finish?: string;
  quantity: number;
  unitPrice: number;
  leadTimeOptions: LeadOption[];
}

interface LeadOption {
  id: string;
  region: string;
  speed: string;
  businessDays: number;
  unitPrice: number;
}

interface BillingInfo {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone: string;
}

interface ShippingInfo {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const checkoutSteps: CheckoutStep[] = [
  { id: 'review', title: 'Review Order', description: 'Confirm your quote details', completed: false },
  { id: 'billing', title: 'Billing Info', description: 'Enter your billing information', completed: false },
  { id: 'shipping', title: 'Shipping', description: 'Provide shipping details', completed: false },
  { id: 'payment', title: 'Payment', description: 'Complete your payment', completed: false }
];

export default function CheckoutPage() {
  const router = useRouter();
  const { quoteId } = router.query;

  const [currentStep, setCurrentStep] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: ''
  });
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quoteId) {
      loadQuote();
      // Track checkout started
      analytics.trackCheckoutStarted(quoteId as string, {
        source: 'direct_link',
        user_agent: navigator.userAgent,
      });
    }
  }, [quoteId]);

  const loadQuote = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (response.ok) {
        const data = await response.json();
        setQuote(data);
      } else {
        setError('Failed to load quote');
      }
    } catch (err) {
      setError('Failed to load quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < checkoutSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      checkoutSteps[currentStep].completed = true;

      // Track step completion
      analytics.trackCheckoutStep(quoteId as string, checkoutSteps[nextStep].id, {
        from_step: checkoutSteps[currentStep].id,
        completed_at: new Date().toISOString(),
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

    const handlePayment = async () => {
    if (!quote) return;

    try {
      setIsProcessing(true);

      // Track payment attempt
      await analytics.trackCheckoutStep(quoteId as string, 'payment_initiated', {
        amount: calculateTotal(),
        currency: quote.currency,
      });

      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quoteId as string,
          currency: quote.currency,
          billingInfo,
          shippingInfo: sameAsBilling ? billingInfo : shippingInfo
        })
      });

      if (response.ok) {
        const { sessionId } = await response.json();
        const stripe = await stripePromise;
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId });
        }
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      setError('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = () => {
    if (!quote) return 0;
    return quote.subtotal;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ {error || 'Quote not found'}</div>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <LockClosedIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Secure Checkout</h1>
                <p className="text-sm text-gray-600">Quote #{quote.id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ShieldCheckIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">SSL Encrypted</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {checkoutSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step.completed ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < checkoutSteps.length - 1 && (
                  <ArrowRightIcon className="w-4 h-4 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {quote.lines.map((line) => (
                    <div key={line.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{line.fileName}</h3>
                          <p className="text-sm text-gray-600">
                            {line.process} • {line.material}
                            {line.finish && ` • ${line.finish}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            Quantity: {line.quantity}
                          </p>
                          {quote.selectedLeadOption && (
                            <Badge variant="secondary" className="mt-2">
                              {quote.selectedLeadOption.speed} • {quote.selectedLeadOption.businessDays} days
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${(line.unitPrice * line.quantity).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">
                            ${line.unitPrice.toFixed(2)} each
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-medium">${calculateTotal().toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={billingInfo.firstName}
                        onChange={(e) => setBillingInfo({...billingInfo, firstName: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={billingInfo.lastName}
                        onChange={(e) => setBillingInfo({...billingInfo, lastName: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={billingInfo.email}
                      onChange={(e) => setBillingInfo({...billingInfo, email: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Input
                      id="company"
                      value={billingInfo.company}
                      onChange={(e) => setBillingInfo({...billingInfo, company: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={billingInfo.phone}
                      onChange={(e) => setBillingInfo({...billingInfo, phone: e.target.value})}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sameAsBilling"
                      checked={sameAsBilling}
                      onCheckedChange={(checked) => setSameAsBilling(checked as boolean)}
                    />
                    <Label htmlFor="sameAsBilling">Same as billing address</Label>
                  </div>

                  {!sameAsBilling && (
                    <>
                      <div>
                        <Label htmlFor="address1">Address Line 1 *</Label>
                        <Input
                          id="address1"
                          value={shippingInfo.address1}
                          onChange={(e) => setShippingInfo({...shippingInfo, address1: e.target.value})}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="address2">Address Line 2</Label>
                        <Input
                          id="address2"
                          value={shippingInfo.address2}
                          onChange={(e) => setShippingInfo({...shippingInfo, address2: e.target.value})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={shippingInfo.city}
                            onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={shippingInfo.state}
                            onChange={(e) => setShippingInfo({...shippingInfo, state: e.target.value})}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zipCode">ZIP Code *</Label>
                          <Input
                            id="zipCode"
                            value={shippingInfo.zipCode}
                            onChange={(e) => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country *</Label>
                          <Select
                            value={shippingInfo.country}
                            onValueChange={(value) => setShippingInfo({...shippingInfo, country: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <Elements stripe={stripePromise}>
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="text-sm text-blue-800">
                            Your payment information is encrypted and secure
                          </span>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-600 mb-4">
                          You will be redirected to Stripe's secure payment page
                        </p>
                        <Button
                          onClick={handlePayment}
                          disabled={isProcessing}
                          className="w-full"
                          size="lg"
                        >
                          {isProcessing ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <CreditCardIcon className="w-5 h-5 mr-2" />
                              Complete Payment
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Elements>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < checkoutSteps.length - 1 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handlePayment} disabled={isProcessing}>
                  Complete Order
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote.lines.map((line) => (
                  <div key={line.id} className="flex justify-between">
                    <span className="text-sm">{line.fileName}</span>
                    <span className="text-sm font-medium">
                      ${(line.unitPrice * line.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-between">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-medium">${calculateTotal().toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="font-medium">Shipping</span>
                  <span className="font-medium">Calculated at checkout</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center">
                    <TruckIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm text-green-800">
                      Estimated delivery: {quote.selectedLeadOption?.businessDays || 7} business days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
