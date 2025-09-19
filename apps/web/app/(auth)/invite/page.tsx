import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface InvitePageProps {
  searchParams: {
    token?: string
    email?: string
  }
}

async function getInviteDetails(token: string) {
  const supabase = await createClient()

  try {
    // In a real implementation, you'd verify the invite token
    // and fetch organization details from your database
    // For now, we'll return mock data
    const mockInvite = {
      organization: {
        name: 'Acme Manufacturing',
        id: 'org_123'
      },
      inviter: {
        name: 'John Doe',
        email: 'john@acme.com'
      },
      role: 'member',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }

    return mockInvite
  } catch (error) {
    console.error('Error fetching invite details:', error)
    return null
  }
}

function InviteContent({ searchParams }: InvitePageProps) {
  const { token, email } = searchParams

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Invite Link</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Please check your email for a valid invite link or contact the organization administrator.
            </p>
            <Link href="/auth/sign-in">
              <Button>Go to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Organization Invite
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You've been invited to join an organization
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Join Organization
              <Badge variant="secondary">Pending</Badge>
            </CardTitle>
            <CardDescription>
              Review the details below and accept the invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Organization:</span>
                <span className="text-sm text-gray-900">Acme Manufacturing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Invited by:</span>
                <span className="text-sm text-gray-900">John Doe (john@acme.com)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Role:</span>
                <Badge variant="outline">Member</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Expires:</span>
                <span className="text-sm text-gray-900">
                  {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button className="w-full">
                Accept Invitation
              </Button>

              <Button variant="outline" className="w-full">
                Decline Invitation
              </Button>
            </div>

            <div className="text-center pt-4">
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <Link href="/auth/sign-in" className="text-blue-600 hover:text-blue-500">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function InvitePage({ searchParams }: InvitePageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <InviteContent searchParams={searchParams} />
    </Suspense>
  )
}
