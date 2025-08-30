import { NextResponse } from 'next/server'
import packageJson from '../../../package.json'

export async function GET() {
  const requestId = crypto.randomUUID()
  
  const response = NextResponse.json({
    ok: true,
    service: 'web',
    version: packageJson.version,
    timestamp: new Date().toISOString()
  })

  response.headers.set('x-request-id', requestId)
  return response
}
