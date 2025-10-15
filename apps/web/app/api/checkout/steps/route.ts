import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { MissingOrgContextError, requireOrgAuthContext, type OrgAuthContextStrict } from '../_lib/context';

const StepPayloadSchema = z.object({
  quoteId: z.string().min(1, 'quoteId is required'),
  stepId: z.string().min(1, 'stepId is required'),
  payload: z.record(z.any()).default({}),
});

const StepQuerySchema = z.object({
  quoteId: z.string().min(1, 'quoteId is required'),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parseResult = StepQuerySchema.safeParse({ quoteId: searchParams.quoteId });

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request', details: parseResult.error.message }, { status: 400 });
    }

    const { quoteId } = parseResult.data;
    let context: OrgAuthContextStrict;
    try {
      context = await requireOrgAuthContext();
    } catch (error) {
      if (error instanceof MissingOrgContextError) {
        return NextResponse.json({ error: (error as Error).message }, { status: 401 });
      }
      throw error;
    }

    const { supabase, orgId } = context;

    const { data, error } = await supabase
      .from('checkout_progress')
      .select('step_id, payload, completed_at, updated_at')
      .eq('quote_id', quoteId)
      .eq('organization_id', orgId)
      .order('completed_at', { ascending: true });

    if (error) {
      console.error('Failed to load checkout progress:', error);
      return NextResponse.json({ error: 'Failed to load checkout progress' }, { status: 500 });
    }

    return NextResponse.json({ steps: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Checkout progress GET error:', message);
    return NextResponse.json({ error: 'Failed to load checkout progress' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteId, stepId, payload } = StepPayloadSchema.parse(body);

    let context: OrgAuthContextStrict;
    try {
      context = await requireOrgAuthContext();
    } catch (error) {
      if (error instanceof MissingOrgContextError) {
        return NextResponse.json({ error: (error as Error).message }, { status: 401 });
      }
      throw error;
    }

    const { supabase, orgId } = context;

    const upsertPayload = {
      quote_id: quoteId,
      organization_id: orgId,
      step_id: stepId,
      payload,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('checkout_progress')
      .upsert(upsertPayload, { onConflict: 'quote_id,step_id' })
      .select()
      .single();

    if (error) {
      console.error('Failed to persist checkout progress:', error);
      return NextResponse.json({ error: 'Failed to persist checkout progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true, step: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Checkout progress POST error:', message);
    return NextResponse.json({ error: 'Failed to persist checkout progress' }, { status: 500 });
  }
}
