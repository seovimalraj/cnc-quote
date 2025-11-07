'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Zap,
  BarChart3
} from 'lucide-react';

export default function AdminCapacityPage() {
  const capacityOverview = [
    {
      title: 'Overall Utilization',
      value: '78%',
      status: 'good',
      icon: Activity,
      color: 'text-green-500'
    },
    {
      title: 'Available Capacity',
      value: '22%',
      status: 'good',
      icon: Zap,
      color: 'text-blue-500'
    },
    {
      title: 'Peak Hours Load',
      value: '92%',
      status: 'warning',
      icon: TrendingUp,
      color: 'text-yellow-500'
    },
    {
      title: 'Avg Lead Time',
      value: '5.2 days',
      status: 'good',
      icon: Clock,
      color: 'text-purple-500'
    }
  ];

  const supplierCapacity = [
    {
      supplier: 'Precision Parts Co',
      currentLoad: 85,
      availableHours: 120,
      scheduledJobs: 18,
      status: 'high',
      performance: 94
    },
    {
      supplier: 'Advanced CNC Solutions',
      currentLoad: 72,
      availableHours: 280,
      scheduledJobs: 12,
      status: 'optimal',
      performance: 97
    },
    {
      supplier: 'MetalWorks Pro',
      currentLoad: 90,
      availableHours: 80,
      scheduledJobs: 24,
      status: 'critical',
      performance: 89
    },
    {
      supplier: 'Titanium Works',
      currentLoad: 65,
      availableHours: 350,
      scheduledJobs: 8,
      status: 'low',
      performance: 95
    },
    {
      supplier: 'Sterile Manufacturing',
      currentLoad: 78,
      availableHours: 220,
      scheduledJobs: 15,
      status: 'optimal',
      performance: 96
    },
    {
      supplier: 'Rapid Prototyping Inc',
      currentLoad: 95,
      availableHours: 40,
      scheduledJobs: 28,
      status: 'critical',
      performance: 87
    }
  ];

  const weeklySchedule = [
    { day: 'Mon', load: 82, jobs: 45 },
    { day: 'Tue', load: 88, jobs: 52 },
    { day: 'Wed', load: 85, jobs: 48 },
    { day: 'Thu', load: 79, jobs: 42 },
    { day: 'Fri', load: 92, jobs: 58 },
    { day: 'Sat', load: 65, jobs: 35 },
    { day: 'Sun', load: 45, jobs: 22 }
  ];

  const upcomingBottlenecks = [
    {
      date: 'Jan 25-27',
      issue: 'High demand period - 95% capacity',
      severity: 'high',
      affectedSuppliers: 4
    },
    {
      date: 'Feb 1-3',
      issue: 'MetalWorks Pro maintenance shutdown',
      severity: 'medium',
      affectedSuppliers: 1
    },
    {
      date: 'Feb 10-12',
      issue: 'Large aerospace order - titanium shortage',
      severity: 'high',
      affectedSuppliers: 2
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      critical: { bg: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle },
      high: { bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: TrendingUp },
      optimal: { bg: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
      low: { bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Activity },
      medium: { bg: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock }
    };
    
    const variant = variants[status as keyof typeof variants];
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.bg} border flex items-center gap-1 px-2 py-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getLoadColor = (load: number) => {
    if (load >= 90) return 'bg-red-500';
    if (load >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const maxLoad = Math.max(...weeklySchedule.map(d => d.load));

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Capacity Planning</h1>
          <p className="text-gray-400 mt-1">Monitor and optimize production capacity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700">
            <Calendar className="w-4 h-4 mr-2" />
            View Calendar
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {capacityOverview.map((item, idx) => (
          <Card key={idx} className="bg-slate-800/50 border-slate-700 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-gray-400 text-sm">{item.title}</p>
                <p className="text-3xl font-bold text-white mt-2">{item.value}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/50">
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly Schedule Chart */}
      <Card className="bg-slate-800/50 border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Weekly Capacity Utilization</h3>
            <p className="text-sm text-gray-400 mt-1">Current week load distribution</p>
          </div>
          <Activity className="w-5 h-5 text-blue-500" />
        </div>
        <div className="grid grid-cols-7 gap-4">
          {weeklySchedule.map((day, idx) => {
            const height = (day.load / maxLoad) * 100;
            return (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-full bg-slate-900/50 rounded-lg h-48 relative flex items-end p-2">
                  <div
                    className={`w-full rounded transition-all ${getLoadColor(day.load)}`}
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute inset-x-0 top-2 text-center">
                    <div className="text-lg font-bold text-white">{day.load}%</div>
                    <div className="text-xs text-gray-400">{day.jobs} jobs</div>
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-gray-300">{day.day}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Supplier Capacity Table */}
      <Card className="bg-slate-800/50 border-slate-700 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white">Supplier Capacity Status</h3>
          <p className="text-sm text-gray-400 mt-1">Real-time capacity monitoring by supplier</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-4 text-gray-400 font-medium">Supplier</th>
                <th className="text-left p-4 text-gray-400 font-medium">Current Load</th>
                <th className="text-left p-4 text-gray-400 font-medium">Available Hours</th>
                <th className="text-left p-4 text-gray-400 font-medium">Scheduled Jobs</th>
                <th className="text-left p-4 text-gray-400 font-medium">Performance</th>
                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplierCapacity.map((supplier, idx) => (
                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-white">{supplier.supplier}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-900/50 rounded-full h-2 max-w-[120px]">
                        <div
                          className={`h-2 rounded-full transition-all ${getLoadColor(supplier.currentLoad)}`}
                          style={{ width: `${supplier.currentLoad}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white min-w-[45px]">
                        {supplier.currentLoad}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-white font-medium">{supplier.availableHours}h</div>
                    <div className="text-xs text-gray-400">next 2 weeks</div>
                  </td>
                  <td className="p-4">
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 border">
                      {supplier.scheduledJobs} jobs
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="text-white font-medium">{supplier.performance}%</div>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  </td>
                  <td className="p-4">{getStatusBadge(supplier.status)}</td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" className="border-slate-700">
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upcoming Bottlenecks */}
      <Card className="bg-slate-800/50 border-slate-700 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white">Upcoming Bottlenecks & Alerts</h3>
          <p className="text-sm text-gray-400 mt-1">Potential capacity issues requiring attention</p>
        </div>
        <div className="space-y-4">
          {upcomingBottlenecks.map((bottleneck, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700"
            >
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge className="bg-slate-700 text-white border-slate-600">
                    {bottleneck.date}
                  </Badge>
                  {getStatusBadge(bottleneck.severity)}
                </div>
                <p className="text-white font-medium mb-1">{bottleneck.issue}</p>
                <p className="text-sm text-gray-400">
                  Affects {bottleneck.affectedSuppliers} supplier{bottleneck.affectedSuppliers > 1 ? 's' : ''}
                </p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Resolve
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
