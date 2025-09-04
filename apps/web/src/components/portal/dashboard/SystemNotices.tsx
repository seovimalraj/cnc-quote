'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { posthog } from 'posthog-js'

interface SystemNotice {
  id: string
  severity: 'info' | 'warn' | 'error'
  title: string
  body: string
  starts_at: string
  ends_at: string
}

interface SystemNoticesProps {
  notices: SystemNotice[]
}

export function SystemNotices({ notices }: SystemNoticesProps) {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'error':
        return {
          icon: XCircleIcon,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'warn':
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        }
      case 'info':
      default:
        return {
          icon: InformationCircleIcon,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
    }
  }

  const handleStatusPageClick = () => {
    posthog.capture('status_page_click')
  }

  // Only show the first 3 notices
  const displayNotices = notices.slice(0, 3)

  if (displayNotices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Notices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <InformationCircleIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">All systems operational</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>System Notices</CardTitle>
          <Link href="/status">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStatusPageClick}
            >
              View Status
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayNotices.map((notice) => {
            const config = getSeverityConfig(notice.severity)
            const Icon = config.icon

            return (
              <div
                key={notice.id}
                className={`p-4 border rounded-lg ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{notice.title}</h4>
                      <Badge
                        variant="outline"
                        className={`text-xs ${config.color} border-current`}
                      >
                        {notice.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{notice.body}</p>
                    <div className="text-xs text-gray-500">
                      {new Date(notice.starts_at).toLocaleDateString()} - {new Date(notice.ends_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
