'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronLeftIcon,
  HomeIcon,
  PencilIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import { DFMPanel } from '@/components/dfm/DFMPanel'
import { Viewer3D } from '@/components/viewer/Viewer3D'
import * as THREE from 'three'

interface DFMCheck {
  id: string
  title: string
  status: 'pass' | 'warning' | 'blocker' | 'running'
  message: string
  metrics?: Record<string, any>
  suggestions: string[]
  highlights: {
    face_ids: number[]
    edge_ids: number[]
  }
}

export default function AnalyzePage() {
  const params = useParams()
  const quoteId = params.id as string

  const [currentHighlights, setCurrentHighlights] = useState<{
    face_ids: number[]
    edge_ids: number[]
    color: string
  } | null>(null)

  const [modelGeometry, setModelGeometry] = useState<THREE.BufferGeometry | null>(null)

  // Mock quote data
  const quoteData = {
    id: quoteId,
    status: 'draft',
    items: [
      {
        id: 'line-1',
        file_name: 'bracket.step',
        process: 'CNC',
        material: 'Aluminum 6061-T6',
        dims: { x_mm: 100, y_mm: 50, z_mm: 25 }
      }
    ]
  }

  const handleHighlight = (check: DFMCheck) => {
    setCurrentHighlights({
      face_ids: check.highlights.face_ids,
      edge_ids: check.highlights.edge_ids,
      color: check.status === 'blocker' ? 'rgba(239,68,68,0.5)' :
             check.status === 'warning' ? 'rgba(245,158,11,0.5)' :
             'rgba(34,197,94,0.5)'
    })
  }

  const handleClearHighlight = () => {
    setCurrentHighlights(null)
  }

  const handleModelLoad = (geometry: THREE.BufferGeometry) => {
    setModelGeometry(geometry)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button className="flex items-center hover:text-gray-900">
                <HomeIcon className="h-4 w-4 mr-1" />
                Dashboard
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Quotes</span>
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="font-medium text-gray-900">{quoteId}</span>
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="font-medium text-gray-900">Analyze</span>
            </div>

            {/* Title */}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-semibold text-gray-900">DFM Analysis</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <PencilIcon className="h-4 w-4 mr-2" />
                Revise CAD
              </Button>
              <Button variant="outline" size="sm">
                <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <Button variant="outline" size="sm">
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                Upload Drawings
              </Button>
              <Button variant="outline" size="sm">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button variant="outline" size="sm">
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* DFM Panel */}
          <div className="lg:col-span-1">
            <DFMPanel
              quoteId={quoteId}
              fileId={quoteData.items[0].id}
              process={quoteData.items[0].process}
              material={quoteData.items[0].material}
              onHighlight={handleHighlight}
              onClearHighlight={handleClearHighlight}
            />
          </div>

          {/* 3D Viewer */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CubeIcon className="h-5 w-5" />
                  <span>3D Model Viewer</span>
                  <Badge variant="secondary" className="ml-auto">
                    {quoteData.items[0].file_name}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-96 lg:h-[600px]">
                  <Viewer3D
                    modelUrl={`/api/models/${quoteData.items[0].id}`}
                    highlights={currentHighlights || undefined}
                    onModelLoad={handleModelLoad}
                    width="100%"
                    height="100%"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">18</div>
                  <div className="text-sm text-gray-600">Checks Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">2</div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-gray-600">Blockers</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 text-green-800">
                  <div className="text-lg">✓</div>
                  <div>
                    <div className="font-medium">Design Approved</div>
                    <div className="text-sm">All critical issues resolved. Ready for manufacturing.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
