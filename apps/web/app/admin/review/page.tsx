"use client";"use client";



import { useCallback, useMemo, useState } from "react";import React, { useState, useEffect } from 'react';

import { useRouter, useSearchParams } from "next/navigation";import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Download, Filter, RefreshCw, Search } from "lucide-react";import { Button } from '@/components/ui/button';

import { Button } from "@/components/ui/button";import { Badge } from '@/components/ui/badge';

import { Input } from "@/components/ui/input";import { Input } from '@/components/ui/input';

import ErrorBanner from "@/components/common/ErrorBanner";import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import EmptyState from "@/components/common/EmptyState";import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import ReviewTableSkeleton from "@/components/common/ReviewTableSkeleton";import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import AdminReviewTable from "@/components/admin/review/AdminReviewTable";import { Search, Filter, Download, RefreshCw, User, Clock, AlertTriangle, FileText } from 'lucide-react';

import ReviewStatsCards from "@/components/admin/review/ReviewStatsCards";

import { useAdminReviewQueue } from "@/hooks/useAdminReviewQueue";interface ReviewTicket {

  id: string;

type SortState = {  quote_id: string;

  readonly sort?: string;  org_name: string;

  readonly order?: "asc" | "desc";  stage: string;

};  assignee_user_id: string | null;

  priority: 'low' | 'normal' | 'high';

export default function ManualReviewPage() {  sla_due_at: string;

  const router = useRouter();  value_estimate: number;

  const searchParams = useSearchParams();  blockers_count: number;

  const initialSearch = searchParams?.get("search") ?? "";  files_count: number;

  const [search, setSearch] = useState(initialSearch);  created_at: string;

  updated_at: string;

  const {  first_price_ms: number;

    data: rows,  cad_status: string;

    stats,  top_dfm_issues: string[];

    meta,}

    filters,

    isLoading,interface ReviewQueueData {

    isFetching,  needs_review: ReviewTicket[];

    isError,  priced: ReviewTicket[];

    refetch,  sent: ReviewTicket[];

  } = useAdminReviewQueue();}



  const hasRows = rows.length > 0;export default function ManualReviewQueue() {

  const [queueData, setQueueData] = useState<ReviewQueueData | null>(null);

  const currentSort = useMemo<SortState>(() => {  const [counts, setCounts] = useState({ needs_review: 0, priced: 0, sent: 0, total: 0 });

    if (!filters.sort) {  const [loading, setLoading] = useState(true);

      return {};  const [searchTerm, setSearchTerm] = useState('');

    }  const [filters, setFilters] = useState({

    org: '',

    return { sort: filters.sort, order: filters.order };    assignee: '',

  }, [filters.order, filters.sort]);    priority: '',

    blockers: false,

  const handleRefresh = useCallback(() => {    age: ''

    refetch();  });

  }, [refetch]);  const [showFilters, setShowFilters] = useState(false);



  const updateSearchParam = useCallback((nextSearch: string) => {  useEffect(() => {

    const params = new URLSearchParams(searchParams?.toString() ?? "");    loadQueueData();

    if (nextSearch) {    loadCounts();

      params.set("search", nextSearch);  }, [filters]);

    } else {

      params.delete("search");  const loadQueueData = async () => {

    }    try {

    router.replace(`?${params.toString()}`);      const response = await fetch('/api/admin/review');

  }, [router, searchParams]);      const data = await response.json();

      setQueueData(data);

  const handleSearchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {    } catch (error) {

    event.preventDefault();      console.error('Failed to load queue data:', error);

    updateSearchParam(search.trim());    } finally {

  }, [search, updateSearchParam]);      setLoading(false);

    }

  const handleSortChange = useCallback((next: SortState) => {  };

    const params = new URLSearchParams(searchParams?.toString() ?? "");

  const loadCounts = async () => {

    if (next.sort) {    try {

      params.set("sort", next.sort);      const response = await fetch('/api/admin/review/counts');

    } else {      const data = await response.json();

      params.delete("sort");      setCounts(data);

    }    } catch (error) {

      console.error('Failed to load counts:', error);

    if (next.order) {    }

      params.set("order", next.order);  };

    } else {

      params.delete("order");  const handleAssign = async (ticketId: string, userId: string) => {

    }    try {

      await fetch(`/api/admin/review/${ticketId}/assign`, {

    router.replace(`?${params.toString()}`);        method: 'PUT',

  }, [router, searchParams]);        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ user_id: userId })

  if (isError) {      });

    return (      loadQueueData();

      <div className="space-y-6 p-6">    } catch (error) {

        <PageHeader onRefresh={handleRefresh} />      console.error('Failed to assign ticket:', error);

        <ErrorBanner message="Failed to load review queue" onRetry={handleRefresh} />    }

      </div>  };

    );

  }  const handleMove = async (ticketId: string, lane: string) => {

    try {

  if (isLoading && !hasRows) {      await fetch(`/api/admin/review/${ticketId}/move`, {

    return (        method: 'PUT',

      <div className="space-y-6 p-6">        headers: { 'Content-Type': 'application/json' },

        <PageHeader onRefresh={handleRefresh} />        body: JSON.stringify({ lane })

        <ReviewTableSkeleton />      });

      </div>      loadQueueData();

    );      loadCounts();

  }    } catch (error) {

      console.error('Failed to move ticket:', error);

  return (    }

    <div className="space-y-6 p-6">  };

      <PageHeader onRefresh={handleRefresh} />

      <ReviewStatsCards stats={stats} isFetching={isFetching} />  const getPriorityColor = (priority: string) => {

    switch (priority) {

      <section className="rounded border bg-card p-4 shadow-sm">      case 'high': return 'bg-red-100 text-red-800';

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">      case 'normal': return 'bg-yellow-100 text-yellow-800';

          <form onSubmit={handleSearchSubmit} className="relative flex w-full max-w-md items-center">      case 'low': return 'bg-green-100 text-green-800';

            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />      default: return 'bg-gray-100 text-gray-800';

            <Input    }

              value={search}  };

              onChange={(event) => setSearch(event.target.value)}

              placeholder="Search quotes, customers, companies"  const getSlaStatus = (slaDueAt: string) => {

              className="pl-10"    const due = new Date(slaDueAt);

            />    const now = new Date();

          </form>    const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);



          <div className="flex items-center gap-2">    if (hoursUntilDue < 0) return { color: 'bg-red-100 text-red-800', text: 'Overdue' };

            <Button type="button" variant="outline" size="sm">    if (hoursUntilDue < 24) return { color: 'bg-orange-100 text-orange-800', text: 'Due Soon' };

              <Filter className="mr-2 h-4 w-4" />    return { color: 'bg-green-100 text-green-800', text: 'On Track' };

              Filters  };

            </Button>

            <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>  const formatCurrency = (amount: number) => {

              <RefreshCw className="mr-2 h-4 w-4" />    return new Intl.NumberFormat('en-US', {

              Refresh      style: 'currency',

            </Button>      currency: 'USD'

            <Button type="button" variant="outline" size="sm">    }).format(amount);

              <Download className="mr-2 h-4 w-4" />  };

              Export

            </Button>  const formatRelativeTime = (dateString: string) => {

          </div>    const date = new Date(dateString);

        </div>    const now = new Date();

    const diffMs = now.getTime() - date.getTime();

        {!hasRows ? (    const diffHours = diffMs / (1000 * 60 * 60);

          <EmptyState title="No reviews" description="Try adjusting your filters." />

        ) : (    if (diffHours < 1) return 'Just now';

          <AdminReviewTable    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;

            rows={rows}    return `${Math.floor(diffHours / 24)}d ago`;

            meta={meta}  };

            isFetching={isFetching}

            currentSort={currentSort}  const TicketCard = ({ ticket }: { ticket: ReviewTicket }) => {

            onSortChange={handleSortChange}    const slaStatus = getSlaStatus(ticket.sla_due_at);

            onLoadMore={handleRefresh}

            data-testid="admin-review-table"    return (

          />      <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow">

        )}        <CardContent className="p-4">

      </section>          <div className="flex justify-between items-start mb-2">

    </div>            <div>

  );              <h3 className="font-semibold text-sm">{ticket.quote_id}</h3>

}              <p className="text-xs text-gray-600">{ticket.org_name}</p>

            </div>

type HeaderProps = {            <Badge className={getPriorityColor(ticket.priority)}>

  readonly onRefresh: () => void;              {ticket.priority}

};            </Badge>

          </div>

function PageHeader({ onRefresh }: HeaderProps) {

  return (          <div className="flex justify-between items-center mb-2">

    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">            <span className="font-medium">{formatCurrency(ticket.value_estimate)}</span>

      <div>            <div className="flex items-center gap-1">

        <h1 className="text-2xl font-bold text-foreground">Manual Review</h1>              <Clock className="h-3 w-3" />

        <p className="text-sm text-muted-foreground">              <span className="text-xs">{formatRelativeTime(ticket.updated_at)}</span>

          Review and approve quotes that require manual intervention.            </div>

        </p>          </div>

      </div>

      <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>          <div className="flex items-center justify-between mb-2">

        <RefreshCw className="mr-2 h-4 w-4" />            {ticket.blockers_count > 0 && (

        Refresh              <Badge variant="destructive" className="text-xs">

      </Button>                <AlertTriangle className="h-3 w-3 mr-1" />

    </header>                {ticket.blockers_count} blockers

  );              </Badge>

}            )}

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
