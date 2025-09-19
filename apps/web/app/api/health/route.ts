import { NextResponse } from 'next/server'
import packageJson from '../../../package.json'

export async function GET() {
  const requestId = crypto.randomUUID()

  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    NODE_ENV: process.env.NODE_ENV
  };

  console.log('Health check - Environment status:', envCheck);

  const response = NextResponse.json({
    ok: true,
    service: 'web',
    version: packageJson.version,
    timestamp: new Date().toISOString(),
    environment: envCheck
  })

  response.headers.set('x-request-id', requestId)
  return response
}
