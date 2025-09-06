import { NextRequest, NextResponse } from 'next/server'

// Mock 3D model data
const mockModelData = {
  type: 'cube',
  dimensions: { x: 10, y: 10, z: 10 },
  position: { x: 0, y: 0, z: 0 }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modelId = params.id

    // In a real implementation, you would fetch the model from a database or file system
    // For now, return mock data
    return NextResponse.json(mockModelData)
  } catch (error) {
    console.error('Model fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    )
  }
}
