import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; line_id: string } }
) {
  try {
    const quoteId = params.id;
    const lineId = params.line_id;
    const specs = await request.json();

    // In a real implementation, this would:
    // 1. Validate the specs
    // 2. Update the quote line with new specifications
    // 3. Trigger validation of the process/material/finish combination
    // 4. Update the database

    // For now, we'll simulate the response
    const mockUpdatedLine = {
      id: lineId,
      fileId: 'file-123',
      fileName: 'bracket.stl',
      process: specs.process || 'CNC',
      material: specs.material || 'Aluminum 6061',
      finish: specs.finish || 'None',
      qty: specs.quantity || 1,
      status: 'Priced',
      specs: specs,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(mockUpdatedLine);
  } catch (error) {
    console.error('Error updating quote line:', error);
    return NextResponse.json(
      { error: 'Failed to update quote line' },
      { status: 500 }
    );
  }
}
