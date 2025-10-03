"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';

const supabase = createClient();

const ALLOWED_TYPES = {
  'model/step': ['.step', '.stp'],
  'model/stl': ['.stl'],
  'application/dxf': ['.dxf'],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 20;

interface UploadState {
  localId: string;
  serverId?: string;
  name: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

interface FileUploadProps {
  organizationId: string;
  onUploadComplete?: (fileId: string) => void;
}

type ProgressCallback = (progress: number) => void;

type UploadResponse = { file: { id: string } };

type AuthSession = {
  token?: string;
};

function updateUploadState(uploads: UploadState[], localId: string, updates: Partial<UploadState>) {
  return uploads.map(upload => (upload.localId === localId ? { ...upload, ...updates } : upload));
}

async function pollVirusScan(baseUrl: string, fileId: string, auth: AuthSession) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const res = await fetch(`${baseUrl}/api/files/${fileId}/metadata`, {
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : undefined,
      credentials: auth.token ? 'omit' : 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to poll file metadata (${res.status})`);
    }

    const metadata = await res.json();
    const status = metadata?.virus_scan;
    if (status === 'clean') {
      return;
    }

    if (status === 'infected' || status === 'error') {
      const reason = metadata?.error_message || 'File failed virus scan';
      throw new Error(reason);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('Timed out waiting for virus scan to finish');
}

function sendMultipartUpload(baseUrl: string, auth: AuthSession, organizationId: string, file: File, onProgress: ProgressCallback) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const formData = new FormData();
    formData.append('org_id', organizationId);
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${baseUrl}/api/files/direct`, true);
    if (auth.token) {
      xhr.setRequestHeader('Authorization', `Bearer ${auth.token}`);
    }
    xhr.responseType = 'json';

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        const pct = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as UploadResponse);
      } else {
        const message = (xhr.response && (xhr.response.error || xhr.response.message)) || `Upload failed (${xhr.status})`;
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export function Dropzone({ organizationId, onUploadComplete }: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const handleUpload = useCallback(
    async (file: File, localId: string, auth: AuthSession) => {
      setUploads(prev => updateUploadState(prev, localId, { status: 'uploading', progress: 0, error: undefined }));

      try {
        const response = await sendMultipartUpload('', auth, organizationId, file, progress => {
          setUploads(prev => updateUploadState(prev, localId, { progress }));
        });

        const serverId = response.file.id;
        setUploads(prev => updateUploadState(prev, localId, { status: 'processing', serverId, progress: 100 }));

        await pollVirusScan('', serverId, auth);

        setUploads(prev => updateUploadState(prev, localId, { status: 'complete' }));
        onUploadComplete?.(serverId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploads(prev => updateUploadState(prev, localId, { status: 'error', error: message }));
        toast({ title: 'Upload failed', description: message });
      }
    },
    [organizationId, onUploadComplete]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const auth: AuthSession = { token };

      const withStates = acceptedFiles.map(file => ({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        status: 'waiting' as const,
        progress: 0,
      }));

      setUploads(prev => [...prev, ...withStates]);

      withStates.forEach(({ localId }, index) => {
        const file = acceptedFiles[index];
        void handleUpload(file, localId, auth);
      });
    },
    [handleUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_FILE_SIZE,
  });

  const removeUpload = (localId: string) => {
    setUploads(prev => prev.filter(upload => upload.localId !== localId));
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
          Drag & drop CAD files here, or click to select
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supported formats: STEP, STL, DXF (max 100MB)
        </p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map(upload => (
            <div key={upload.localId} className="bg-card p-4 rounded-lg flex items-center gap-4">
              {upload.status === 'error' ? (
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              ) : upload.status === 'complete' ? (
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-t-primary animate-spin flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.name}</p>
                {upload.error ? (
                  <p className="text-xs text-destructive">{upload.error}</p>
                ) : (
                  <Progress value={upload.progress} className="h-1 mt-2" />
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={() => removeUpload(upload.localId)}
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
