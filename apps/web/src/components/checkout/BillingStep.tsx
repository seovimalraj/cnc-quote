'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DocumentTextIcon,
  CreditCardIcon,
  PlusIcon,
  TrashIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

type PaymentMethodType = 'card' | 'paypal' | 'ach';

interface Address {
  company?: string | null;
  attention?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state_province?: string | null;
  postal_code: string;
  country: string;
  phone?: string | null;
}

interface AddressFormState {
  company: string;
  attention: string;
  street1: string;
  street2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone: string;
}

interface ApiAddress extends Address {
  id: string;
  label: string | null;
  address_type: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface BillingInitialData {
  readonly address?: Partial<Address> | null;
  readonly address_book_id?: string | null;
  readonly selected_payment_method_id?: string | null;
  readonly po?: string | null;
}

interface BillingStepProps {
  readonly quote: unknown;
  readonly onSave: (data: any) => void;
  readonly saving: boolean;
  readonly initialData?: BillingInitialData;
}

interface PaymentMethod {
  id: string;
  label: string | null;
  method_type: PaymentMethodType;
  brand: string | null;
  last4: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  email: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface PaymentMethodFormState {
  method_type: PaymentMethodType;
  label: string;
  brand: string;
  last4: string;
  expiry_month: string;
  expiry_year: string;
  email: string;
}

const DEFAULT_COUNTRY = 'US';

const EMPTY_ADDRESS: AddressFormState = {
  company: '',
  attention: '',
  street1: '',
  street2: '',
  city: '',
  state_province: '',
  postal_code: '',
  country: DEFAULT_COUNTRY,
  phone: '',
};

const NEW_PAYMENT_METHOD_FORM: PaymentMethodFormState = {
  method_type: 'card',
  label: '',
  brand: '',
  last4: '',
  expiry_month: '',
  expiry_year: '',
  email: '',
};

const paymentMethodIconMap: Record<PaymentMethodType, typeof CreditCardIcon | typeof BanknotesIcon> = {
  card: CreditCardIcon,
  ach: BanknotesIcon,
  paypal: CreditCardIcon,
};

const formatExpiry = (month?: number | null, year?: number | null) => {
  if (!month || !year) {
    return '';
  }
  const safeMonth = String(month).padStart(2, '0');
  const safeYear = String(year).slice(-2);
  return `${safeMonth}/${safeYear}`;
};

const formatPaymentMethodTitle = (method: PaymentMethod) => {
  if (method.method_type === 'card') {
    const brand = method.brand ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1) : 'Card';
    const last4 = method.last4 ? ` •••• ${method.last4}` : '';
    return `${brand}${last4}`.trim();
  }

  if (method.method_type === 'ach') {
    return method.label || 'ACH Account';
  }

  if (method.method_type === 'paypal') {
    return method.label || 'PayPal';
  }

  return method.label || 'Payment Method';
};

const formatAddressLabel = (address: ApiAddress) => {
  if (address.label) {
    return address.label;
  }
  const parts = [address.company, address.street1, address.city];
  return parts.filter(Boolean).join(', ') || 'Saved address';
};

const normalizeAddressForForm = (address?: Partial<Address> | null): AddressFormState => ({
  company: address?.company ?? '',
  attention: address?.attention ?? '',
  street1: address?.street1 ?? '',
  street2: address?.street2 ?? '',
  city: address?.city ?? '',
  state_province: address?.state_province ?? '',
  postal_code: address?.postal_code ?? '',
  country: address?.country ?? DEFAULT_COUNTRY,
  phone: address?.phone ?? '',
});

const mapApiAddressToForm = (address: ApiAddress): AddressFormState => ({
  company: address.company ?? '',
  attention: address.attention ?? '',
  street1: address.street1,
  street2: address.street2 ?? '',
  city: address.city,
  state_province: address.state_province ?? '',
  postal_code: address.postal_code,
  country: address.country,
  phone: address.phone ?? '',
});

const normalizeAddressForRequest = (form: AddressFormState) => {
  const clean = (value: string) => (value.trim() ? value.trim() : undefined);
  return {
    company: clean(form.company),
    attention: clean(form.attention),
    street1: form.street1.trim(),
    street2: clean(form.street2),
    city: form.city.trim(),
    state_province: clean(form.state_province),
    postal_code: form.postal_code.trim(),
    country: form.country.trim() || DEFAULT_COUNTRY,
    phone: clean(form.phone),
  };
};

const mapApiAddressToPersisted = (address: ApiAddress): Address => ({
  company: address.company ?? undefined,
  attention: address.attention ?? undefined,
  street1: address.street1,
  street2: address.street2 ?? undefined,
  city: address.city,
  state_province: address.state_province ?? undefined,
  postal_code: address.postal_code,
  country: address.country,
  phone: address.phone ?? undefined,
});

const pickPreferredPaymentMethod = (
  methods: PaymentMethod[],
  preferred?: string | null,
): string => {
  if (preferred && methods.some((method) => method.id === preferred)) {
    return preferred;
  }
  const defaultMethod = methods.find((method) => method.is_default);
  if (defaultMethod) {
    return defaultMethod.id;
  }
  return methods[0]?.id ?? '';
};

export function BillingStep({ quote: _quote, onSave, saving, initialData }: BillingStepProps) {
  void _quote;

  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [billingAddress, setBillingAddress] = useState<AddressFormState>(EMPTY_ADDRESS);
  const [addressLabel, setAddressLabel] = useState('');
  const [makeDefaultAddress, setMakeDefaultAddress] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const selectedAddressIdRef = useRef<string | null>(null);
  const addressDirtyRef = useRef(false);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [newMethodForm, setNewMethodForm] = useState<PaymentMethodFormState>(NEW_PAYMENT_METHOD_FORM);
  const [makeDefaultMethod, setMakeDefaultMethod] = useState(false);
  const [submittingNewMethod, setSubmittingNewMethod] = useState(false);

  const [poNumber, setPoNumber] = useState('');

  const initialHydratedRef = useRef(false);

  const applyAddressRecord = useCallback((record: ApiAddress) => {
    setSelectedAddressId(record.id);
    selectedAddressIdRef.current = record.id;
    setBillingAddress(mapApiAddressToForm(record));
    setAddressLabel(record.label ?? '');
    setMakeDefaultAddress(Boolean(record.is_default));
    addressDirtyRef.current = false;
  }, []);

  useEffect(() => {
    if (!initialData || initialHydratedRef.current) {
      return;
    }

    setBillingAddress(normalizeAddressForForm(initialData.address));
    setAddressLabel('');
    setMakeDefaultAddress(false);
    setSelectedAddressId(initialData.address_book_id ?? null);
    selectedAddressIdRef.current = initialData.address_book_id ?? null;
    setSelectedPaymentMethod(initialData.selected_payment_method_id ?? '');
    setPoNumber(initialData.po ?? '');
    initialHydratedRef.current = true;
  }, [initialData]);

  useEffect(() => {
    const controller = new AbortController();

    const loadBillingData = async () => {
      setAddressesLoading(true);
      setPaymentMethodsLoading(true);
      setAddressError(null);
      setPaymentMethodsError(null);

      try {
        const response = await fetch('/api/checkout/billing?addressType=billing', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load billing data (status ${response.status})`);
        }

        const payload = await response.json();
        const loadedAddresses = Array.isArray(payload.addresses) ? (payload.addresses as ApiAddress[]) : [];
        const loadedMethods = Array.isArray(payload.paymentMethods) ? (payload.paymentMethods as PaymentMethod[]) : [];

        setAddresses(loadedAddresses);

        const preferredAddressId = initialData?.address_book_id ?? selectedAddressIdRef.current;
        if (loadedAddresses.length > 0) {
          if (preferredAddressId) {
            const match = loadedAddresses.find((address) => address.id === preferredAddressId);
            if (match) {
              applyAddressRecord(match);
            }
          } else if (!addressDirtyRef.current) {
            const defaultAddress = loadedAddresses.find((address) => address.is_default) ?? loadedAddresses[0];
            if (defaultAddress) {
              applyAddressRecord(defaultAddress);
            }
          }
        }

        setPaymentMethods(loadedMethods);
        setSelectedPaymentMethod((prev) => {
          if (prev && loadedMethods.some((method) => method.id === prev)) {
            return prev;
          }
          return pickPreferredPaymentMethod(loadedMethods, initialData?.selected_payment_method_id ?? null);
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load billing data';
        setAddressError(message);
        setPaymentMethodsError(message);
      } finally {
        if (!controller.signal.aborted) {
          setAddressesLoading(false);
          setPaymentMethodsLoading(false);
        }
      }
    };

    loadBillingData();

    return () => controller.abort();
  }, [applyAddressRecord, initialData?.address_book_id, initialData?.selected_payment_method_id]);

  const handleSelectSavedAddress = (value: string) => {
    if (value === '__new') {
      setSelectedAddressId(null);
      selectedAddressIdRef.current = null;
      setBillingAddress(EMPTY_ADDRESS);
      setAddressLabel('');
      setMakeDefaultAddress(addresses.length === 0);
      addressDirtyRef.current = false;
      return;
    }

    const record = addresses.find((address) => address.id === value);
    if (record) {
      applyAddressRecord(record);
    }
  };

  const handleAddressChange = (field: keyof AddressFormState, value: string) => {
    addressDirtyRef.current = true;
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseOrgDefault = () => {
    if (addresses.length === 0) {
      alert('No saved billing addresses yet. Add one to configure a default.');
      return;
    }
    const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];
    applyAddressRecord(defaultAddress);
  };

  const handleDefaultAddressToggle = (checked: boolean | string) => {
    addressDirtyRef.current = true;
    setMakeDefaultAddress(Boolean(checked));
  };

  const persistAddress = useCallback(async (): Promise<ApiAddress | null> => {
    setAddressSaving(true);
    try {
      const response = await fetch('/api/checkout/billing/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(selectedAddressIdRef.current ? { id: selectedAddressIdRef.current } : {}),
          ...normalizeAddressForRequest(billingAddress),
          label: addressLabel.trim() || undefined,
          isDefault: makeDefaultAddress,
        }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || 'Failed to save billing address');
      }

      const payload = await response.json();
      const saved = payload.address as ApiAddress;

      setAddresses((prev) => {
        const updated = prev
          .filter((address) => address.id !== saved.id)
          .map((address) => (saved.is_default ? { ...address, is_default: false } : address));
        return [saved, ...updated];
      });

      applyAddressRecord(saved);
      return saved;
    } catch (error) {
      console.error('Billing address save failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to save billing address.');
      return null;
    } finally {
      setAddressSaving(false);
    }
  }, [addressLabel, applyAddressRecord, billingAddress, makeDefaultAddress]);

  const handleAddMethodOpenChange = (open: boolean) => {
    setAddMethodOpen(open);
    if (!open) {
      setNewMethodForm(NEW_PAYMENT_METHOD_FORM);
      setMakeDefaultMethod(false);
      setSubmittingNewMethod(false);
    }
  };

  const handleSubmitNewMethod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingNewMethod(true);

    try {
      let expiryMonthNumber: number | undefined;
      let expiryYearNumber: number | undefined;

      if (newMethodForm.method_type === 'card') {
        if (
          !newMethodForm.brand.trim() ||
          !newMethodForm.last4.trim() ||
          !newMethodForm.expiry_month.trim() ||
          !newMethodForm.expiry_year.trim()
        ) {
          alert('Enter brand, last four digits, and expiration details for card methods.');
          setSubmittingNewMethod(false);
          return;
        }

        expiryMonthNumber = Number(newMethodForm.expiry_month);
        expiryYearNumber = Number(newMethodForm.expiry_year);

        if (Number.isNaN(expiryMonthNumber) || expiryMonthNumber < 1 || expiryMonthNumber > 12) {
          alert('Enter a valid expiration month (1-12).');
          setSubmittingNewMethod(false);
          return;
        }

        if (Number.isNaN(expiryYearNumber) || expiryYearNumber < new Date().getFullYear()) {
          alert('Enter a valid expiration year.');
          setSubmittingNewMethod(false);
          return;
        }
      }

      const response = await fetch('/api/checkout/billing/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodType: newMethodForm.method_type,
          label: newMethodForm.label.trim() || undefined,
          brand: newMethodForm.brand.trim() || undefined,
          last4: newMethodForm.last4.trim() || undefined,
          expiryMonth: expiryMonthNumber,
          expiryYear: expiryYearNumber,
          email: newMethodForm.email.trim() || undefined,
          makeDefault: makeDefaultMethod,
        }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || 'Failed to save payment method');
      }

      const payload = await response.json();
      const saved = payload.paymentMethod as PaymentMethod;

      setPaymentMethods((prev) => {
        const updated = prev
          .filter((method) => method.id !== saved.id)
          .map((method) => (saved.is_default ? { ...method, is_default: false } : method));
        return [saved, ...updated];
      });

      setSelectedPaymentMethod(saved.id);
      setNewMethodForm(NEW_PAYMENT_METHOD_FORM);
      setMakeDefaultMethod(false);
      setAddMethodOpen(false);
    } catch (error) {
      console.error('Payment method save failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to save payment method.');
    } finally {
      setSubmittingNewMethod(false);
    }
  };

  const handleRemoveMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/checkout/billing/payment-methods/${encodeURIComponent(methodId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || 'Failed to remove payment method');
      }

      setPaymentMethods((prev) => {
        const remaining = prev.filter((method) => method.id !== methodId);
        setSelectedPaymentMethod((current) => {
          if (current && current !== methodId) {
            return current;
          }
          return pickPreferredPaymentMethod(remaining);
        });
        return remaining;
      });
    } catch (error) {
      console.error('Payment method delete failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove payment method.');
    }
  };

  const handleSave = async () => {
    if (
      !billingAddress.street1.trim() ||
      !billingAddress.city.trim() ||
      !billingAddress.postal_code.trim() ||
      !billingAddress.country.trim()
    ) {
      alert('Please fill in all required billing address fields.');
      return;
    }

    if (billingAddress.country.trim().toUpperCase() === 'US' && !billingAddress.state_province.trim()) {
      alert('State is required for US billing addresses.');
      return;
    }

    const persisted = await persistAddress();
    if (!persisted) {
      return;
    }

    const sanitizedPo = poNumber.trim();

    onSave({
      billing: {
        address: mapApiAddressToPersisted(persisted),
        address_book_id: persisted.id,
        selected_payment_method_id: selectedPaymentMethod || undefined,
        po: sanitizedPo || undefined,
      },
    });
  };

  const saveDisabled = saving || addressSaving;
  const saveLabel = addressSaving ? 'Saving address...' : saving ? 'Saving...' : 'Save & Continue';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DocumentTextIcon className="h-5 w-5" />
          <span>Billing Details / Saved Payment Methods</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Billing Address</h3>
            <div className="flex items-center space-x-2">
              {addressesLoading ? <span className="text-sm text-gray-500">Loading addresses…</span> : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseOrgDefault}
                disabled={addresses.length === 0 || addressesLoading}
              >
                Use Organization Default
              </Button>
            </div>
          </div>
          {addressError ? <p className="text-sm text-red-600">{addressError}</p> : null}
          {addresses.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="billing-saved-address">Saved Addresses</Label>
              <Select value={selectedAddressId ?? '__new'} onValueChange={handleSelectSavedAddress}>
                <SelectTrigger id="billing-saved-address">
                  <SelectValue placeholder="Select saved address" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new">Create new address</SelectItem>
                  {addresses.map((address) => (
                    <SelectItem key={address.id} value={address.id}>
                      {formatAddressLabel(address)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="billing-label">Address Label</Label>
              <Input
                id="billing-label"
                value={addressLabel}
                onChange={(event) => {
                  addressDirtyRef.current = true;
                  setAddressLabel(event.target.value);
                }}
                placeholder="e.g. Corporate HQ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={billingAddress.company}
                onChange={(event) => handleAddressChange('company', event.target.value)}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attention">Attention</Label>
              <Input
                id="attention"
                value={billingAddress.attention}
                onChange={(event) => handleAddressChange('attention', event.target.value)}
                placeholder="Contact person"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street1">Street Address *</Label>
              <Input
                id="street1"
                value={billingAddress.street1}
                onChange={(event) => handleAddressChange('street1', event.target.value)}
                placeholder="Street address"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="street2">Street Address 2</Label>
              <Input
                id="street2"
                value={billingAddress.street2}
                onChange={(event) => handleAddressChange('street2', event.target.value)}
                placeholder="Apartment, suite, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={billingAddress.city}
                onChange={(event) => handleAddressChange('city', event.target.value)}
                placeholder="City"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={billingAddress.state_province}
                onChange={(event) => handleAddressChange('state_province', event.target.value)}
                placeholder="State or Province"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal">Postal Code *</Label>
              <Input
                id="postal"
                value={billingAddress.postal_code}
                onChange={(event) => handleAddressChange('postal_code', event.target.value)}
                placeholder="Postal code"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select
                value={billingAddress.country || DEFAULT_COUNTRY}
                onValueChange={(value) => handleAddressChange('country', value)}
              >
                <SelectTrigger id="country">
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
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={billingAddress.phone}
                onChange={(event) => handleAddressChange('phone', event.target.value)}
                placeholder="+1 555-0123"
              />
            </div>
            <div className="flex items-center space-x-2 md:col-span-2">
              <Checkbox
                id="billing-default"
                checked={makeDefaultAddress}
                onCheckedChange={handleDefaultAddressToggle}
              />
              <Label htmlFor="billing-default" className="text-sm">
                Set as organization default billing address
              </Label>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Saved Payment Methods</h3>
            <Dialog open={addMethodOpen} onOpenChange={handleAddMethodOpenChange}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add Payment Method</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                  <DialogDescription>Save a payment method for faster checkout.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitNewMethod} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="method-type">Method Type</Label>
                    <Select
                      value={newMethodForm.method_type}
                      onValueChange={(value) =>
                        setNewMethodForm((prev) => ({ ...prev, method_type: value as PaymentMethodType }))
                      }
                    >
                      <SelectTrigger id="method-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method-label">Label</Label>
                    <Input
                      id="method-label"
                      value={newMethodForm.label}
                      onChange={(event) =>
                        setNewMethodForm((prev) => ({ ...prev, label: event.target.value }))
                      }
                      placeholder="e.g. Corporate card"
                    />
                  </div>
                  {newMethodForm.method_type === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="method-brand">Card Brand</Label>
                        <Input
                          id="method-brand"
                          value={newMethodForm.brand}
                          onChange={(event) =>
                            setNewMethodForm((prev) => ({ ...prev, brand: event.target.value }))
                          }
                          placeholder="Visa"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="method-last4">Last 4</Label>
                        <Input
                          id="method-last4"
                          value={newMethodForm.last4}
                          onChange={(event) =>
                            setNewMethodForm((prev) => ({ ...prev, last4: event.target.value }))
                          }
                          maxLength={4}
                          placeholder="1234"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="method-exp-month">Expiry Month</Label>
                        <Input
                          id="method-exp-month"
                          type="number"
                          min={1}
                          max={12}
                          value={newMethodForm.expiry_month}
                          onChange={(event) =>
                            setNewMethodForm((prev) => ({ ...prev, expiry_month: event.target.value }))
                          }
                          placeholder="MM"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="method-exp-year">Expiry Year</Label>
                        <Input
                          id="method-exp-year"
                          type="number"
                          min={new Date().getFullYear()}
                          value={newMethodForm.expiry_year}
                          onChange={(event) =>
                            setNewMethodForm((prev) => ({ ...prev, expiry_year: event.target.value }))
                          }
                          placeholder="YYYY"
                        />
                      </div>
                    </div>
                  ) : null}
                  {newMethodForm.method_type !== 'card' ? (
                    <div className="space-y-2">
                      <Label htmlFor="method-email">Account Email</Label>
                      <Input
                        id="method-email"
                        type="email"
                        value={newMethodForm.email}
                        onChange={(event) =>
                          setNewMethodForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                        placeholder="billing@company.com"
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="method-default"
                      checked={makeDefaultMethod}
                      onCheckedChange={(checked) => setMakeDefaultMethod(Boolean(checked))}
                    />
                    <Label htmlFor="method-default" className="text-sm">
                      Set as organization default payment method
                    </Label>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline" disabled={submittingNewMethod}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={submittingNewMethod}>
                      {submittingNewMethod ? 'Saving...' : 'Save Method'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {paymentMethodsError ? <p className="text-sm text-red-600">{paymentMethodsError}</p> : null}
          <div className="space-y-3">
            {paymentMethodsLoading ? (
              <p className="text-sm text-gray-500">Loading payment methods…</p>
            ) : paymentMethods.length > 0 ? (
              <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <div className="space-y-3">
                  {paymentMethods.map((method) => {
                    const Icon = paymentMethodIconMap[method.method_type] ?? CreditCardIcon;
                    const isSelected = selectedPaymentMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        className={`border rounded-lg transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <label
                          htmlFor={`payment-${method.id}`}
                          className="flex items-center justify-between p-4 cursor-pointer"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem id={`payment-${method.id}`} value={method.id} />
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 text-blue-600">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium">{formatPaymentMethodTitle(method)}</div>
                              <div className="text-sm text-gray-500">
                                {method.method_type === 'card'
                                  ? `Expires ${formatExpiry(method.expiry_month, method.expiry_year)}`
                                  : method.method_type.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {method.is_default ? <Badge className="bg-blue-100 text-blue-800">Default</Badge> : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRemoveMethod(method.id);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No saved payment methods</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => handleAddMethodOpenChange(true)}
                >
                  Add Payment Method
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Purchase Order (optional)</h3>

          <div className="space-y-2">
            <Label htmlFor="po">PO Number</Label>
            <Input
              id="po"
              value={poNumber}
              onChange={(event) => setPoNumber(event.target.value)}
              placeholder="Enter purchase order number"
              maxLength={64}
            />
            <p className="text-xs text-gray-500">Alphanumeric characters and dashes only, max 64 characters</p>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button type="button" variant="outline">
            Back
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveDisabled}>
            {saveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
