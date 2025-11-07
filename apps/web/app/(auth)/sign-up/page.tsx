import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { SignUpForm } from '@/components/auth/SignUpForm'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export default function SignUpPage() {
  async function signUp(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string
    const marketingConsent = formData.get('marketing_consent') === 'on'

    if (password !== confirmPassword) {
      redirect('/sign-up?error=Passwords do not match')
    }

    const supabase = await createClient()

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            marketing_consent: marketingConsent,
          },
        },
      })

      if (error) {
        redirect(`/sign-up?error=${encodeURIComponent(error.message)}`)
      }

      if (data.user && !data.user.email_confirmed_at) {
        // User needs to confirm email
        redirect('/verify-email?email=' + encodeURIComponent(email))
      }

      // User is signed up and confirmed, redirect to onboarding
      redirect('/onboarding')
    } catch (error) {
      console.error('Signup error:', error)
      redirect('/sign-up?error=An unexpected error occurred')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated gradient background - matching signin */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[blob_7s_infinite]"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[blob_7s_infinite_2s]"></div>
        <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[blob_7s_infinite_4s]"></div>
      </div>

      {/* Glassmorphic container */}
      <div className="relative w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-8">
          {/* Logo and header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m0-3h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Create Account
            </h1>
            <p className="text-blue-100">
              Join thousands of manufacturers
            </p>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          }>
            <SignUpForm action={signUp} />
          </Suspense>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-sm text-blue-100 mb-3 text-center">What you get:</p>
            <ul className="space-y-2 text-sm text-white">
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Instant AI-powered quotes
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Real-time DFM analysis
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Supplier network access
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom text */}
        <p className="mt-6 text-center text-sm text-white/80">
          Secure enterprise authentication powered by Supabase
        </p>
      </div>
    </div>
  )
}
