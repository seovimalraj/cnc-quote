import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;
    const body = await request.json();
    const { fileId, fileName, fileSize } = body;

    // Generate line ID
    const lineId = `L${Date.now().toString().slice(-6)}`;

    // Generate mock pricing based on file size and type
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const basePrice = Math.floor(fileSize / 1024 / 1024) * 10 + 50; // $50 base + $10 per MB
    const materialMultiplier = fileExtension === 'stl' ? 1.2 : fileExtension === 'step' ? 1.5 : 1.0;
    const estimatedPrice = Math.floor(basePrice * materialMultiplier);

    // Mock processing time based on file size
    const processingTime = Math.max(2, Math.floor(fileSize / 1024 / 1024 / 10)); // 2+ minutes per 10MB

    // In a real implementation, this would create a quote line in the database
    // For now, we'll return a mock quote line object with realistic pricing
    const quoteLine = {
      id: lineId,
      quoteId,
      fileId,
      fileName,
      fileSize,
      status: 'completed', // Mark as completed for demo
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      quantity: 1,
      material: 'Aluminum 6061-T6',
      finish: 'As Machined',
      estimatedPrice,
      estimatedTime: `${processingTime} minutes`,
      process: 'CNC',
      pricingBreakdown: {
        setup_time_min: processingTime * 0.3,
        cycle_time_min: processingTime * 0.7,
        machine_rate_per_hr: 75,
        material_buy_cost: estimatedPrice * 0.4,
        material_waste_factor: 1.1,
        tooling_wear_cost: estimatedPrice * 0.05,
        finish_cost: 0,
        inspection_cost: estimatedPrice * 0.1,
        risk_adder: estimatedPrice * 0.05,
        overhead: estimatedPrice * 0.2,
        margin: estimatedPrice * 0.15,
        unit_price: estimatedPrice
      }
    };

    return NextResponse.json(quoteLine);

  } catch (error) {
    console.error('Quote line creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create quote line' },
      { status: 500 }
    );
  }
}