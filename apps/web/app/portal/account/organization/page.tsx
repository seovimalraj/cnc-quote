'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BuildingOfficeIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import type { Organization, OrganizationFormData } from '@/types/order';
import { trackEvent } from '@/lib/analytics/posthog';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' }
];

const UNITS_OPTIONS = [
  { value: 'mm', label: 'Millimeters (mm)' },
  { value: 'in', label: 'Inches (in)' }
];

export default function OrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    legal_name: '',
    default_currency: 'USD',
    default_units: 'mm',
    itar_mode: false,
    onshore_only: false
  });

  // Load organization data
  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const response = await api.get<Organization>('/org');
      setOrganization(response.data);
      setFormData({
        name: response.data.name,
        legal_name: response.data.legal_name || '',
        default_currency: response.data.default_currency,
        default_units: response.data.default_units,
        itar_mode: response.data.itar_mode,
        onshore_only: response.data.onshore_only
      });
      trackEvent('org_settings_view');
    } catch (error: any) {
      console.error('Error loading organization:', error);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/org', formData);
      toast.success('Organization settings updated successfully');
      trackEvent('org_settings_saved', {
        itar_mode: formData.itar_mode,
        onshore_only: formData.onshore_only,
        default_currency: formData.default_currency,
        default_units: formData.default_units
      });
      await loadOrganization(); // Refresh data
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization settings');
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = () => {
    if (!organization) return false;
    return (
      formData.name !== organization.name ||
      formData.legal_name !== (organization.legal_name || '') ||
      formData.default_currency !== organization.default_currency ||
      formData.default_units !== organization.default_units ||
      formData.itar_mode !== organization.itar_mode ||
      formData.onshore_only !== organization.onshore_only
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/portal/account')}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Account
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your organization's details, defaults, and compliance settings.
          </p>
        </div>

        {/* Company Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingOfficeIcon className="w-5 h-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <Label htmlFor="legal_name">Legal Name (Optional)</Label>
                <Input
                  id="legal_name"
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  placeholder="Legal entity name"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Defaults Section */}
        <Card>
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              These settings apply to all new quotes. Existing quotes keep their original settings.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Default Currency</Label>
                <Select
                  value={formData.default_currency}
                  onValueChange={(value) => setFormData({ ...formData, default_currency: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="units">Default Units</Label>
                <Select
                  value={formData.default_units}
                  onValueChange={(value) => setFormData({ ...formData, default_units: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-500" />
              Compliance & Routing
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Configure compliance settings that affect quote generation and routing.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="itar_mode" className="text-base font-medium">
                    ITAR/CUI Handling
                  </Label>
                  <p className="text-sm text-gray-600">
                    Enable special handling for ITAR-controlled or CUI materials
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      Watermarks downloads
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Restricts widget origins
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Disables international options
                    </Badge>
                  </div>
                </div>
                <Switch
                  id="itar_mode"
                  checked={formData.itar_mode}
                  onCheckedChange={(checked) => setFormData({ ...formData, itar_mode: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="onshore_only" className="text-base font-medium">
                    Onshore-Only Sourcing
                  </Label>
                  <p className="text-sm text-gray-600">
                    Restrict manufacturing to facilities within your country
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      Hides international lead times
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Filters to domestic suppliers
                    </Badge>
                  </div>
                </div>
                <Switch
                  id="onshore_only"
                  checked={formData.onshore_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, onshore_only: checked })}
                />
              </div>
            </div>

            {/* Compliance Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="font-medium">Compliance Status</span>
              </div>
              <div className="flex gap-2">
                {formData.itar_mode && (
                  <Badge variant="destructive">ITAR Enabled</Badge>
                )}
                {formData.onshore_only && (
                  <Badge variant="secondary">Onshore Only</Badge>
                )}
                {!formData.itar_mode && !formData.onshore_only && (
                  <Badge variant="outline">Standard Compliance</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges()}
            size="lg"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
