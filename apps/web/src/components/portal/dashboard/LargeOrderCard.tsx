'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { posthog } from 'posthog-js'

export function LargeOrderCard() {
  const router = useRouter()

  const handleStartLargeOrder = () => {
    posthog.capture('large_order_wizard_open')

    // In a real implementation, this would navigate to a wizard
    // For now, we'll create a quote directly
    router.push('/portal/quotes/new?type=large_order')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CloudArrowUpIcon className="w-6 h-6 mr-2" />
          Quote Assemblies and Production Orders
        </CardTitle>
        <p className="text-sm text-gray-600">
          Upload BOM, SOW, drawings, PDFs, ZIP for a comprehensive manual review.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Best for multi-part assemblies, tighter certs, PPAP, or special processes.
            </p>
          </div>

          <Button
            onClick={handleStartLargeOrder}
            className="w-full"
          >
            Start Your Large Order
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
