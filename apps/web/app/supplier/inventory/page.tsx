'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, AlertCircle, Plus, Search, Edit, Trash2, TrendingDown, TrendingUp,
  Box, Warehouse, Clock, DollarSign, BarChart3, Download, FileText,
  ShoppingCart, Truck, Calendar, Activity, Filter
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: 'Metal' | 'Plastic' | 'Composite' | 'Tool';
  quantity: number;
  unit: 'kg' | 'lbs' | 'pieces' | 'm' | 'ft';
  reorderPoint: number;
  maxStock: number;
  status: 'ok' | 'low' | 'critical' | 'overstock';
  location: string;
  supplier: string;
  costPerUnit: number;
  lastRestocked: string;
  nextReorderDate: string;
  usageRate: number; // units per week
  leadTimeDays: number;
}

export default function SupplierInventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Metal' as InventoryItem['category'],
    quantity: 0,
    unit: 'kg' as InventoryItem['unit'],
    reorderPoint: 0,
    maxStock: 0,
    location: '',
    supplier: '',
    costPerUnit: 0,
    usageRate: 0,
    leadTimeDays: 7
  });

  const inventory: InventoryItem[] = [
    { 
      id: '1', name: 'Aluminum 6061-T6', category: 'Metal', quantity: 250, unit: 'kg', 
      reorderPoint: 100, maxStock: 500, status: 'ok', location: 'Warehouse A-12', 
      supplier: 'MetalSource Inc.', costPerUnit: 8.50, lastRestocked: '2024-01-15',
      nextReorderDate: '2024-02-20', usageRate: 45, leadTimeDays: 5
    },
    { 
      id: '2', name: 'Stainless Steel 304', category: 'Metal', quantity: 75, unit: 'kg', 
      reorderPoint: 80, maxStock: 400, status: 'low', location: 'Warehouse A-14', 
      supplier: 'SteelWorks Ltd.', costPerUnit: 12.75, lastRestocked: '2024-01-10',
      nextReorderDate: '2024-01-28', usageRate: 38, leadTimeDays: 7
    },
    { 
      id: '3', name: 'Aluminum 7075-T651', category: 'Metal', quantity: 180, unit: 'kg', 
      reorderPoint: 100, maxStock: 450, status: 'ok', location: 'Warehouse A-13', 
      supplier: 'MetalSource Inc.', costPerUnit: 15.20, lastRestocked: '2024-01-18',
      nextReorderDate: '2024-02-25', usageRate: 28, leadTimeDays: 5
    },
    { 
      id: '4', name: 'Titanium Ti-6Al-4V', category: 'Metal', quantity: 25, unit: 'kg', 
      reorderPoint: 50, maxStock: 200, status: 'critical', location: 'Warehouse B-02', 
      supplier: 'TitaniumPro Corp.', costPerUnit: 45.00, lastRestocked: '2023-12-20',
      nextReorderDate: '2024-01-22', usageRate: 12, leadTimeDays: 14
    },
    { 
      id: '5', name: 'Brass C360', category: 'Metal', quantity: 120, unit: 'kg', 
      reorderPoint: 80, maxStock: 350, status: 'ok', location: 'Warehouse A-15', 
      supplier: 'Alloy Suppliers Co.', costPerUnit: 11.30, lastRestocked: '2024-01-12',
      nextReorderDate: '2024-02-18', usageRate: 22, leadTimeDays: 6
    },
    { 
      id: '6', name: 'Copper 110', category: 'Metal', quantity: 95, unit: 'kg', 
      reorderPoint: 70, maxStock: 300, status: 'ok', location: 'Warehouse A-16', 
      supplier: 'Copper Industries', costPerUnit: 9.85, lastRestocked: '2024-01-14',
      nextReorderDate: '2024-02-22', usageRate: 18, leadTimeDays: 5
    },
    { 
      id: '7', name: 'Stainless Steel 316', category: 'Metal', quantity: 55, unit: 'kg', 
      reorderPoint: 60, maxStock: 350, status: 'low', location: 'Warehouse A-17', 
      supplier: 'SteelWorks Ltd.', costPerUnit: 14.20, lastRestocked: '2024-01-08',
      nextReorderDate: '2024-01-30', usageRate: 32, leadTimeDays: 7
    },
    { 
      id: '8', name: 'ABS Plastic', category: 'Plastic', quantity: 340, unit: 'kg', 
      reorderPoint: 150, maxStock: 600, status: 'ok', location: 'Warehouse C-03', 
      supplier: 'PolymerTech Inc.', costPerUnit: 6.40, lastRestocked: '2024-01-19',
      nextReorderDate: '2024-03-05', usageRate: 35, leadTimeDays: 4
    },
    { 
      id: '9', name: 'Nylon 6/6', category: 'Plastic', quantity: 220, unit: 'kg', 
      reorderPoint: 120, maxStock: 500, status: 'ok', location: 'Warehouse C-04', 
      supplier: 'PolymerTech Inc.', costPerUnit: 7.80, lastRestocked: '2024-01-16',
      nextReorderDate: '2024-02-28', usageRate: 28, leadTimeDays: 4
    },
    { 
      id: '10', name: 'Acetal (Delrin)', category: 'Plastic', quantity: 45, unit: 'kg', 
      reorderPoint: 50, maxStock: 250, status: 'critical', location: 'Warehouse C-05', 
      supplier: 'Plastics Plus LLC', costPerUnit: 9.20, lastRestocked: '2023-12-28',
      nextReorderDate: '2024-01-25', usageRate: 15, leadTimeDays: 6
    },
    { 
      id: '11', name: 'Carbon Steel 1018', category: 'Metal', quantity: 310, unit: 'kg', 
      reorderPoint: 150, maxStock: 550, status: 'ok', location: 'Warehouse A-18', 
      supplier: 'SteelWorks Ltd.', costPerUnit: 5.60, lastRestocked: '2024-01-17',
      nextReorderDate: '2024-03-10', usageRate: 42, leadTimeDays: 7
    },
    { 
      id: '12', name: 'Polycarbonate', category: 'Plastic', quantity: 175, unit: 'kg', 
      reorderPoint: 100, maxStock: 400, status: 'ok', location: 'Warehouse C-06', 
      supplier: 'Plastics Plus LLC', costPerUnit: 8.50, lastRestocked: '2024-01-13',
      nextReorderDate: '2024-02-24', usageRate: 25, leadTimeDays: 6
    },
    { 
      id: '13', name: 'Carbide End Mills', category: 'Tool', quantity: 45, unit: 'pieces', 
      reorderPoint: 20, maxStock: 100, status: 'ok', location: 'Tool Room 1', 
      supplier: 'ToolTech Supply', costPerUnit: 48.00, lastRestocked: '2024-01-20',
      nextReorderDate: '2024-02-15', usageRate: 8, leadTimeDays: 3
    },
    { 
      id: '14', name: 'Carbon Fiber Sheet', category: 'Composite', quantity: 28, unit: 'm', 
      reorderPoint: 15, maxStock: 80, status: 'ok', location: 'Warehouse D-01', 
      supplier: 'Composite Materials Co.', costPerUnit: 120.00, lastRestocked: '2024-01-11',
      nextReorderDate: '2024-02-18', usageRate: 5, leadTimeDays: 10
    },
    { 
      id: '15', name: 'PEEK Plastic', category: 'Plastic', quantity: 65, unit: 'kg', 
      reorderPoint: 40, maxStock: 180, status: 'ok', location: 'Warehouse C-07', 
      supplier: 'Advanced Polymers', costPerUnit: 95.00, lastRestocked: '2024-01-09',
      nextReorderDate: '2024-02-12', usageRate: 12, leadTimeDays: 8
    },
  ];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    totalItems: inventory.length,
    totalValue: inventory.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0),
    criticalItems: inventory.filter(i => i.status === 'critical').length,
    lowStockItems: inventory.filter(i => i.status === 'low').length,
    categories: {
      Metal: inventory.filter(i => i.category === 'Metal').length,
      Plastic: inventory.filter(i => i.category === 'Plastic').length,
      Composite: inventory.filter(i => i.category === 'Composite').length,
      Tool: inventory.filter(i => i.category === 'Tool').length,
    },
    needsReorder: inventory.filter(i => i.status === 'critical' || i.status === 'low').length,
    avgUsageRate: inventory.reduce((sum, i) => sum + i.usageRate, 0) / inventory.length,
  };

  const reorderSoon = inventory
    .filter(i => i.status === 'critical' || i.status === 'low')
    .sort((a, b) => new Date(a.nextReorderDate).getTime() - new Date(b.nextReorderDate).getTime());

  const topUsage = [...inventory]
    .sort((a, b) => b.usageRate - a.usageRate)
    .slice(0, 5);

  const handleAddItem = () => {
    console.log('Adding item:', newItem);
    setShowAddDialog(false);
    setNewItem({
      name: '', category: 'Metal', quantity: 0, unit: 'kg', reorderPoint: 0,
      maxStock: 0, location: '', supplier: '', costPerUnit: 0, usageRate: 0, leadTimeDays: 7
    });
  };

  const handleRestock = () => {
    if (selectedItem) {
      console.log('Restocking:', selectedItem.name);
      setShowRestockDialog(false);
      setSelectedItem(null);
    }
  };

  const getStatusBadge = (status: InventoryItem['status']) => {
    const variants = {
      ok: 'bg-green-100 text-green-700 border-green-200',
      low: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      critical: 'bg-red-100 text-red-700 border-red-200',
      overstock: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const icons = {
      ok: Activity,
      low: TrendingDown,
      critical: AlertCircle,
      overstock: TrendingUp,
    };
    const Icon = icons[status];
    return (
      <Badge className={`${variants[status]} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getCategoryIcon = (category: InventoryItem['category']) => {
    const icons = { Metal: Box, Plastic: Package, Composite: FileText, Tool: Activity };
    return icons[category];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track materials, tools, and supplies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow bg-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalItems}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.categories.Metal} metals</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow bg-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Total Value</p>
                <p className="text-3xl font-bold text-gray-900">${(stats.totalValue / 1000).toFixed(1)}K</p>
                <p className="text-xs text-gray-500 mt-1">Current stock</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow bg-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Needs Reorder</p>
                <p className="text-3xl font-bold text-gray-900">{stats.needsReorder}</p>
                <p className="text-xs text-red-500 mt-1">{stats.criticalItems} critical</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow bg-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Avg Usage Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats.avgUsageRate.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">units/week</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="all">All Items ({inventory.length})</TabsTrigger>
          <TabsTrigger value="reorder">Needs Reorder ({reorderSoon.length})</TabsTrigger>
          <TabsTrigger value="usage">Top Usage (5)</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* All Items Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card className="hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search materials, suppliers, or locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Metal">Metal</SelectItem>
                    <SelectItem value="Plastic">Plastic</SelectItem>
                    <SelectItem value="Composite">Composite</SelectItem>
                    <SelectItem value="Tool">Tool</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="overstock">Overstock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventory.map((item) => {
              const Icon = getCategoryIcon(item.category);
              const stockLevel = (item.quantity / item.maxStock) * 100;
              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                          <p className="text-xs text-gray-500">{item.category}</p>
                        </div>
                      </div>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {item.quantity} {item.unit}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                          <span>Reorder: {item.reorderPoint}</span>
                          <span>Max: {item.maxStock}</span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              stockLevel <= 20 ? 'bg-red-500' :
                              stockLevel <= 40 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${stockLevel}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          <Warehouse className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">{item.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Truck className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">{item.supplier}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">${item.costPerUnit}/{item.unit}</span>
                          <span className="text-gray-400">•</span>
                          <span className="font-semibold text-gray-900">${(item.quantity * item.costPerUnit).toFixed(0)} total</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Activity className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">{item.usageRate} {item.unit}/week usage</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">Last: {new Date(item.lastRestocked).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {item.status !== 'ok' && (
                        <div className="pt-2 flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-orange-600">
                            {item.status === 'critical' ? 'Reorder immediately' : 'Low stock alert'}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowRestockDialog(true);
                          }}
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Restock
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Needs Reorder Tab */}
        <TabsContent value="reorder" className="space-y-4">
          <Card className="hover:shadow-md transition-shadow bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Items Requiring Immediate Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reorderSoon.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className={`p-3 rounded-lg ${
                      item.status === 'critical' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <AlertCircle className={`w-6 h-6 ${
                        item.status === 'critical' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.quantity} {item.unit} remaining • {item.usageRate}/week usage</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Reorder by: {new Date(item.nextReorderDate).toLocaleDateString()}
                        {' • '}
                        <Truck className="w-3 h-3 inline mr-1" />
                        {item.leadTimeDays} days lead time
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">${item.costPerUnit}</div>
                      <div className="text-xs text-gray-500">per {item.unit}</div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowRestockDialog(true);
                      }}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Order Now
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card className="hover:shadow-md transition-shadow bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Highest Usage Materials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topUsage.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">{item.category} • {item.location}</div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>{item.quantity} {item.unit} in stock</span>
                        <span>•</span>
                        <span>Reorder at {item.reorderPoint}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{item.usageRate}</div>
                      <div className="text-xs text-gray-500">{item.unit}/week</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card className="hover:shadow-md transition-shadow bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Inventory by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.categories).map(([category, count]) => {
                    const percentage = (count / stats.totalItems) * 100;
                    const totalValue = inventory
                      .filter(i => i.category === category)
                      .reduce((sum, i) => sum + (i.quantity * i.costPerUnit), 0);
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">{category}</span>
                          <span className="text-gray-600">{count} items ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500">Value: ${(totalValue / 1000).toFixed(1)}K</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card className="hover:shadow-md transition-shadow bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Stock Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(['ok', 'low', 'critical'] as const).map(status => {
                    const items = inventory.filter(i => i.status === status);
                    const count = items.length;
                    const value = items.reduce((sum, i) => sum + (i.quantity * i.costPerUnit), 0);
                    return (
                      <div key={status} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(status)}
                          <span className="text-sm text-gray-600">{count} items</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">${(value / 1000).toFixed(1)}K</div>
                          <div className="text-xs text-gray-500">total value</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Material Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add New Material</DialogTitle>
            <DialogDescription>Add a new material to inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-900">Material Name *</Label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 mt-1"
                placeholder="e.g., Aluminum 6061-T6"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">Category</Label>
                <Select value={newItem.category} onValueChange={(value: any) => setNewItem({ ...newItem, category: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Metal">Metal</SelectItem>
                    <SelectItem value="Plastic">Plastic</SelectItem>
                    <SelectItem value="Composite">Composite</SelectItem>
                    <SelectItem value="Tool">Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-900">Unit</Label>
                <Select value={newItem.unit} onValueChange={(value: any) => setNewItem({ ...newItem, unit: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="m">Meters (m)</SelectItem>
                    <SelectItem value="ft">Feet (ft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">Current Quantity</Label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-900">Reorder Point</Label>
                <Input
                  type="number"
                  value={newItem.reorderPoint}
                  onChange={(e) => setNewItem({ ...newItem, reorderPoint: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-900">Max Stock</Label>
                <Input
                  type="number"
                  value={newItem.maxStock}
                  onChange={(e) => setNewItem({ ...newItem, maxStock: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">Location</Label>
                <Input
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  placeholder="e.g., Warehouse A-12"
                />
              </div>
              <div>
                <Label className="text-gray-900">Supplier</Label>
                <Input
                  value={newItem.supplier}
                  onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  placeholder="e.g., MetalSource Inc."
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">Cost per Unit</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.costPerUnit}
                  onChange={(e) => setNewItem({ ...newItem, costPerUnit: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-gray-900">Usage Rate/week</Label>
                <Input
                  type="number"
                  value={newItem.usageRate}
                  onChange={(e) => setNewItem({ ...newItem, usageRate: parseFloat(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-900">Lead Time (days)</Label>
                <Input
                  type="number"
                  value={newItem.leadTimeDays}
                  onChange={(e) => setNewItem({ ...newItem, leadTimeDays: parseInt(e.target.value) || 7 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Restock Material</DialogTitle>
            <DialogDescription>Place a restock order for {selectedItem?.name}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-semibold text-gray-900">{selectedItem.quantity} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reorder Point:</span>
                  <span className="font-semibold text-gray-900">{selectedItem.reorderPoint} {selectedItem.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Suggested Order:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedItem.maxStock - selectedItem.quantity} {selectedItem.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Est. Cost:</span>
                  <span className="font-semibold text-green-600">
                    ${((selectedItem.maxStock - selectedItem.quantity) * selectedItem.costPerUnit).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lead Time:</span>
                  <span className="font-semibold text-gray-900">{selectedItem.leadTimeDays} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Supplier:</span>
                  <span className="font-semibold text-gray-900">{selectedItem.supplier}</span>
                </div>
              </div>
              <div>
                <Label className="text-gray-900">Order Quantity</Label>
                <Input
                  type="number"
                  defaultValue={selectedItem.maxStock - selectedItem.quantity}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestock} className="bg-blue-600 hover:bg-blue-700">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
