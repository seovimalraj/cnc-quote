'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { QapDocument } from '@/types/qap-document';

function QapDocumentsList() {
  const params = useParams();
  const [documents, setDocuments] = useState<QapDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    if (!params?.id) return;
    
    try {
      setIsLoading(true);
      const response = await api.get(`/qap/documents/order/${params.id}`);
      setDocuments(response.data);
    } catch (error) {
      toast.error('Failed to load QAP documents');
      console.error('Error loading QAP documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!documents.length) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">No QAP documents found for this order.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{doc.template.name}</h3>
              <p className="text-sm text-gray-500">
                Process: {doc.template.process_type}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge
                variant={
                  doc.status === 'completed'
                    ? 'secondary'
                    : doc.status === 'failed'
                    ? 'destructive'
                    : 'default'
                }
              >
                {doc.status}
              </Badge>
              {doc.download_url && (
                <a
                  href={doc.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download PDF
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function QapDocumentsPage() {
  return <QapDocumentsList />;
}
