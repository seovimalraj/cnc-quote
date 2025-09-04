import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { LeadTimeCard } from '@/components/quotes/LeadTimeCard'
import { OrderSidebar } from '@/components/quotes/OrderSidebar'
import { Header } from '@/components/Header/Header'
import { QuoteProvider } from '@/components/providers/QuoteProvider'

interface InstantQuotePageProps {
  params: {
    id: string
  }
}

export default function InstantQuotePage({ params }: InstantQuotePageProps) {
  const { id } = params

  if (!id) {
    notFound()
  }

  return (
    <QuoteProvider quoteId={id}>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Lead Time Card - Takes up 7/12 columns on large screens */}
            <div className="lg:col-span-7">
              <Suspense fallback={<div className="animate-pulse bg-white rounded-lg h-96"></div>}>
                <LeadTimeCard />
              </Suspense>
            </div>

            {/* Order Sidebar - Takes up 5/12 columns on large screens */}
            <div className="lg:col-span-5">
              <Suspense fallback={<div className="animate-pulse bg-white rounded-lg h-64"></div>}>
                <OrderSidebar />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </QuoteProvider>
  )
}
