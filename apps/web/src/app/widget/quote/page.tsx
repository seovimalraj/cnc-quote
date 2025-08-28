import { Metadata } from 'next'
import { headers } from 'next/headers'
import { QuoteWizard } from '@/components/widget/QuoteWizard'

export const metadata: Metadata = {
  title: 'Get an Instant Quote',
  description: 'Upload your CAD files and get instant manufacturing quotes',
}

export default async function QuotePage() {
  const headersList = headers()
  const origin = headersList.get('origin')
  const referer = headersList.get('referer')

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto py-8 px-4">
        <QuoteWizard 
          clientOrigin={origin || referer || ''} 
          theme="#674299"
        />
      </div>
    </main>
  )
}
