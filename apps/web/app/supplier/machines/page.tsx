'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Plus, Search, Settings, Trash2, Edit, AlertCircle, CheckCircle, Activity
} from 'lucide-react';
import { 
  getMachinesBySupplier, createMachine, updateMachine, deleteMachine,
  Machine
} from '@/lib/mockDataStore';

const CURRENT_SUPPLIER_ID = 'SUP-001'; // Mock current supplier

export default function SupplierMachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [newMachine, setNewMachine] = useState({
    name: '',
    type: 'cnc_mill' as Machine['type'],
    manufacturer: '',
    model: '',
    year: new Date().getFullYear(),
    status: 'operational' as Machine['status'],
    capacity_hours_per_week: 120,
    current_utilization: 0,
    work_envelope: '',
    max_spindle_speed: '',
    tool_capacity: 0,
    accuracy: ''
  });

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = () => {
    const supplierMachines = getMachinesBySupplier(CURRENT_SUPPLIER_ID);
    setMachines(supplierMachines);
  };

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         machine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         machine.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || machine.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateMachine = () => {
    const machine = createMachine({
      ...newMachine,
      supplier_id: CURRENT_SUPPLIER_ID
    });

    setMachines([...machines, machine]);
    setShowCreateDialog(false);
    resetNewMachine();
  };

  const handleUpdateMachine = () => {
    if (!editingMachine) return;

    const updated = updateMachine(editingMachine.id, editingMachine);
    if (updated) {
      setMachines(machines.map(m => m.id === updated.id ? updated : m));
    }

    setShowEditDialog(false);
    setEditingMachine(null);
  };

  const handleDeleteMachine = (machineId: string) => {
    if (confirm('Are you sure you want to delete this machine?')) {
      deleteMachine(machineId);
      loadMachines();
    }
  };

  const resetNewMachine = () => {
    setNewMachine({
      name: '',
      type: 'cnc_mill',
      manufacturer: '',
      model: '',
      year: new Date().getFullYear(),
      status: 'operational',
      capacity_hours_per_week: 120,
      current_utilization: 0,
      work_envelope: '',
      max_spindle_speed: '',
      tool_capacity: 0,
      accuracy: ''
    });
  };

  const getStatusIcon = (status: Machine['status']) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'maintenance': return <Settings className="w-5 h-5 text-yellow-500" />;
      case 'down': return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: Machine['status']) => {
    const variants: Record<Machine['status'], string> = {
      operational: 'bg-green-500/10 text-green-600 border-green-500/20',
      maintenance: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      down: 'bg-red-500/10 text-red-600 border-red-500/20'
    };

    return (
      <Badge className={`${variants[status]} border text-xs`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-500';
    if (utilization >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const machineTypes: { value: Machine['type']; label: string }[] = [
    { value: 'cnc_mill', label: 'CNC Mill' },
    { value: 'cnc_lathe', label: 'CNC Lathe' },
    { value: 'swiss_lathe', label: 'Swiss Lathe' },
    { value: '5_axis_mill', label: '5-Axis Mill' },
    { value: 'edm', label: 'EDM' },
    { value: 'grinding', label: 'Grinding' },
    { value: 'laser_cutting', label: 'Laser Cutting' },
    { value: 'waterjet', label: 'Waterjet' },
    { value: '3d_printer', label: '3D Printer' }
  ];

  const stats = {
    total: machines.length,
    operational: machines.filter(m => m.status === 'operational').length,
    maintenance: machines.filter(m => m.status === 'maintenance').length,
    avgUtilization: machines.length > 0 
      ? Math.round(machines.reduce((sum, m) => sum + m.current_utilization, 0) / machines.length)
      : 0
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Machines & Equipment</h1>
          <p className="text-gray-400 mt-1">Manage your manufacturing equipment and capacity</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Machine
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Machines</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Settings className="w-10 h-10 text-blue-500" />
          </div>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Operational</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.operational}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Maintenance</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.maintenance}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-yellow-500" />
          </div>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg Utilization</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.avgUtilization}%</p>
            </div>
            <Activity className="w-10 h-10 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-white border-gray-200 shadow-sm p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search machines by name, manufacturer, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
          >
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="down">Down</option>
          </select>
        </div>
      </Card>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMachines.map((machine) => (
          <Card key={machine.id} className="bg-white border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                {getStatusIcon(machine.status)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{machine.name}</h3>
                  <p className="text-sm text-gray-600">{machine.manufacturer} {machine.model}</p>
                  <p className="text-xs text-gray-500">Year: {machine.year}</p>
                </div>
              </div>
              {getStatusBadge(machine.status)}
            </div>

            {/* Machine Type */}
            <div className="mb-4">
              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 border text-xs">
                {machineTypes.find(t => t.value === machine.type)?.label}
              </Badge>
            </div>

            {/* Specifications */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-600">Work Envelope</p>
                <p className="text-sm font-medium text-gray-900">{machine.work_envelope}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Max Spindle Speed</p>
                <p className="text-sm font-medium text-gray-900">{machine.max_spindle_speed}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Tool Capacity</p>
                <p className="text-sm font-medium text-gray-900">{machine.tool_capacity} tools</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Accuracy</p>
                <p className="text-sm font-medium text-gray-900">{machine.accuracy}</p>
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Capacity: {machine.capacity_hours_per_week}h/week</span>
                <span className={`text-xs font-medium ${getUtilizationColor(machine.current_utilization)}`}>
                  {machine.current_utilization}% utilized
                </span>
              </div>
              <div className="bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    machine.current_utilization >= 90
                      ? 'bg-red-500'
                      : machine.current_utilization >= 75
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${machine.current_utilization}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-gray-300"
                onClick={() => {
                  setEditingMachine(machine);
                  setShowEditDialog(true);
                }}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => handleDeleteMachine(machine.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredMachines.length === 0 && (
        <Card className="bg-white border-gray-200 shadow-sm p-12 text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No machines found</h3>
          <p className="text-gray-600 mb-4">Add machines to showcase your manufacturing capabilities</p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Machine
          </Button>
        </Card>
      )}

      {/* Create Machine Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Add New Machine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-900">Machine Name *</Label>
              <Input
                value={newMachine.name}
                onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 mt-1"
                placeholder="e.g., Haas VF-4"
              />
            </div>
            <div>
              <Label className="text-gray-900">Machine Type *</Label>
              <select
                value={newMachine.type}
                onChange={(e) => setNewMachine({ ...newMachine, type: e.target.value as Machine['type'] })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
              >
                {machineTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">Manufacturer *</Label>
                <Input
                  value={newMachine.manufacturer}
                  onChange={(e) => setNewMachine({ ...newMachine, manufacturer: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  placeholder="e.g., Haas"
                />
              </div>
              <div>
                <Label className="text-gray-900">Model *</Label>
                <Input
                  value={newMachine.model}
                  onChange={(e) => setNewMachine({ ...newMachine, model: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  placeholder="e.g., VF-4"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">Year</Label>
                <Input
                  type="number"
                  value={newMachine.year}
                  onChange={(e) => setNewMachine({ ...newMachine, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-900">Status</Label>
                <select
                  value={newMachine.status}
                  onChange={(e) => setNewMachine({ ...newMachine, status: e.target.value as Machine['status'] })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                >
                  <option value="operational">Operational</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="down">Down</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">Capacity (hours/week)</Label>
                <Input
                  type="number"
                  value={newMachine.capacity_hours_per_week}
                  onChange={(e) => setNewMachine({ ...newMachine, capacity_hours_per_week: parseInt(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-900">Current Utilization (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newMachine.current_utilization}
                  onChange={(e) => setNewMachine({ ...newMachine, current_utilization: parseInt(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-900">Work Envelope</Label>
              <Input
                value={newMachine.work_envelope}
                onChange={(e) => setNewMachine({ ...newMachine, work_envelope: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 mt-1"
                placeholder='e.g., 50" x 20" x 25"'
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">Max Spindle Speed</Label>
                <Input
                  value={newMachine.max_spindle_speed}
                  onChange={(e) => setNewMachine({ ...newMachine, max_spindle_speed: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                  placeholder="e.g., 8100 RPM"
                />
              </div>
              <div>
                <Label className="text-gray-900">Tool Capacity</Label>
                <Input
                  type="number"
                  value={newMachine.tool_capacity}
                  onChange={(e) => setNewMachine({ ...newMachine, tool_capacity: parseInt(e.target.value) || 0 })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-900">Accuracy</Label>
              <Input
                value={newMachine.accuracy}
                onChange={(e) => setNewMachine({ ...newMachine, accuracy: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 mt-1"
                placeholder="e.g., ±0.0005"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateMachine} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!newMachine.name || !newMachine.manufacturer || !newMachine.model}
            >
              Add Machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Machine Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Edit Machine</DialogTitle>
          </DialogHeader>
          {editingMachine && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-900">Machine Name *</Label>
                <Input
                  value={editingMachine.name}
                  onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-900">Machine Type *</Label>
                <select
                  value={editingMachine.type}
                  onChange={(e) => setEditingMachine({ ...editingMachine, type: e.target.value as Machine['type'] })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                >
                  {machineTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">Manufacturer *</Label>
                  <Input
                    value={editingMachine.manufacturer}
                    onChange={(e) => setEditingMachine({ ...editingMachine, manufacturer: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">Model *</Label>
                  <Input
                    value={editingMachine.model}
                    onChange={(e) => setEditingMachine({ ...editingMachine, model: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">Year</Label>
                  <Input
                    type="number"
                    value={editingMachine.year}
                    onChange={(e) => setEditingMachine({ ...editingMachine, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">Status</Label>
                  <select
                    value={editingMachine.status}
                    onChange={(e) => setEditingMachine({ ...editingMachine, status: e.target.value as Machine['status'] })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                  >
                    <option value="operational">Operational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="down">Down</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-900">Capacity (hours/week)</Label>
                  <Input
                    type="number"
                    value={editingMachine.capacity_hours_per_week}
                    onChange={(e) => setEditingMachine({ ...editingMachine, capacity_hours_per_week: parseInt(e.target.value) || 0 })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-900">Current Utilization (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editingMachine.current_utilization}
                    onChange={(e) => setEditingMachine({ ...editingMachine, current_utilization: parseInt(e.target.value) || 0 })}
                    className="bg-white border-gray-300 text-gray-900 mt-1"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMachine} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
