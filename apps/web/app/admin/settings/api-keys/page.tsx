'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Eye, Trash2 } from 'lucide-react';

export default function AdminAPIKeysPage() {
  const apiKeys = [
    { name: 'Production API Key', key: 'sk_prod_...abc123', created: '2024-01-15', lastUsed: '2024-10-27', status: 'active' },
    { name: 'Development API Key', key: 'sk_dev_...def456', created: '2024-02-20', lastUsed: '2024-10-26', status: 'active' },
    { name: 'Test API Key', key: 'sk_test_...ghi789', created: '2024-03-10', lastUsed: '2024-09-15', status: 'inactive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage API keys for integrations</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New API Key
        </Button>
      </div>

      <div className="space-y-4">
        {apiKeys.map((apiKey, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{apiKey.name}</h3>
                    <Badge className={apiKey.status === 'active' ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                      {apiKey.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-mono text-gray-600 dark:text-gray-400 mb-4">{apiKey.key}</p>
                  <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Created:</span> {apiKey.created}
                    </div>
                    <div>
                      <span className="font-medium">Last Used:</span> {apiKey.lastUsed}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
