import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PromoBanner } from '@/components/portal/dashboard/PromoBanner'
import { InstantQuoteCard } from '@/components/portal/dashboard/InstantQuoteCard'
import { LargeOrderCard } from '@/components/portal/dashboard/LargeOrderCard'
import { ResumeQuotes } from '@/components/portal/dashboard/ResumeQuotes'
import { RecentActivity } from '@/components/portal/dashboard/RecentActivity'
import { SystemNotices } from '@/components/portal/dashboard/SystemNotices'
import { DashboardHeader } from '@/components/portal/dashboard/DashboardHeader'
import { DashboardSkeleton } from '@/components/portal/dashboard/DashboardSkeleton'
import { posthog } from 'posthog-js'

// Server action to fetch dashboard data in parallel
async function getDashboardData() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/sign-in')
  }

  // Fetch all dashboard data in parallel
  const [
    promotionsResponse,
    quotesResponse,
    ordersResponse,
    systemNoticesResponse
  ] = await Promise.allSettled([
    // Get current promotions
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/portal/promotions/current`, {
      headers: {
        'Authorization': `Bearer ${user.id}`, // In real implementation, use JWT
        'Content-Type': 'application/json'
      }
    }).catch(() => ({ ok: false, json: () => Promise.resolve(null) })),

    // Get recent quotes
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quotes?status=in_progress&limit=6`, {
      headers: {
        'Authorization': `Bearer ${user.id}`,
        'Content-Type': 'application/json'
      }
    }).catch(() => ({ ok: false, json: () => Promise.resolve([]) })),

    // Get recent orders
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders?limit=10&sort=-created_at`, {
      headers: {
        'Authorization': `Bearer ${user.id}`,
        'Content-Type': 'application/json'
      }
    }).catch(() => ({ ok: false, json: () => Promise.resolve([]) })),

    // Get system notices
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/system-health/public-notices`, {
      headers: {
        'Authorization': `Bearer ${user.id}`,
        'Content-Type': 'application/json'
      }
    }).catch(() => ({ ok: false, json: () => Promise.resolve([]) }))
  ])

  const promotions = promotionsResponse.status === 'fulfilled' && promotionsResponse.value.ok
    ? await promotionsResponse.value.json()
    : null

  const resumeQuotes = quotesResponse.status === 'fulfilled' && quotesResponse.value.ok
    ? await quotesResponse.value.json()
    : []

  const recentOrders = ordersResponse.status === 'fulfilled' && ordersResponse.value.ok
    ? await ordersResponse.value.json()
    : []

  const systemNotices = systemNoticesResponse.status === 'fulfilled' && systemNoticesResponse.value.ok
    ? await systemNoticesResponse.value.json()
    : []

  return {
    user,
    promotions,
    resumeQuotes,
    recentOrders,
    systemNotices
  }
}

export default async function PortalDashboardPage() {
  const dashboardData = await getDashboardData()

  // Track dashboard view
  if (typeof window !== 'undefined') {
    posthog.capture('dashboard_view', {
      user_id: dashboardData.user.id,
      has_promotions: !!dashboardData.promotions,
      resume_quotes_count: dashboardData.resumeQuotes.length,
      recent_orders_count: dashboardData.recentOrders.length,
      system_notices_count: dashboardData.systemNotices.length
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={dashboardData.user} />

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Promo Banner */}
        {dashboardData.promotions && (
          <div className="mb-8">
            <PromoBanner promotion={dashboardData.promotions} />
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="space-y-8">
          {/* Row 1: Instant Quote and Large Order Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <InstantQuoteCard />
            </div>
            <div className="lg:col-span-1">
              <LargeOrderCard />
            </div>
          </div>

          {/* Row 2: Resume Quotes */}
          <ResumeQuotes quotes={dashboardData.resumeQuotes} />

          {/* Row 3: Recent Activity and System Notices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <RecentActivity
                quotes={dashboardData.resumeQuotes}
                orders={dashboardData.recentOrders}
              />
            </div>
            <div className="lg:col-span-1">
              <SystemNotices notices={dashboardData.systemNotices} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Loading fallback
export function PortalDashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSkeleton />
    </div>
  )
}
