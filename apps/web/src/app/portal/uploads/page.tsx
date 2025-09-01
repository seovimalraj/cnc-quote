'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Dropzone } from '@/components/upload/Dropzone';
import { ModelViewer } from '@/components/viewer/ModelViewer';
import { MetricsPanel } from '@/components/viewer/MetricsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { FileMetrics } from '@/types/file-metrics';

const supabase = createClient();

export default function UploadsPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    name: string;
    status: string;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<FileMetrics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    // Get current organization
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from('org_members')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setOrganizationId(data.organization_id);
            }
          });
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedFile) return;

    // Start analysis if file is clean
    if (selectedFile.status === 'clean') {
      setIsAnalyzing(true);
      fetch('/api/cad/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: selectedFile.id }),
      })
        .then((res) => res.json())
        .then((data) => {
          // Poll for analysis completion
          const interval = setInterval(async () => {
            const res = await fetch(`/api/cad/analysis/${data.taskId}`);
            const result = await res.json();
            
            if (res.status === 200) {
              clearInterval(interval);
              setMetrics(result);
              setIsAnalyzing(false);
              
              // Get preview URL
              fetch(`/api/cad/preview/${selectedFile.id}`)
                .then((res) => res.json())
                .then((data) => {
                  if (data.url) {
                    setPreviewUrl(data.url);
                  }
                });
            }
          }, 2000);
        });
    }
  }, [selectedFile]);

  const handleUploadComplete = (fileId: string) => {
    // Get file details
    supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedFile(data);
        }
      });
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Upload CAD Files</h1>

      {/* Upload Zone */}
      {!selectedFile && organizationId && (
        <Card>
          <CardContent className="pt-6">
            <Dropzone
              organizationId={organizationId}
              onUploadComplete={handleUploadComplete}
            />
          </CardContent>
        </Card>
      )}

      {/* Viewer and Metrics */}
      {selectedFile && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            {previewUrl ? (
              <ModelViewer url={previewUrl} />
            ) : (
              <div className="flex items-center justify-center h-[500px] bg-background border rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="space-y-6">
            {metrics ? (
              <>
                <MetricsPanel metrics={metrics} />
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => router.push('/portal/quote')}
                >
                  Get Quote
                </Button>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      {isAnalyzing ? 'Analyzing part...' : 'Preparing preview...'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload Another */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setMetrics(null);
              }}
            >
              Upload Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}