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
      redirect('/auth/sign-up?error=Passwords do not match')
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
        redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`)
      }

      if (data.user && !data.user.email_confirmed_at) {
        // User needs to confirm email
        redirect('/auth/verify-email?email=' + encodeURIComponent(email))
      }

      // User is signed up and confirmed, redirect to onboarding
      redirect('/onboarding')
    } catch (error) {
      console.error('Signup error:', error)
      redirect('/auth/sign-up?error=An unexpected error occurred')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Get started with CNC Quote today
          </p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <SignUpForm action={signUp} />
        </Suspense>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="font-medium text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
