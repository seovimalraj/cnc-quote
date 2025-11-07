import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function VerifyEmailContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent you a verification link to confirm your account
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Click the link in your email to verify your account and complete your registration.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try signing up again.
              </p>
            </div>

            <div className="space-y-3">
              <Link href="/signin" className="w-full">
                <Button className="w-full">
                  Back to Sign In
                </Button>
              </Link>

              <Link href="/sign-up" className="w-full">
                <Button variant="outline" className="w-full">
                  Try Different Email
                </Button>
              </Link>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Need help?{' '}
                <Link href="/support" className="text-blue-600 hover:text-blue-500">
                  Contact Support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
