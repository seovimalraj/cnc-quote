import { Suspense } from 'react'
import Link from 'next/link'
import { headers, cookies } from 'next/headers'
import { ContractsVNext } from '@cnc-quote/shared'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface InvitePageProps {
  searchParams: {
    token?: string
    email?: string
  }
}

const STATUS_LABEL: Record<ContractsVNext.OrgInviteStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired'
}

const STATUS_BADGE_VARIANT: Record<ContractsVNext.OrgInviteStatus, 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary',
  accepted: 'outline',
  expired: 'destructive'
}

const ROLE_LABEL: Record<ContractsVNext.OrgInviteRole, string> = {
  admin: 'Admin',
  engineer: 'Engineer',
  buyer: 'Buyer',
  viewer: 'Viewer'
}

const resolveAppOrigin = () => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }

  const hdrs = headers()
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host')
  if (!host) {
    throw new Error('Unable to resolve request host for invite lookup')
  }
  const proto = hdrs.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

async function getInviteDetails(token: string) {
  try {
    const baseUrl = resolveAppOrigin()
    const cookieHeader = cookies().toString()
    const response = await fetch(`${baseUrl}/api/invites/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {})
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    return ContractsVNext.OrgInviteDetailsSchema.parse(payload)
  } catch (error) {
    console.error('Error fetching invite details:', error)
    return null
  }
}

async function InviteContent({ searchParams }: InvitePageProps) {
  const { token, email } = searchParams

  if (!token) {
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

  const invite = await getInviteDetails(token)

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invite Not Found</CardTitle>
            <CardDescription>
              We couldn&apos;t locate an invite for this link. Please request a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              The invite may have expired or been revoked by an administrator.
            </p>
            <Link href="/auth/sign-in">
              <Button>Go to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusLabel = STATUS_LABEL[invite.status]
  const statusVariant = STATUS_BADGE_VARIANT[invite.status]
  const roleLabel = ROLE_LABEL[invite.role]
  const emailMismatch = Boolean(email) && email.toLowerCase() !== invite.email.toLowerCase()
  const expiresDisplay = new Date(invite.expiresAt).toLocaleString()
  const invitedDisplay = new Date(invite.invitedAt).toLocaleString()
  const inviterDisplay = invite.inviter ? `${invite.inviter.name} (${invite.inviter.email})` : 'System Administrator'

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
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </CardTitle>
            <CardDescription>
              Review the details below and accept the invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Organization:</span>
                <span className="text-sm text-gray-900">{invite.organization.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Invited by:</span>
                <span className="text-sm text-gray-900">{inviterDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Role:</span>
                <Badge variant="outline">{roleLabel}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Expires:</span>
                <span className="text-sm text-gray-900">{expiresDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Invite sent:</span>
                <span className="text-sm text-gray-900">{invitedDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Recipient:</span>
                <span className="text-sm text-gray-900">{invite.email}</span>
              </div>
            </div>

            {emailMismatch && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                The email on this invite ({invite.email}) does not match the address in the link ({email}).
                You can continue if you trust the link, but the accepting user must match the invited email.
              </div>
            )}

            {invite.status !== 'pending' && (
              <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                This invite is no longer active. Contact your administrator to request a new invitation.
              </div>
            )}

            <div className="pt-4 space-y-3">
              <Button className="w-full" disabled={!invite.canAccept}>
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
