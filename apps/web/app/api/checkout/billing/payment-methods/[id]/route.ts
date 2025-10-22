import { NextRequest, NextResponse } from 'next/server';

import { MissingOrgContextError, requireOrgAuthContext } from '../../../_lib/context';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, orgId } = await requireOrgAuthContext();
    const methodId = params.id;

    const { error } = await supabase
      .from('organization_payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('organization_id', orgId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MissingOrgContextError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Failed to delete payment method';
    console.error('Payment method delete failed:', message);
    return NextResponse.json({ error: 'Failed to delete payment method' }, { status: 500 });
  }
}
