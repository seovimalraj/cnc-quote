import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Download, RefreshCw, User, Clock, AlertTriangle, FileText } from 'lucide-react';

interface ReviewTicket {
  id: string;
  quote_id: string;
  org_name: string;
  stage: string;
  assignee_user_id: string | null;
  priority: 'low' | 'normal' | 'high';
  sla_due_at: string;
  value_estimate: number;
  blockers_count: number;
  files_count: number;
  created_at: string;
  updated_at: string;
  first_price_ms: number;
  cad_status: string;
  top_dfm_issues: string[];
}

interface ReviewQueueData {
  needs_review: ReviewTicket[];
  priced: ReviewTicket[];
  sent: ReviewTicket[];
}

export default function ManualReviewQueue() {
  const [queueData, setQueueData] = useState<ReviewQueueData | null>(null);
  const [counts, setCounts] = useState({ needs_review: 0, priced: 0, sent: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    org: '',
    assignee: '',
    priority: '',
    blockers: false,
    age: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadQueueData();
    loadCounts();
  }, [filters]);

  const loadQueueData = async () => {
    try {
      const response = await fetch('/api/admin/review');
      const data = await response.json();
      setQueueData(data);
    } catch (error) {
      console.error('Failed to load queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const response = await fetch('/api/admin/review/counts');
      const data = await response.json();
      setCounts(data);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

  const handleAssign = async (ticketId: string, userId: string) => {
    try {
      await fetch(`/api/admin/review/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      loadQueueData();
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  const handleMove = async (ticketId: string, lane: string) => {
    try {
      await fetch(`/api/admin/review/${ticketId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lane })
      });
      loadQueueData();
      loadCounts();
    } catch (error) {
      console.error('Failed to move ticket:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'normal': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSlaStatus = (slaDueAt: string) => {
    const due = new Date(slaDueAt);
    const now = new Date();
    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDue < 0) return { color: 'bg-red-100 text-red-800', text: 'Overdue' };
    if (hoursUntilDue < 24) return { color: 'bg-orange-100 text-orange-800', text: 'Due Soon' };
    return { color: 'bg-green-100 text-green-800', text: 'On Track' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const TicketCard = ({ ticket }: { ticket: ReviewTicket }) => {
    const slaStatus = getSlaStatus(ticket.sla_due_at);

    return (
      <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-sm">{ticket.quote_id}</h3>
              <p className="text-xs text-gray-600">{ticket.org_name}</p>
            </div>
            <Badge className={getPriorityColor(ticket.priority)}>
              {ticket.priority}
            </Badge>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">{formatCurrency(ticket.value_estimate)}</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{formatRelativeTime(ticket.updated_at)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            {ticket.blockers_count > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {ticket.blockers_count} blockers
              </Badge>
            )}
            <Badge className={slaStatus.color}>
              {slaStatus.text}
            </Badge>
          </div>

          <div className="text-xs text-gray-600 mb-2">
            {ticket.files_count} files • {ticket.first_price_ms}ms • {ticket.cad_status}
          </div>

          {ticket.top_dfm_issues.length > 0 && (
            <div className="text-xs text-gray-600 mb-2">
              {ticket.top_dfm_issues.slice(0, 2).join(' • ')}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              Open
            </Button>
            <Select onValueChange={(userId) => handleAssign(ticket.id, userId)}>
              <SelectTrigger className="w-20">
                <User className="h-3 w-3" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user_jane">Jane</SelectItem>
                <SelectItem value="user_john">John</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  };

  const Lane = ({ title, tickets, laneId }: { title: string; tickets: ReviewTicket[]; laneId: string }) => (
    <div className="flex-1 min-w-80">
      <div className="bg-gray-50 p-3 rounded-t-lg border">
        <h2 className="font-semibold text-sm">{title} ({tickets.length})</h2>
      </div>
      <div className="bg-gray-50 p-3 rounded-b-lg min-h-96 border-l border-r border-b">
        {tickets.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items in {title.toLowerCase()}</p>
          </div>
        ) : (
          tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manual Review</h1>
          <p className="text-gray-600">Review and approve quotes requiring manual intervention</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showFilters} onOpenChange={setShowFilters}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Filter Review Queue</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right">Organization</label>
                  <Select value={filters.org || undefined} onValueChange={(value) => setFilters({...filters, org: value || ''})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="All organizations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="org_acme">Acme Corp</SelectItem>
                      <SelectItem value="org_techstart">TechStart Inc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right">Assignee</label>
                  <Select value={filters.assignee || undefined} onValueChange={(value) => setFilters({...filters, assignee: value || ''})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="All assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user_jane">Jane</SelectItem>
                      <SelectItem value="user_john">John</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right">Priority</label>
                  <Select value={filters.priority || undefined} onValueChange={(value) => setFilters({...filters, priority: value || ''})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto">
        {queueData && (
          <>
            <Lane title="Needs Review" tickets={queueData.needs_review} laneId="needs_review" />
            <Lane title="Priced" tickets={queueData.priced} laneId="priced" />
            <Lane title="Sent" tickets={queueData.sent} laneId="sent" />
          </>
        )}
      </div>
    </div>
  );
}
