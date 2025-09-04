import { NextRequest, NextResponse } from 'next/server'

const CAD_SERVICE_URL = process.env.CAD_SERVICE_URL || 'http://localhost:8001'

export async function GET(
  request: NextRequest,
  { params }: { params: { task_id: string } }
) {
  try {
    const taskId = params.task_id

    const response = await fetch(`${CAD_SERVICE_URL}/dfm/result/${taskId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CAD service error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('DFM result error:', error)
    return NextResponse.json(
      { error: 'Failed to get DFM result' },
      { status: 500 }
    )
  }
}
