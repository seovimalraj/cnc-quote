import { NextRequest, NextResponse } from 'next/server'

const CAD_SERVICE_URL = process.env.CAD_SERVICE_URL || 'http://localhost:8001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${CAD_SERVICE_URL}/dfm/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`CAD service error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('DFM analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to start DFM analysis' },
      { status: 500 }
    )
  }
}
