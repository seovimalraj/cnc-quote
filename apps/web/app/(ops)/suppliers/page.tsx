/**
 * Step 17: Supplier Directory Page
 * Browse, search, and manage suppliers
 */

'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Building2,
  MapPin,
  Star,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  FileText,
} from 'lucide-react';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '@/lib/api/useMarketplace';
import type { SupplierProfile, CreateSupplierDto } from '@cnc-quote/shared';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);
  const [regionFilter, setRegionFilter] = useState<string | undefined>();
  const [processFilter, setProcessFilter] = useState<string | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierProfile | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);

  const { data: suppliers = [], isLoading } = useSuppliers({
    active: activeFilter,
    region: regionFilter,
    process: processFilter,
  });

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier(selectedSupplier?.id || '');
  const deleteMutation = useDeleteSupplier();

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = () => {
    setIsCreateMode(true);
    setSelectedSupplier(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (supplier: SupplierProfile) => {
    setIsCreateMode(false);
    setSelectedSupplier(supplier);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier? This cannot be undone.')) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleSubmit = async (dto: CreateSupplierDto | Partial<SupplierProfile>) => {
    if (isCreateMode) {
      await createMutation.mutateAsync(dto as CreateSupplierDto);
    } else if (selectedSupplier) {
      await updateMutation.mutateAsync(dto);
    }
    setIsDrawerOpen(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your manufacturing partner network
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Add Supplier
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={activeFilter === undefined ? 'all' : activeFilter ? 'active' : 'inactive'}
            onChange={(e) =>
              setActiveFilter(
                e.target.value === 'all'
                  ? undefined
                  : e.target.value === 'active',
              )
            }
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            value={regionFilter || ''}
            onChange={(e) => setRegionFilter(e.target.value || undefined)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Regions</option>
            <option value="us-east">US East</option>
            <option value="us-west">US West</option>
            <option value="eu-central">EU Central</option>
            <option value="asia-pac">Asia Pacific</option>
          </select>

          <select
            value={processFilter || ''}
            onChange={(e) => setProcessFilter(e.target.value || undefined)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Processes</option>
            <option value="cnc_milling">CNC Milling</option>
            <option value="cnc_turning">CNC Turning</option>
            <option value="sheet_metal">Sheet Metal</option>
            <option value="3d_printing">3D Printing</option>
          </select>
        </div>
      </div>

      {/* Supplier List */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-gray-600">Loading suppliers...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">No suppliers found</p>
            <button
              onClick={handleCreate}
              className="mt-4 text-blue-600 hover:underline"
            >
              Add your first supplier
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {isDrawerOpen && (
        <SupplierDrawer
          supplier={selectedSupplier}
          isCreateMode={isCreateMode}
          onClose={() => setIsDrawerOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

// Supplier Card Component
function SupplierCard({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: SupplierProfile;
  onEdit: (s: SupplierProfile) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-gray-400" />
          <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          {supplier.active ? (
            <CheckCircle2 size={16} className="text-green-500" />
          ) : (
            <XCircle size={16} className="text-gray-400" />
          )}
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={14} />
          {supplier.regions.join(', ')}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Star size={14} className="fill-yellow-400 text-yellow-400" />
          {supplier.rating.toFixed(1)} / 5.0
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText size={14} />
          {supplier.capabilities?.length || 0} capabilities
        </div>
      </div>

      {/* Certifications */}
      {supplier.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {supplier.certifications.map((cert) => (
            <span
              key={cert}
              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
            >
              {cert}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <button
          onClick={() => onEdit(supplier)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 transition"
        >
          <Edit size={14} />
          Edit
        </button>
        <button
          onClick={() => onDelete(supplier.id)}
          className="flex items-center justify-center gap-1 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50 transition"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}

// Supplier Drawer Component
function SupplierDrawer({
  supplier,
  isCreateMode,
  onClose,
  onSubmit,
}: {
  supplier: SupplierProfile | null;
  isCreateMode: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateSupplierDto | Partial<SupplierProfile>) => void;
}) {
  const [formData, setFormData] = useState<Partial<CreateSupplierDto>>(() => ({
    name: supplier?.name || '',
    regions: supplier?.regions || [],
    certifications: supplier?.certifications || [],
    rating: supplier?.rating || 0,
    active: supplier?.active ?? true,
    notes: supplier?.notes || '',
    capabilities: supplier?.capabilities || [],
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as CreateSupplierDto);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            {isCreateMode ? 'Add Supplier' : 'Edit Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Regions (comma-separated)
              </label>
              <input
                type="text"
                value={formData.regions?.join(', ')}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    regions: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="us-east, us-west"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating (0-5)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={(e) =>
                  setFormData({ ...formData, rating: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) =>
                  setFormData({ ...formData, active: e.target.checked })
                }
                className="rounded"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isCreateMode ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
