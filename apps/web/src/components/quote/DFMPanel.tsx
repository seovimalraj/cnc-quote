'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Part, DFMResult } from '@/lib/hooks/use-quote-store'

interface DFMPanelProps {
  part: Part | null
  dfmResults: DFMResult[]
  onFixIssue: (issueId: string, fix: any) => void
}

export const DFMPanel = ({ part, dfmResults, onFixIssue }: DFMPanelProps) => {
  if (!part) return null

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const blockers = dfmResults.filter(r => r.severity === 'blocker')
  const warnings = dfmResults.filter(r => r.severity === 'warning')
  const infos = dfmResults.filter(r => r.severity === 'info')

  return (
    <div className="absolute top-4 right-4 w-80 max-h-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <WrenchScrewdriverIcon className="h-4 w-4" />
          <span>DFM Analysis</span>
        </CardTitle>
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>{blockers.length} blockers</span>
          <span>{warnings.length} warnings</span>
          <span>{infos.length} suggestions</span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="h-80 overflow-y-auto">
          <div className="p-4 space-y-3">
            {dfmResults.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-900">No DFM issues found</div>
                <div className="text-xs text-gray-500">Your design looks good to manufacture!</div>
              </div>
            ) : (
              dfmResults.map((result) => (
                <Card key={result.id} className={`border ${getSeverityColor(result.severity)}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(result.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {result.code}
                          </Badge>
                          <span className="text-xs text-gray-500 uppercase">
                            {result.severity}
                          </span>
                        </div>

                        <div className="text-sm text-gray-900 mb-2">
                          {result.message}
                        </div>

                        {result.suggestion && (
                          <div className="text-xs text-gray-600 mb-2">
                            💡 {result.suggestion}
                          </div>
                        )}

                        {result.autoFix && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={() => onFixIssue(result.id, result.autoFix)}
                          >
                            <WrenchScrewdriverIcon className="h-3 w-3 mr-1" />
                            Apply Fix
                          </Button>
                        )}

                        {result.location && (
                          <div className="text-xs text-gray-500 mt-2">
                            Location: {result.location.x.toFixed(1)}, {result.location.y.toFixed(1)}, {result.location.z.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </CardContent>

      {/* Summary Footer */}
      {dfmResults.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="text-xs text-gray-600">
            {blockers.length > 0 && (
              <div className="text-red-600 font-medium">
                ⚠️ {blockers.length} blocker{blockers.length !== 1 ? 's' : ''} must be resolved
              </div>
            )}
            {warnings.length > 0 && (
              <div className="text-yellow-600">
                {warnings.length} warning{warnings.length !== 1 ? 's' : ''} to review
              </div>
            )}
            {infos.length > 0 && (
              <div className="text-blue-600">
                {infos.length} suggestion{infos.length !== 1 ? 's' : ''} available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
