import { Suspense } from 'react'
import { AbandonedQuotesTable } from '@/components/admin/AbandonedQuotesTable'
import { AbandonedFilters } from '@/components/admin/AbandonedFilters'
import { AbandonedTimelineDrawer } from '@/components/admin/AbandonedTimelineDrawer'
import { AbandonedQuotesProvider } from '@/components/providers/AbandonedQuotesProvider'

export default function AbandonedQuotesPage() {
  return (
    <AbandonedQuotesProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Abandoned Quotes</h1>
            <p className="mt-2 text-sm text-gray-600">
              Track and recover quotes that customers started but didn't complete
            </p>
          </div>

          {/* Filters Bar */}
          <div className="mb-6">
            <Suspense fallback={<div className="animate-pulse h-16 bg-white rounded-lg"></div>}>
              <AbandonedFilters />
            </Suspense>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6">
            {/* Table */}
            <div className="bg-white shadow rounded-lg">
              <Suspense fallback={<div className="animate-pulse h-96"></div>}>
                <AbandonedQuotesTable />
              </Suspense>
            </div>
          </div>

          {/* Timeline Drawer */}
          <AbandonedTimelineDrawer />
        </div>
      </div>
    </AbandonedQuotesProvider>
  )
}
