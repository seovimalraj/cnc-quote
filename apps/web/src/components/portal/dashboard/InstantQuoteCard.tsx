'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { posthog } from 'posthog-js'

interface FileUpload {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  fileId?: string
}

const ACCEPTED_FILE_TYPES = [
  'step', 'stp', 'iges', 'igs', 'sldprt', 'stl', 'x_t', 'x_b',
  '3dxml', 'catpart', 'prt', 'sat', '3mf', 'jt', 'dxf', 'zip'
]

const MAX_FILE_SIZE_MB = 200

export function InstantQuoteCard() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const validateFile = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !ACCEPTED_FILE_TYPES.includes(extension)) {
      return 'UNSUPPORTED_TYPE'
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return 'FILE_TOO_LARGE'
    }

    return null
  }

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'UNSUPPORTED_TYPE':
        return 'This file type is not supported. Try STEP/IGES/Parasolid.'
      case 'FILE_TOO_LARGE':
        return `File exceeds ${MAX_FILE_SIZE_MB}MB limit.`
      case 'UPLOAD_FAILED':
        return 'Upload failed. Check your connection and try again.'
      default:
        return 'An unexpected error occurred.'
    }
  }

  const uploadFile = async (file: File, uploadId: string) => {
    const error = validateFile(file)
    if (error) {
      setUploads(prev => prev.map(u =>
        u.id === uploadId
          ? { ...u, status: 'error', error: getErrorMessage(error) }
          : u
      ))
      return
    }

    try {
      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', file)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map(u =>
          u.id === uploadId && u.progress < 90
            ? { ...u, progress: u.progress + 10 }
            : u
        ))
      }, 200)

      // In a real implementation, this would upload to your API
      // const response = await fetch('/api/files/upload', {
      //   method: 'POST',
      //   body: formData
      // })
      // const { file_id } = await response.json()

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      clearInterval(progressInterval)

      const mockFileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      setUploads(prev => prev.map(u =>
        u.id === uploadId
          ? { ...u, progress: 100, status: 'completed', fileId: mockFileId }
          : u
      ))

      posthog.capture('file_uploaded', {
        file_type: file.name.split('.').pop(),
        file_size: file.size,
        upload_id: uploadId
      })

    } catch (error) {
      setUploads(prev => prev.map(u =>
        u.id === uploadId
          ? { ...u, status: 'error', error: getErrorMessage('UPLOAD_FAILED') }
          : u
      ))
    }
  }

  const createQuote = async () => {
    const completedUploads = uploads.filter(u => u.status === 'completed')
    if (completedUploads.length === 0) return

    setIsCreatingQuote(true)

    try {
      // In a real implementation, this would create a quote
      // const response = await fetch('/api/quotes', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     source: 'web',
      //     files: completedUploads.map(u => u.fileId)
      //   })
      // })
      // const { quote_id } = await response.json()

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const mockQuoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setQuoteId(mockQuoteId)

      posthog.capture('quote_created_from_dashboard', {
        quote_id: mockQuoteId,
        file_count: completedUploads.length,
        source: 'instant_quote_card'
      })

      // Navigate to quote page
      router.push(`/portal/quotes/${mockQuoteId}`)

    } catch (error) {
      console.error('Error creating quote:', error)
    } finally {
      setIsCreatingQuote(false)
    }
  }

  const handleFiles = useCallback((files: FileList) => {
    const newUploads: FileUpload[] = Array.from(files).map(file => ({
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: 'uploading' as const
    }))

    setUploads(prev => [...prev, ...newUploads])

    // Start uploading files
    newUploads.forEach(upload => {
      uploadFile(upload.file, upload.id)
    })

    posthog.capture('drag_drop_started', {
      file_count: files.length
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles])

  const removeUpload = (uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId))
  }

  const completedUploads = uploads.filter(u => u.status === 'completed')
  const hasErrors = uploads.some(u => u.status === 'error')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CloudArrowUpIcon className="w-6 h-6 mr-2" />
          Instant Quote
        </CardTitle>
        <p className="text-sm text-gray-600">
          Drag and Drop or Choose File
        </p>
        <p className="text-xs text-gray-500 mt-1">
          STEP | STP | IGES | IGS | SLDPRT | STL | X_T | X_B | 3DXML | CATPART | PRT | SAT | 3MF | JT | DXF | ZIP
        </p>
      </CardHeader>
      <CardContent>
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Drag & drop your files here
          </h3>
          <p className="text-gray-600 mb-4">
            Or click to browse files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES.map(ext => `.${ext}`).join(',')}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </Button>
        </div>

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Uploads</h4>
            {uploads.map((upload) => (
              <div key={upload.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {upload.status === 'completed' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                  {upload.status === 'error' && <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />}
                  {upload.status === 'uploading' && <DocumentIcon className="w-5 h-5 text-blue-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {upload.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(upload.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="mt-1" />
                  )}
                  {upload.error && (
                    <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                  )}
                </div>

                <button
                  onClick={() => removeUpload(upload.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex space-x-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/portal/uploads')}
          >
            Recent Uploads
          </Button>

          <Button
            onClick={createQuote}
            disabled={completedUploads.length === 0 || isCreatingQuote}
            className="flex-1"
          >
            {isCreatingQuote ? 'Creating Quote...' : 'Start Instant Quote'}
          </Button>
        </div>

        {/* Legal Notice */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Instant Quoting Engine uses automated CAD analysis. Patents pending.
        </p>

        {/* Error Alert */}
        {hasErrors && (
          <Alert className="mt-4">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <AlertDescription>
              Some files failed to upload. Please check the errors above and try again.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
