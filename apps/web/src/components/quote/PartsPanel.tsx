'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PlusIcon,
  DocumentIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
  Squares2X2Icon,
  TagIcon
} from '@heroicons/react/24/outline'
import { Part } from '@/lib/hooks/use-quote-store'

interface PartsPanelProps {
  parts: Part[]
  selectedPart: Part | null
  onSelectPart: (part: Part | null) => void
  onAddPart: (files: File[]) => void
  onRemovePart: (partId: string) => void
  onDuplicatePart: (partId: string) => void
  onGroupAsAssembly: (partIds: string[]) => void
}

export const PartsPanel = ({
  parts,
  selectedPart,
  onSelectPart,
  onAddPart,
  onRemovePart,
  onDuplicatePart,
  onGroupAsAssembly
}: PartsPanelProps) => {
  const [selectedParts, setSelectedParts] = useState<string[]>([])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      onAddPart(files)
    }
    // Reset input
    event.target.value = ''
  }

  const togglePartSelection = (partId: string) => {
    setSelectedParts(prev =>
      prev.includes(partId)
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    )
  }

  const getProcessColor = (process?: string) => {
    switch (process) {
      case 'cnc': return 'bg-blue-100 text-blue-800'
      case 'sheet_metal': return 'bg-green-100 text-green-800'
      case 'injection_molding': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Parts</h2>
          <div className="flex items-center space-x-2">
            {selectedParts.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGroupAsAssembly(selectedParts)}
              >
                <Squares2X2Icon className="h-4 w-4 mr-1" />
                Group
              </Button>
            )}
            <div className="relative">
              <input
                type="file"
                multiple
                accept=".step,.iges,.stl,.dxf,.sldprt,.zip"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="sm">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Part
              </Button>
            </div>
          </div>
        </div>

        {/* File Format Info */}
        <div className="text-xs text-gray-500">
          Supported: STEP, IGES, STL, DXF, SLDPRT, ZIP
        </div>
      </div>

      {/* Parts List */}
      <div className="flex-1 overflow-y-auto">
        {parts.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parts yet</h3>
            <p className="text-gray-500 mb-4">Upload your CAD files to get started</p>
            <div className="relative inline-block">
              <input
                type="file"
                multiple
                accept=".step,.iges,.stl,.dxf,.sldprt,.zip"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {parts.map((part) => (
              <Card
                key={part.id}
                className={`cursor-pointer transition-all ${
                  selectedPart?.id === part.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => onSelectPart(part)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        {part.thumbnail ? (
                          <img
                            src={part.thumbnail}
                            alt={part.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <DocumentIcon className="h-6 w-6 text-gray-400" />
                        )}
                      </div>

                      {/* Part Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {part.name}
                          </h4>
                          <input
                            type="checkbox"
                            checked={selectedParts.includes(part.id)}
                            onChange={(e) => {
                              e.stopPropagation()
                              togglePartSelection(part.id)
                            }}
                            className="rounded"
                          />
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          <Badge className={getProcessColor(part.process)}>
                            {part.process?.replace('_', ' ').toUpperCase() || 'DETECTING'}
                          </Badge>
                          <Badge className={getStatusColor(part.status)}>
                            {part.status.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Analysis Info */}
                        {part.analysis && (
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Volume: {part.analysis.volume.toFixed(2)} cm³</div>
                            <div>Dimensions: {part.analysis.boundingBox.x.toFixed(1)} × {part.analysis.boundingBox.y.toFixed(1)} × {part.analysis.boundingBox.z.toFixed(1)} mm</div>
                          </div>
                        )}

                        {/* Error Message */}
                        {part.error && (
                          <div className="text-xs text-red-600 mt-1">
                            {part.error}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDuplicatePart(part.id)
                        }}
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemovePart(part.id)
                        }}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {parts.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {parts.length} part{parts.length !== 1 ? 's' : ''} • {parts.filter(p => p.status === 'ready').length} ready
          </div>
        </div>
      )}
    </div>
  )
}
