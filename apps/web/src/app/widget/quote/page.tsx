import { Metadata } from 'next'
import { headers } from 'next/headers'
import { AdvancedQuotePage } from '@/components/quote/AdvancedQuotePage'

export const metadata: Metadata = {
  title: 'Get an Instant Quote - CNC, Sheet Metal, Injection Molding',
  description: 'Upload your CAD files and get instant manufacturing quotes with advanced 3D analysis',
}

export default async function QuotePage() {
  const headersList = headers()
  const origin = headersList.get('origin')
  const referer = headersList.get('referer')

  return (
    <AdvancedQuotePage
      clientOrigin={origin || referer || ''}
      theme="#674299"
    />
  )
}