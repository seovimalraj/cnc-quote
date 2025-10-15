import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { MissingOrgContextError, requireOrgAuthContext } from '../../_lib/context';

const AddressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().max(120).optional(),
  attention: z.string().max(120).optional(),
  company: z.string().max(160).optional(),
  street1: z.string().min(1),
  street2: z.string().max(160).optional(),
  city: z.string().min(1),
  state_province: z.string().max(120).optional(),
  postal_code: z.string().min(1),
  country: z.string().min(2),
  phone: z.string().max(40).optional(),
  isDefault: z.boolean().optional(),
});

const mapRecordToClient = (record: Record<string, any>) => ({
  id: record.id as string,
  label: (record.label as string | null) ?? null,
  attention: (record.attention as string | null) ?? null,
  company: (record.company as string | null) ?? null,
  street1: record.street1 as string,
  street2: (record.street2 as string | null) ?? null,
  city: record.city as string,
  state_province: (record.state as string | null) ?? null,
  postal_code: record.postal_code as string,
  country: record.country as string,
  phone: (record.phone as string | null) ?? null,
  address_type: record.address_type as string,
  is_default: Boolean(record.is_default),
  created_at: record.created_at as string,
  updated_at: record.updated_at as string,
});

export async function POST(request: NextRequest) {
  try {
    const payload = AddressSchema.parse(await request.json());
    const { supabase, orgId } = await requireOrgAuthContext();

    const upsertRecord = {
      id: payload.id ?? undefined,
      organization_id: orgId,
      label: payload.label ?? null,
      attention: payload.attention ?? null,
      company: payload.company ?? null,
      street1: payload.street1,
      street2: payload.street2 ?? null,
      city: payload.city,
      state: payload.state_province ?? null,
      postal_code: payload.postal_code,
      country: payload.country,
      phone: payload.phone ?? null,
      address_type: 'billing',
      is_default: payload.isDefault ?? false,
    } as Record<string, unknown>;

    const { data, error } = await supabase
      .from('organization_addresses')
      .upsert(upsertRecord, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    if ((payload.isDefault ?? false) && data?.id) {
      await supabase
        .from('organization_addresses')
        .update({ is_default: false })
        .eq('organization_id', orgId)
        .eq('address_type', 'billing')
        .neq('id', data.id);
    }

    return NextResponse.json({ address: mapRecordToClient(data) });
  } catch (error) {
    if (error instanceof MissingOrgContextError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid address payload', details: error.issues }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to save billing address';
    console.error('Billing address save failed:', message);
    return NextResponse.json({ error: 'Failed to save billing address' }, { status: 500 });
  }
}
