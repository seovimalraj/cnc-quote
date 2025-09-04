'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import {
  WrenchScrewdriverIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'

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

interface DFMPanelProps {
  quoteId: string
  fileId: string
  process: string
  material: string
  onHighlight?: (check: DFMCheck) => void
  onClearHighlight?: () => void
}

const DFM_CHECKS = [
  {
    id: 'file_type',
    title: 'File Type',
    intent: 'Ensure STEP/IGES/Parasolid; allow STL only if enabled.',
    severity_logic: 'blocker if unsupported; warning if mesh-only with machining process'
  },
  {
    id: 'units_and_scale',
    title: 'Units & Scale Check',
    intent: 'Detect unrealistic sizes vs declared units.',
    severity_logic: 'blocker if bbox_min<0.1mm or bbox_max>5000mm'
  },
  {
    id: 'floating_parts',
    title: 'Floating Parts Check',
    intent: 'Multiple unconnected bodies when one expected.',
    severity_logic: 'warning if >1 shells; blocker if process requires single solid'
  },
  {
    id: 'model_fidelity',
    title: 'Model Fidelity',
    intent: 'Catch bad geometry (non-manifold, inverted normals, duplicates).',
    severity_logic: 'blocker if BRepCheck != Valid'
  },
  {
    id: 'self_intersection',
    title: 'Non-Manifold / Self-Intersection Check',
    intent: 'Find self-overlaps, bow-tie edges, zero-thickness faces.',
    severity_logic: 'blocker if intersections>0'
  },
  {
    id: 'shell_count',
    title: 'Model Shell Count',
    intent: 'Count closed shells; flag when >1 required single solid.',
    severity_logic: 'warning if shells>1'
  },
  {
    id: 'voids',
    title: 'Void Check',
    intent: 'Detect internal cavities/trapped volumes.',
    severity_logic: 'warning; blocker if non-drainable'
  },
  {
    id: 'large_dimension',
    title: 'Large Part Dimension',
    intent: 'Compare OBB to machine envelope.',
    severity_logic: 'blocker if any axis > machine_travel'
  },
  {
    id: 'finish_capacity',
    title: 'Part Exceeds Maximum Size for This Finish',
    intent: 'Check finishing equipment capacity.',
    severity_logic: 'blocker if bbox>finish_capacity'
  },
  {
    id: 'tool_access',
    title: 'Tool Access / Reach (3-Axis Feasibility)',
    intent: 'Faces need approach angle or long stick-out.',
    severity_logic: 'warning; blocker if impossible on 3-axis'
  },
  {
    id: 'corner_radius',
    title: 'Internal Corner Radius vs Cutter Diameter',
    intent: 'Inside corners smaller than tool radius.',
    severity_logic: 'warning if R<tool_R_min; blocker if critical'
  },
  {
    id: 'min_wall',
    title: 'Minimum Wall Thickness',
    intent: 'Walls below material rule.',
    severity_logic: 'warning/blocker by material thresholds'
  },
  {
    id: 'thin_web',
    title: 'Thin Web / Fin Slenderness',
    intent: 'Web height/thickness > limit (e.g., 10:1).',
    severity_logic: 'warning if h/t>10; blocker if >15'
  },
  {
    id: 'min_hole_dia',
    title: 'Minimum Hole Diameter',
    intent: 'Holes smaller than standard drills.',
    severity_logic: 'warning if <1.0mm or below shop-set'
  },
  {
    id: 'hole_depth_ratio',
    title: 'Hole Depth-to-Diameter Ratio',
    intent: 'Deep holes beyond guideline.',
    severity_logic: 'warning if >10xD; blocker if required tolerance tight'
  },
  {
    id: 'pocket_ratio',
    title: 'Pocket Depth-to-Width Ratio',
    intent: 'Deep/narrow pockets problematic.',
    severity_logic: 'warning if depth>4x tool_D'
  },
  {
    id: 'slot_width',
    title: 'Slot Width vs Cutter Availability',
    intent: 'Slots narrower than smallest end mill.',
    severity_logic: 'warning/blocker below shop min'
  },
  {
    id: 'boss_slenderness',
    title: 'Boss/Pin Slenderness',
    intent: 'Boss height/Ø too high.',
    severity_logic: 'warning if h/Ø>3; blocker if >5'
  },
  {
    id: 'thread_feasibility',
    title: 'Thread Feasibility',
    intent: 'Minor Ø, class, LOE, tool access, standards.',
    severity_logic: 'warning or blocker on mismatch'
  },
  {
    id: 'workholding',
    title: 'Workholding / Clamp Area',
    intent: 'Insufficient flat/parallel clamp pads.',
    severity_logic: 'warning if pad_area<min; blocker if none'
  }
]

export const DFMPanel = ({
  quoteId,
  fileId,
  process,
  material,
  onHighlight,
  onClearHighlight
}: DFMPanelProps): JSX.Element => {
  const [checks, setChecks] = useState<DFMCheck[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)

  // Mock DFM results for demonstration
  const mockResults: DFMCheck[] = [
    {
      id: 'min_wall',
      title: 'Minimum Wall Thickness',
      status: 'warning',
      message: 'Two walls below 1.0 mm for Aluminum (0.78 mm, 0.92 mm).',
      metrics: { min_wall_mm: 0.78 },
      suggestions: ['Increase to ≥ 1.0 mm or change to Steel (≥0.8 mm).'],
      highlights: { face_ids: [123, 456], edge_ids: [] }
    },
    {
      id: 'tool_access',
      title: 'Tool Access / Reach (3-Axis Feasibility)',
      status: 'warning',
      message: 'Some features may require 5-axis machining for proper tool access.',
      metrics: { inaccessible_faces: 3 },
      suggestions: ['Consider 5-axis machining or redesign for better access.'],
      highlights: { face_ids: [789, 101, 202], edge_ids: [45, 67] }
    },
    {
      id: 'corner_radius',
      title: 'Internal Corner Radius vs Cutter Diameter',
      status: 'blocker',
      message: 'Internal corner radius (0.5mm) smaller than minimum cutter diameter (1.0mm).',
      metrics: { corner_radius_mm: 0.5, min_cutter_mm: 1.0 },
      suggestions: ['Increase internal corner radius to ≥ 1.0mm.'],
      highlights: { face_ids: [], edge_ids: [88, 99] }
    }
  ]

  const startAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      // Mock API call
      const response = await fetch('/api/dfm/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          quote_line_id: quoteId,
          process,
          material,
          units: 'mm'
        })
      })
      const data = await response.json()
      setTaskId(data.task_id)
    } catch (error) {
      console.error('Failed to start DFM analysis:', error)
      // Fallback to mock data
      setChecks(mockResults)
      setIsAnalyzing(false)
    }
  }

  const checkStatus = async () => {
    if (!taskId) return

    try {
      const response = await fetch(`/api/dfm/result/${taskId}`)
      const data = await response.json()

      if (data.status === 'Succeeded') {
        setChecks(data.checks)
        setIsAnalyzing(false)
        setTaskId(null)
      } else if (data.status === 'Failed') {
        console.error('DFM analysis failed')
        setIsAnalyzing(false)
        setTaskId(null)
      }
    } catch (error) {
      console.error('Failed to check DFM status:', error)
    }
  }

  useEffect(() => {
    if (taskId) {
      const interval = setInterval(checkStatus, 2000)
      return () => clearInterval(interval)
    }
  }, [taskId])

  const summary = checks.reduce(
    (acc, check) => {
      acc[check.status] = (acc[check.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const handleCheckClick = (check: DFMCheck) => {
    if (onHighlight) {
      onHighlight(check)
    }
  }

  const handleCheckHover = (check: DFMCheck, isHovering: boolean) => {
    if (isHovering && onHighlight) {
      onHighlight(check)
    } else if (!isHovering && onClearHighlight) {
      onClearHighlight()
    }
  }

  return (
    <Card className="w-96 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <WrenchScrewdriverIcon className="h-5 w-5" />
          <span>DFM Feedback</span>
        </CardTitle>
        <div className="text-sm text-gray-600">
          {checks.length === 0 && !isAnalyzing && 'Ready to analyze'}
          {isAnalyzing && 'Analyzing...'}
          {checks.length > 0 && `${summary.pass || 0} passed | ${summary.warning || 0} warnings | ${summary.blocker || 0} blockers`}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {checks.length === 0 && !isAnalyzing && (
          <div className="text-center py-8">
            <WrenchScrewdriverIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Design for Manufacturability
            </h3>
            <p className="text-gray-600 mb-4">
              Analyze your design for manufacturing issues and optimization opportunities.
            </p>
            <Button onClick={startAnalysis} className="w-full">
              Start Analysis
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Running 20 automated checks...</p>
          </div>
        )}

        {checks.length > 0 && (
          <div className="h-full overflow-y-auto">
            <Accordion
              items={checks.map(check => ({
                id: check.id,
                title: check.title,
                status: check.status,
                children: (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">{check.message}</p>

                    {check.metrics && (
                      <div className="bg-gray-50 p-3 rounded text-xs">
                        <div className="font-medium text-gray-900 mb-1">Metrics:</div>
                        {Object.entries(check.metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span className="font-mono">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {check.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium text-sm text-gray-900">Suggestions:</div>
                        {check.suggestions.map((suggestion, index) => (
                          <div key={index} className="text-sm text-gray-700 flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">💡</span>
                            <span>{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckClick(check)}
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                        View in Model
                      </Button>
                      <Button size="sm" variant="ghost">
                        Learn More
                      </Button>
                    </div>
                  </div>
                )
              }))}
            />
          </div>
        )}
      </CardContent>

      {checks.length > 0 && (summary.blocker || 0) > 0 && (
        <div className="border-t border-red-200 bg-red-50 p-3">
          <div className="flex items-center space-x-2 text-red-700">
            <XCircleIcon className="h-5 w-5" />
            <span className="text-sm font-medium">
              {(summary.blocker || 0)} blocker{(summary.blocker || 0) !== 1 ? 's' : ''} must be resolved
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}
