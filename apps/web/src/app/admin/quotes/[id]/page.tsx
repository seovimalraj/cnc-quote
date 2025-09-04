import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { InternalQuoteHeader } from '@/components/admin/InternalQuoteHeader'
import { InternalQuoteTabs } from '@/components/admin/InternalQuoteTabs'
import { InternalQuoteSidebar } from '@/components/admin/InternalQuoteSidebar'
import { InternalQuoteProvider } from '@/components/providers/InternalQuoteProvider'

interface InternalQuotePageProps {
  params: {
    id: string
  }
}

export default function InternalQuotePage({ params }: InternalQuotePageProps) {
  const { id } = params

  if (!id) {
    notFound()
  }

  return (
    <InternalQuoteProvider quoteId={id}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <Suspense fallback={<div className="animate-pulse h-16 bg-white border-b"></div>}>
          <InternalQuoteHeader />
        </Suspense>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Content - Takes up 8/12 columns on large screens */}
            <div className="lg:col-span-8">
              <Suspense fallback={<div className="animate-pulse bg-white rounded-lg h-96"></div>}>
                <InternalQuoteTabs />
              </Suspense>
            </div>

            {/* Sidebar - Takes up 4/12 columns on large screens */}
            <div className="lg:col-span-4">
              <Suspense fallback={<div className="animate-pulse bg-white rounded-lg h-64"></div>}>
                <InternalQuoteSidebar />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </InternalQuoteProvider>
  )
}
