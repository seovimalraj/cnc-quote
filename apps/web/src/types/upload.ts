export interface FileStatus {
  status: 'pending' | 'scanning' | 'complete' | 'infected' | 'error';
  error_message?: string;
}

export interface FileUpload {
  id?: string;
  name: string;
  file: File;
  status: 'queued' | 'uploading' | 'processing' | 'scanning' | 'complete' | 'error';
  error?: string;
  progress?: number;
}

export interface UploadError extends Error {
  message: string;
}
