'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { posthog } from 'posthog-js'

export function RouteDecider() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          // User not authenticated, redirect to sign in
          posthog.capture('route_decision', { decision: 'signin', reason: 'not_authenticated' })
          router.push('/auth/sign-in')
          return
        }

        // Check if user has completed onboarding
        // In a real implementation, you'd check this from your database
        const hasCompletedOnboarding = user.user_metadata?.onboarding_completed

        if (!hasCompletedOnboarding) {
          // User hasn't completed onboarding
          posthog.capture('route_decision', { decision: 'onboarding', reason: 'onboarding_incomplete' })
          router.push('/onboarding')
          return
        }

        // Check if user belongs to an organization
        // In a real implementation, you'd check this from your database
        const hasOrganization = user.user_metadata?.organization_id

        if (!hasOrganization) {
          // User needs to create or join an organization
          posthog.capture('route_decision', { decision: 'create_org', reason: 'no_organization' })
          router.push('/auth/create-organization')
          return
        }

        // User is fully set up, redirect to dashboard
        posthog.capture('route_decision', { decision: 'dashboard', reason: 'fully_setup' })
        router.push('/dashboard')

      } catch (error) {
        console.error('Error checking user status:', error)
        posthog.capture('route_decision_error', { error: error instanceof Error ? error.message : 'Unknown error' })
        router.push('/auth/sign-in')
      }
    }

    checkUserStatus()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Setting up your account...</p>
      </div>
    </div>
  )
}
