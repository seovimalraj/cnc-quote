'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CubeIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowPathIcon,
  ViewfinderCircleIcon,
  BeakerIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline'
import { Part } from '@/lib/hooks/use-quote-store'

interface ViewerPanelProps {
  selectedPart: Part | null
  onPartSelect: (part: Part | null) => void
  onMeasurement: (measurement: any) => void
}

export const ViewerPanel = ({ selectedPart, onPartSelect, onMeasurement }: ViewerPanelProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [measurementMode, setMeasurementMode] = useState(false)
  const [wireframe, setWireframe] = useState(false)

  // Mock 3D viewer - in real implementation, this would use Three.js or similar
  useEffect(() => {
    if (!canvasRef.current || !selectedPart) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw simple placeholder
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw part name
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(selectedPart.name, canvas.width / 2, canvas.height / 2 - 20)

    // Draw mock 3D cube
    ctx.strokeStyle = wireframe ? '#60a5fa' : '#374151'
    ctx.lineWidth = 2

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const size = 60

    // Draw cube wireframe
    ctx.beginPath()
    ctx.moveTo(centerX - size, centerY - size)
    ctx.lineTo(centerX + size, centerY - size)
    ctx.lineTo(centerX + size, centerY + size)
    ctx.lineTo(centerX - size, centerY + size)
    ctx.closePath()
    ctx.stroke()

    // Draw depth lines
    ctx.beginPath()
    ctx.moveTo(centerX - size, centerY - size)
    ctx.lineTo(centerX - size * 0.7, centerY - size * 1.3)
    ctx.moveTo(centerX + size, centerY - size)
    ctx.lineTo(centerX + size * 0.7, centerY - size * 1.3)
    ctx.moveTo(centerX + size, centerY + size)
    ctx.lineTo(centerX + size * 0.7, centerY + size * 0.7)
    ctx.moveTo(centerX - size, centerY + size)
    ctx.lineTo(centerX - size * 0.7, centerY + size * 0.7)
    ctx.stroke()

    // Draw back face
    ctx.beginPath()
    ctx.moveTo(centerX - size * 0.7, centerY - size * 1.3)
    ctx.lineTo(centerX + size * 0.7, centerY - size * 1.3)
    ctx.lineTo(centerX + size * 0.7, centerY + size * 0.7)
    ctx.lineTo(centerX - size * 0.7, centerY + size * 0.7)
    ctx.closePath()
    ctx.stroke()
  }, [selectedPart, wireframe])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!measurementMode || !selectedPart) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Mock measurement
    const measurement = {
      type: 'point',
      coordinates: { x, y, z: 0 },
      value: `${x.toFixed(1)}, ${y.toFixed(1)} mm`
    }

    onMeasurement(measurement)
  }

  if (!selectedPart) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <CubeIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No part selected</h3>
          <p className="text-gray-400">Select a part from the list to view it</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full bg-gray-900">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setWireframe(!wireframe)}
          className={wireframe ? 'bg-blue-600' : ''}
        >
          <ViewfinderCircleIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setMeasurementMode(!measurementMode)}
          className={measurementMode ? 'bg-blue-600' : ''}
        >
          <BeakerIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-gray-600" />

        <Button variant="secondary" size="sm">
          <MagnifyingGlassPlusIcon className="h-4 w-4" />
        </Button>

        <Button variant="secondary" size="sm">
          <MagnifyingGlassMinusIcon className="h-4 w-4" />
        </Button>

        <Button variant="secondary" size="sm">
          <ArrowPathIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Part Info */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded">
          <div className="text-sm font-medium">{selectedPart.name}</div>
          <div className="text-xs text-gray-300">
            {selectedPart.process?.replace('_', ' ').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Measurement Mode Indicator */}
      {measurementMode && (
        <div className="absolute bottom-4 left-4 z-10">
          <Badge className="bg-blue-600">
            <ScissorsIcon className="h-3 w-3 mr-1" />
            Measurement Mode
          </Badge>
        </div>
      )}

      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <div>Loading 3D model...</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-black bg-opacity-50 text-white px-3 py-2 rounded text-xs">
          <div>Left click + drag: Rotate</div>
          <div>Right click + drag: Pan</div>
          <div>Scroll: Zoom</div>
        </div>
      </div>
    </div>
  )
}
