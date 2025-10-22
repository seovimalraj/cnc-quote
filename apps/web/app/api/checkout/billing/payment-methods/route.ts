import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { MissingOrgContextError, requireOrgAuthContext } from '../../_lib/context';

const PaymentMethodSchema = z.object({
  id: z.string().uuid().optional(),
  methodType: z.enum(['card', 'paypal', 'ach']).optional(),
  provider: z.string().max(120).optional(),
  label: z.string().max(160).optional(),
  brand: z.string().max(80).optional(),
  last4: z.string().max(4).optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2000).max(9999).optional(),
  email: z.string().email().optional(),
  externalId: z.string().max(120).optional(),
  makeDefault: z.boolean().optional(),
});

const mapRecordToClient = (record: Record<string, any>) => ({
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

export async function POST(request: NextRequest) {
  try {
    const payload = PaymentMethodSchema.parse(await request.json());
    const { supabase, orgId } = await requireOrgAuthContext();

    const makeDefault = payload.makeDefault ?? false;

    if (!payload.id && !payload.methodType) {
      return NextResponse.json({ error: 'methodType required for new payment method' }, { status: 400 });
    }

    const recordBase: Record<string, unknown> = {
      organization_id: orgId,
      provider: payload.provider ?? null,
      label: payload.label ?? null,
      brand: payload.brand ?? null,
      last4: payload.last4 ?? null,
      expiry_month: payload.expiryMonth ?? null,
      expiry_year: payload.expiryYear ?? null,
      email: payload.email ?? null,
      external_id: payload.externalId ?? null,
      is_default: makeDefault,
    };

    let result;
    if (payload.id) {
      const updateRecord = {
        ...recordBase,
        ...(payload.methodType ? { method_type: payload.methodType } : {}),
      };

      const { data, error } = await supabase
        .from('organization_payment_methods')
        .update(updateRecord)
        .eq('id', payload.id)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) {
        throw error;
      }
      result = data;
    } else {
      const insertRecord = {
        ...recordBase,
        method_type: payload.methodType!,
      };

      const { data, error } = await supabase
        .from('organization_payment_methods')
        .insert(insertRecord)
        .select()
        .single();

      if (error) {
        throw error;
      }
      result = data;
    }

    if (makeDefault && result?.id) {
      await supabase
        .from('organization_payment_methods')
        .update({ is_default: false })
        .eq('organization_id', orgId)
        .neq('id', result.id);

      await supabase
        .from('organization_payment_methods')
        .update({ is_default: true })
        .eq('id', result.id)
        .eq('organization_id', orgId);
    }

    return NextResponse.json({ paymentMethod: mapRecordToClient(result) });
  } catch (error) {
    if (error instanceof MissingOrgContextError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payment method payload', details: error.issues }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to save payment method';
    console.error('Payment method save failed:', message);
    return NextResponse.json({ error: 'Failed to save payment method' }, { status: 500 });
  }
}
