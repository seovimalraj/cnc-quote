'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function QapTemplatesList() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  useEffect(() => {
    const orgId = localStorage.getItem('currentOrgId');
    if (orgId) {
      setCurrentOrgId(orgId);
      loadTemplates(orgId);
    }
  }, []);

  const loadTemplates = async (orgId: string) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/qap/templates/org/${orgId}`);
      setTemplates(response.data);
    } catch (error) {
      toast.error('Failed to load templates');
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewTemplate = () => {
    router.push('/admin/qap-templates/new');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">QAP Templates</h1>
        <Button onClick={handleNewTemplate}>New Template</Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template: any) => (
          <Card key={template.id} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{template.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {template.description || 'No description'}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <Badge>{template.process_type}</Badge>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/qap-templates/${template.id}`)}
                >
                  Edit Template
                </Button>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>Created: {new Date(template.created_at).toLocaleDateString()}</p>
              <p>
                Last Updated: {new Date(template.updated_at).toLocaleDateString()}
              </p>
            </div>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No templates found.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleNewTemplate}
            >
              Create your first template
            </Button>
          </div>
        )}
      </div>
    </div>
  );
