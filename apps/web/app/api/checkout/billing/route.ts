import { NextRequest, NextResponse } from 'next/server';

import { MissingOrgContextError, requireOrgAuthContext } from '../_lib/context';

const mapAddressToClient = (record: Record<string, any>) => ({
  id: record.id as string,
  label: record.label as string | null,
  attention: record.attention as string | null,
  company: record.company as string | null,
  street1: record.street1 as string,
  street2: (record.street2 as string | null) ?? null,
  city: record.city as string,
  state: (record.state as string | null) ?? null,
  postal_code: record.postal_code as string,
  country: record.country as string,
  phone: (record.phone as string | null) ?? null,
  address_type: record.address_type as string,
  is_default: Boolean(record.is_default),
  created_at: record.created_at as string,
  updated_at: record.updated_at as string,
});

const mapPaymentMethodToClient = (record: Record<string, any>) => ({
  id: record.id as string,
  method_type: record.method_type as string,
  provider: (record.provider as string | null) ?? null,
  label: (record.label as string | null) ?? null,
  brand: (record.brand as string | null) ?? null,
  last4: (record.last4 as string | null) ?? null,
  expiry_month: record.expiry_month as number | null,
  expiry_year: record.expiry_year as number | null,
  email: (record.email as string | null) ?? null,
  external_id: (record.external_id as string | null) ?? null,
  is_default: Boolean(record.is_default),
  created_at: record.created_at as string,
  updated_at: record.updated_at as string,
});

export async function GET(request: NextRequest) {
  try {
    const { supabase, orgId } = await requireOrgAuthContext();

    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get('section');
    const addressType = searchParams.get('addressType') ?? 'billing';
    const defaultOnly = searchParams.get('defaultOnly') === 'true';

    const responsePayload: Record<string, unknown> = {};

    if (!section || section === 'addresses') {
      let query = supabase
        .from('organization_addresses')
        .select('*')
        .eq('organization_id', orgId)
        .eq('address_type', addressType)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (defaultOnly) {
        query = query.eq('is_default', true);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      responsePayload.addresses = (data ?? []).map(mapAddressToClient);
    }

    if (!section || section === 'paymentMethods') {
      let query = supabase
        .from('organization_payment_methods')
        .select('*')
        .eq('organization_id', orgId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (defaultOnly) {
        query = query.eq('is_default', true);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      responsePayload.paymentMethods = (data ?? []).map(mapPaymentMethodToClient);
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    if (error instanceof MissingOrgContextError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Failed to load billing details';
    console.error('Billing data load failed:', message);
    return NextResponse.json({ error: 'Failed to load billing details' }, { status: 500 });
  }
}
