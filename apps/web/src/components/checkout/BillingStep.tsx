'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DocumentTextIcon,
  CreditCardIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface BillingStepProps {
  quote: any;
  onSave: (data: any) => void;
  saving: boolean;
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
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
}

export function BillingStep({ quote, onSave, saving }: BillingStepProps) {
  const [billingAddress, setBillingAddress] = useState<Address>({
    company: '',
    attention: '',
    street1: '',
    street2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'US',
  });

  const [poNumber, setPoNumber] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  // Mock saved payment methods
  const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([
    {
      id: 'pm-1',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiry_month: 12,
      expiry_year: 2025,
    },
    {
      id: 'pm-2',
      type: 'card',
      last4: '5555',
      brand: 'mastercard',
      expiry_month: 8,
      expiry_year: 2026,
    },
  ]);

  const handleAddressChange = (field: keyof Address, value: string) => {
    setBillingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleUseOrgDefault = () => {
    // Mock organization default address
    setBillingAddress({
      company: 'Acme Manufacturing Corp',
      attention: 'John Doe',
      street1: '123 Industrial Blvd',
      street2: 'Suite 100',
      city: 'Springfield',
      state_province: 'IL',
      postal_code: '62701',
      country: 'US',
    });
  };

  const handleAddNewCard = () => {
    // In real implementation: Open Stripe Elements modal
    alert('Stripe Elements integration would open here');
  };

  const handleRemoveMethod = (methodId: string) => {
    setSavedMethods(prev => prev.filter(method => method.id !== methodId));
  };

  const handleSave = () => {
    // Basic validation
    if (!billingAddress.street1 || !billingAddress.city || !billingAddress.postal_code || !billingAddress.country) {
      alert('Please fill in all required billing address fields.');
      return;
    }

    if (billingAddress.country === 'US' && !billingAddress.state_province) {
      alert('State is required for US addresses.');
      return;
    }

    onSave({
      billing: {
        address: billingAddress,
        selected_payment_method_id: selectedPaymentMethod,
        po: poNumber,
      },
    });
  };

  const formatCardBrand = (brand?: string) => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const formatExpiry = (month?: number, year?: number) => {
    if (!month || !year) return '';
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DocumentTextIcon className="h-5 w-5" />
          <span>Billing Details / Saved Payment Methods</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Billing Address */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Billing Address</h3>
            <Button variant="outline" size="sm" onClick={handleUseOrgDefault}>
              Use Organization Default
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={billingAddress.company}
                onChange={(e) => handleAddressChange('company', e.target.value)}
                placeholder="Company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attention">Attention</Label>
              <Input
                id="attention"
                value={billingAddress.attention}
                onChange={(e) => handleAddressChange('attention', e.target.value)}
                placeholder="Contact person"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street1">Street Address *</Label>
              <Input
                id="street1"
                value={billingAddress.street1}
                onChange={(e) => handleAddressChange('street1', e.target.value)}
                placeholder="Street address"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street2">Street Address 2</Label>
              <Input
                id="street2"
                value={billingAddress.street2}
                onChange={(e) => handleAddressChange('street2', e.target.value)}
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={billingAddress.city}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                placeholder="City"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={billingAddress.state_province}
                onChange={(e) => handleAddressChange('state_province', e.target.value)}
                placeholder="State or Province"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal">Postal Code *</Label>
              <Input
                id="postal"
                value={billingAddress.postal_code}
                onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                placeholder="Postal code"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select
                value={billingAddress.country}
                onValueChange={(value) => handleAddressChange('country', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Saved Payment Methods */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Saved Payment Methods</h3>
            <Button variant="outline" size="sm" onClick={handleAddNewCard} className="flex items-center space-x-2">
              <PlusIcon className="h-4 w-4" />
              <span>Add New Card</span>
            </Button>
          </div>

          <div className="space-y-3">
            {savedMethods.map((method) => (
              <div
                key={method.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPaymentMethod === method.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPaymentMethod(method.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCardIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="font-medium">
                        {formatCardBrand(method.brand)} •••• {method.last4}
                      </div>
                      <div className="text-sm text-gray-500">
                        Expires {formatExpiry(method.expiry_month, method.expiry_year)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedPaymentMethod === method.id && (
                      <Badge className="bg-blue-100 text-blue-800">Selected</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMethod(method.id);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {savedMethods.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No saved payment methods</p>
                <Button variant="outline" className="mt-2" onClick={handleAddNewCard}>
                  Add New Card
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Order */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Purchase Order (optional)</h3>

          <div className="space-y-2">
            <Label htmlFor="po">PO Number</Label>
            <Input
              id="po"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Enter purchase order number"
              maxLength={64}
            />
            <p className="text-xs text-gray-500">
              Alphanumeric characters and dashes only, max 64 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline">
            Back
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
