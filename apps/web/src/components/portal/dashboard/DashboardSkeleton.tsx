import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-24 h-6" />
            </div>

            {/* Search and Actions */}
            <div className="flex items-center space-x-4">
              <Skeleton className="w-64 h-10" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-24 h-8" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Promo Banner Skeleton */}
        <div className="mb-8">
          <Skeleton className="w-full h-24 rounded-lg" />
        </div>

        {/* Main Grid Skeleton */}
        <div className="space-y-8">
          {/* Row 1: Instant Quote and Large Order Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="w-48 h-6" />
                  <Skeleton className="w-64 h-4 mt-2" />
                  <Skeleton className="w-96 h-3 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="w-full h-32 rounded-lg" />
                  <div className="flex space-x-3 mt-6">
                    <Skeleton className="w-32 h-10" />
                    <Skeleton className="w-40 h-10" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <Skeleton className="w-40 h-6" />
                  <Skeleton className="w-56 h-4 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="w-full h-16 rounded-lg mb-4" />
                  <Skeleton className="w-full h-10" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Row 2: Resume Quotes Skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="w-48 h-6" />
                <Skeleton className="w-24 h-8" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <Skeleton className="w-full aspect-square rounded-lg mb-3" />
                    <Skeleton className="w-20 h-4 mb-2" />
                    <Skeleton className="w-16 h-6 mb-1" />
                    <Skeleton className="w-24 h-3 mb-3" />
                    <div className="flex space-x-2">
                      <Skeleton className="w-16 h-8" />
                      <Skeleton className="w-8 h-8" />
                      <Skeleton className="w-8 h-8" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Row 3: Recent Activity and System Notices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="w-32 h-6" />
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2 mb-6">
                    <Skeleton className="w-16 h-8" />
                    <Skeleton className="w-16 h-8" />
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="w-10 h-10 rounded-lg" />
                          <div>
                            <Skeleton className="w-20 h-4 mb-1" />
                            <Skeleton className="w-24 h-3" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <Skeleton className="w-16 h-6" />
                          <Skeleton className="w-16 h-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="w-28 h-6" />
                    <Skeleton className="w-20 h-8" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <Skeleton className="w-5 h-5 mt-0.5" />
                          <div className="flex-1">
                            <Skeleton className="w-32 h-4 mb-2" />
                            <Skeleton className="w-full h-3 mb-2" />
                            <Skeleton className="w-24 h-3" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
