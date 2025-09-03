'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';
import type { UploadError } from '@/types/upload';

const supabase = createClient();

const _ALLOWED_TYPES = [
  'model/step',          // STEP files
  'model/x.stl-binary', // Binary STL
  'model/stl',          // ASCII STL
  'application/dxf',    // DXF files
  'application/x-dxf'   // Alternative DXF MIME
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface FileUploadProps {
  organizationId: string;
  onUploadComplete?: (fileId: string) => void;
}

interface UploadState {
  id?: string;
  name: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export function Dropzone({ organizationId, onUploadComplete }: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const _storagePath = `uploads/${organizationId}`;
    for (const file of acceptedFiles) {
      // Initialize upload state
      const upload: UploadState = {
        name: file.name,
        progress: 0,
        status: 'waiting'
      };
      
      setUploads(prev => [...prev, upload]);
      const uploadIndex = uploads.length;

      try {
        // Step 1: Create file record and get upload URL
        const { data: fileData, error: fileError } = await supabase.functions.invoke('initiate-upload', {
          body: {
            fileName: file.name,
            fileSize: file.size,
            organizationId
          }
        });

        if (fileError) throw new Error(fileError.message);

        const { id: fileId, uploadUrl, storagePath: _storagePath } = fileData;

        // Update state with file ID
        setUploads(prev => {
          const newUploads = [...prev];
          newUploads[uploadIndex] = {
            ...newUploads[uploadIndex],
            id: fileId,
            status: 'uploading'
          };
          return newUploads;
        });

        // Step 2: Upload file
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setUploads(prev => {
              const newUploads = [...prev];
              newUploads[uploadIndex] = {
                ...newUploads[uploadIndex],
                progress
              };
              return newUploads;
            });
          }
        };

        // Create promise for XHR completion
        await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(null);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(file);
        });

        // Step 3: Notify backend of upload completion
        const { error: completeError } = await supabase.functions.invoke('complete-upload', {
          body: { fileId }
        });

        if (completeError) throw new Error(completeError.message);

        // Update state to processing
        setUploads(prev => {
          const newUploads = [...prev];
          newUploads[uploadIndex] = {
            ...newUploads[uploadIndex],
            status: 'processing'
          };
          return newUploads;
        });

        // Step 4: Poll for scan completion
        const checkInterval = setInterval(async () => {
          const { data: fileStatus } = await supabase
            .from('files')
            .select('status, error_message')
            .eq('id', fileId)
            .single();

          if (fileStatus) {
            if (fileStatus.status === 'clean') {
              clearInterval(checkInterval);
              setUploads(prev => {
                const newUploads = [...prev];
                newUploads[uploadIndex] = {
                  ...newUploads[uploadIndex],
                  status: 'complete'
                };
                return newUploads;
              });
              onUploadComplete?.(fileId);
            } else if (fileStatus.status === 'infected' || fileStatus.status === 'error') {
              clearInterval(checkInterval);
              throw new Error(fileStatus.error_message || 'File scan failed');
            }
          }
        }, 2000);

      } catch (error) {
        const err = error as UploadError;
        setUploads(prev => {
          const newUploads = [...prev];
          newUploads[uploadIndex] = {
            ...newUploads[uploadIndex],
            status: 'error',
            error: err.message
          };
          return newUploads;
        });

        toast({
          title: 'Upload failed',
          description: err.message
        });
      }
    }
  }, [organizationId, onUploadComplete, uploads.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'model/step': ['.step', '.stp'],
      'model/stl': ['.stl'],
      'application/dxf': ['.dxf']
    } as Record<string, string[]>,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    onDragEnter: () => {},
    onDragOver: () => {},
    onDragLeave: () => {}
  });

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Drag &amp; drop CAD files here, or click to select
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supported formats: STEP, STL, DXF (max 100MB)
        </p>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={index}
              className="bg-card p-4 rounded-lg flex items-center gap-4"
            >
              {/* Status Icon */}
              {upload.status === 'error' ? (
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              ) : upload.status === 'complete' ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-t-primary animate-spin flex-shrink-0" />
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.name}</p>
                {upload.error ? (
                  <p className="text-xs text-destructive">{upload.error}</p>
                ) : (
                  <Progress value={upload.progress} className="h-1 mt-2" />
                )}
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => removeUpload(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
