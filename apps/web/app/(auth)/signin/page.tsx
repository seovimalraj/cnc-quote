import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignInForm } from '@/components/auth/SignInForm'

export default function SignInPage() {
  const handleSubmit = async (formData: FormData) => {
    'use server'

    const supabase = createClient()
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const rememberMe = formData.get('remember_me') === 'on'

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return redirect('/auth/sign-in?error=' + encodeURIComponent(error.message))
    }

    // Set session persistence based on remember me
    if (rememberMe) {
      await supabase.auth.setSession({
        access_token: (await supabase.auth.getSession()).data.session?.access_token || '',
        refresh_token: (await supabase.auth.getSession()).data.session?.refresh_token || '',
      })
    }

    // Fetch user profile and determine next route
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_memberships(*)')
      .single()

    // Route decision logic
    if (!profile?.organization_memberships || profile.organization_memberships.length === 0) {
      return redirect('/onboarding/create-organization')
    }

    const activeOrg = profile.organization_memberships[0]
    if (!activeOrg.organization?.billing_address_id || !activeOrg.organization?.shipping_address_id) {
      return redirect('/onboarding/first-run')
    }

    return redirect('/portal/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <span className="text-2xl font-bold text-blue-600">C</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <SignInForm action={handleSubmit} />
        </Suspense>
      </div>
    </div>
  )
}
