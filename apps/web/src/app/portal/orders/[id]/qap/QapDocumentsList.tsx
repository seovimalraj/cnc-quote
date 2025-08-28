'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '../../../../../lib/api';

interface QapDocument {
  id: string;
  created_at: string;
  template: {
    name: string;
  };
}

export function QapDocumentsList() {
  const params = useParams();
  const orderId = params.id as string;
  const { data: documents, error } = useSWR<QapDocument[]>(`/api/orders/${orderId}/qap`, fetcher);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (documentId: string) => {
    try {
      setDownloading(documentId);
      const response = await fetch(`/api/orders/${orderId}/qap/${documentId}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qap-${documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download QAP document:', error);
    } finally {
      setDownloading(null);
    }
  };

  if (error) return <div>Error loading QAP documents</div>;
  if (!documents) return <div>Loading QAP documents...</div>;
  if (!documents.length) return <div>No QAP documents available for this order.</div>;

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div key={doc.id} className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{doc.template.name}</h3>
              <p className="text-sm text-muted-foreground">
                Generated: {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDownload(doc.id)}
              disabled={downloading === doc.id}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              {downloading === doc.id ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
