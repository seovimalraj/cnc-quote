'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, PlusCircle, RefreshCcw, Upload } from 'lucide-react';

import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAdminCmsDocuments } from '@/hooks/useAdminCmsDocuments';
import { useAdminCmsPages } from '@/hooks/useAdminCmsPages';
import {
  saveAdminDocument,
  saveAdminPage,
  UpsertAdminDocumentPayload,
  UpsertAdminPagePayload,
} from '@/lib/admin/api';

import type { ContractsV1 } from '@cnc-quote/shared';

const CMS_STATUS_OPTIONS: { label: string; value: ContractsV1.AdminCmsStatusV1 }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'In Review', value: 'review' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
];

const STATUS_BADGE_CLASS: Record<ContractsV1.AdminCmsStatusV1, string> = {
  draft: 'bg-gray-100 text-gray-700 border border-gray-200',
  review: 'bg-amber-100 text-amber-900 border border-amber-200',
  published: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  archived: 'bg-slate-100 text-slate-700 border border-slate-200',
};

type PageFormState = {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  status: ContractsV1.AdminCmsStatusV1;
  hero_image: string;
  seo_description: string;
};

type DocumentFormState = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  document_type: string;
  asset_url: string;
  storage_path: string;
  status: ContractsV1.AdminCmsStatusV1;
};

const EMPTY_PAGE_FORM: PageFormState = {
  slug: '',
  title: '',
  summary: '',
  content: '',
  hero_image: '',
  seo_description: '',
  status: 'draft',
};

const EMPTY_DOCUMENT_FORM: DocumentFormState = {
  title: '',
  slug: '',
  description: '',
  document_type: '',
  asset_url: '',
  storage_path: '',
  status: 'draft',
};

function formatTimestamp(value?: string) {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    console.warn('Failed to format timestamp', error);
    return value;
  }
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export default function AdminContentPage() {
  const {
    pages,
    fetchedAt: pagesFetchedAt,
    isLoading: pagesLoading,
    isFetching: pagesFetching,
    isError: pagesError,
    error: pagesErrorObj,
    refetch: refetchPages,
  } = useAdminCmsPages();

  const {
    documents,
    fetchedAt: documentsFetchedAt,
    isLoading: documentsLoading,
    isFetching: documentsFetching,
    isError: documentsError,
    error: documentsErrorObj,
    refetch: refetchDocuments,
  } = useAdminCmsDocuments();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [pageForm, setPageForm] = useState<PageFormState>({ ...EMPTY_PAGE_FORM });
  const [documentForm, setDocumentForm] = useState<DocumentFormState>({ ...EMPTY_DOCUMENT_FORM });
  const [editingPageId, setEditingPageId] = useState<string | undefined>(undefined);
  const [editingDocumentId, setEditingDocumentId] = useState<string | undefined>(undefined);

  const savePageMutation = useMutation({
    mutationFn: async (payload: UpsertAdminPagePayload) => saveAdminPage(payload),
    onSuccess: (result) => {
      toast({ title: 'Page saved', description: `Page “${result.title}” was saved successfully.` });
      queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'pages'] });
      setPageDialogOpen(false);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to save page';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    },
  });

  const saveDocumentMutation = useMutation({
    mutationFn: async (payload: UpsertAdminDocumentPayload) => saveAdminDocument(payload),
    onSuccess: (result) => {
      toast({ title: 'Document saved', description: `Document “${result.title}” was saved successfully.` });
      queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'documents'] });
      setDocumentDialogOpen(false);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Unable to save document';
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    },
  });

  const handleCreatePage = () => {
  setEditingPageId(undefined);
  setPageForm({ ...EMPTY_PAGE_FORM });
    setPageDialogOpen(true);
  };

  const handleEditPage = (page: ContractsV1.AdminCmsPageV1) => {
    setEditingPageId(page.id);
    setPageForm({
      id: page.id,
      slug: page.slug,
      title: page.title,
      summary: page.summary ?? '',
      content: page.content ?? '',
      hero_image: page.hero_image ?? '',
      seo_description: page.seo_description ?? '',
      status: page.status,
    });
    setPageDialogOpen(true);
  };

  const handleCreateDocument = () => {
  setEditingDocumentId(undefined);
  setDocumentForm({ ...EMPTY_DOCUMENT_FORM });
    setDocumentDialogOpen(true);
  };

  const handleEditDocument = (doc: ContractsV1.AdminCmsDocumentV1) => {
    setEditingDocumentId(doc.id);
    setDocumentForm({
      id: doc.id,
      title: doc.title,
      slug: doc.slug ?? '',
      description: doc.description ?? '',
      document_type: doc.document_type ?? '',
      asset_url: doc.asset_url ?? '',
      storage_path: doc.storage_path ?? '',
      status: doc.status,
    });
    setDocumentDialogOpen(true);
  };

  useEffect(() => {
    if (!pageDialogOpen) {
    setPageForm({ ...EMPTY_PAGE_FORM });
      setEditingPageId(undefined);
    }
  }, [pageDialogOpen]);

  useEffect(() => {
    if (!documentDialogOpen) {
    setDocumentForm({ ...EMPTY_DOCUMENT_FORM });
      setEditingDocumentId(undefined);
    }
  }, [documentDialogOpen]);

  const sortedPages = useMemo(
    () =>
      [...pages].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')),
    [pages],
  );

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')),
    [documents],
  );

  const handlePageSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: UpsertAdminPagePayload = {
      id: editingPageId,
      slug: pageForm.slug.trim(),
      title: pageForm.title.trim(),
      status: pageForm.status,
      summary: nullable(pageForm.summary) ?? null,
      content: nullable(pageForm.content) ?? null,
      hero_image: nullable(pageForm.hero_image) ?? null,
      seo_description: nullable(pageForm.seo_description) ?? null,
    };
    savePageMutation.mutate(payload);
  };

  const handleDocumentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: UpsertAdminDocumentPayload = {
      id: editingDocumentId,
      title: documentForm.title.trim(),
      slug: nullable(documentForm.slug) ?? null,
      description: nullable(documentForm.description) ?? null,
      document_type: nullable(documentForm.document_type) ?? null,
      asset_url: nullable(documentForm.asset_url) ?? null,
      storage_path: nullable(documentForm.storage_path) ?? null,
      status: documentForm.status,
    };
    saveDocumentMutation.mutate(payload);
  };

  return (
    <RequireAnyRole roles={['admin', 'org_admin']} fallback={<div className="p-4 text-sm text-red-600">Access denied</div>}>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Content Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage static site pages and customer-facing documents backed by Supabase CMS tables.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchPages(); refetchDocuments(); }} disabled={pagesFetching || documentsFetching}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${pagesFetching || documentsFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Pages
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {pagesFetchedAt ? <span>Updated {formatTimestamp(pagesFetchedAt)}</span> : null}
              <Button size="sm" onClick={handleCreatePage}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Page
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pagesError ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Unable to load pages: {pagesErrorObj?.message ?? 'Unknown error'}
              </div>
            ) : null}
            {pagesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {sortedPages.map((page) => (
                  <li key={page.id} className="rounded-lg border border-gray-200 p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md dark:border-gray-700">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{page.title}</h3>
                          <Badge className={`${STATUS_BADGE_CLASS[page.status]} uppercase tracking-wide text-[10px]`}>{page.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Slug: {page.slug}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Last updated {formatTimestamp(page.updated_at)}{page.updated_by ? ` · by ${page.updated_by}` : ''}</p>
                        {page.summary ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{page.summary}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditPage(page)}>Edit</Button>
                      </div>
                    </div>
                  </li>
                ))}
                {!sortedPages.length && !pagesLoading ? (
                  <li className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No CMS pages found yet. Use “New Page” to create your first entry.
                  </li>
                ) : null}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Documents
            </CardTitle>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {documentsFetchedAt ? <span>Updated {formatTimestamp(documentsFetchedAt)}</span> : null}
              <Button size="sm" onClick={handleCreateDocument}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Document
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {documentsError ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Unable to load documents: {documentsErrorObj?.message ?? 'Unknown error'}
              </div>
            ) : null}
            {documentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {sortedDocuments.map((doc) => (
                  <li key={doc.id} className="rounded-lg border border-gray-200 p-4 shadow-sm transition hover:border-primary/50 hover:shadow-md dark:border-gray-700">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{doc.title}</h3>
                          <Badge className={`${STATUS_BADGE_CLASS[doc.status]} uppercase tracking-wide text-[10px]`}>{doc.status}</Badge>
                        </div>
                        {doc.slug ? <p className="text-sm text-gray-500 dark:text-gray-400">Slug: {doc.slug}</p> : null}
                        <p className="text-xs text-gray-400 dark:text-gray-500">Last updated {formatTimestamp(doc.updated_at)}{doc.updated_by ? ` · by ${doc.updated_by}` : ''}</p>
                        {doc.description ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{doc.description}</p> : null}
                        {doc.asset_url ? (
                          <a className="mt-2 inline-flex items-center text-sm text-primary underline" href={doc.asset_url} target="_blank" rel="noopener noreferrer">
                            View asset
                          </a>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditDocument(doc)}>Edit</Button>
                      </div>
                    </div>
                  </li>
                ))}
                {!sortedDocuments.length && !documentsLoading ? (
                  <li className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No documents uploaded yet. Use “New Document” to seed the library.
                  </li>
                ) : null}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPageId ? 'Edit Page' : 'Create Page'}</DialogTitle>
            <DialogDescription>Manage static page metadata and body content. Changes persist directly to Supabase.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePageSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="page-slug">Slug</Label>
                <Input
                  id="page-slug"
                  value={pageForm.slug}
                  onChange={(event) => setPageForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="/pricing"
                  required
                />
              </div>
              <div>
                <Label htmlFor="page-status">Status</Label>
                <Select
                  value={pageForm.status}
                  onValueChange={(value) =>
                    setPageForm((prev) => ({ ...prev, status: value as ContractsV1.AdminCmsStatusV1 }))
                  }
                >
                  <SelectTrigger id="page-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CMS_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="page-title">Title</Label>
              <Input
                id="page-title"
                value={pageForm.title}
                onChange={(event) => setPageForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Pricing"
                required
              />
            </div>
            <div>
              <Label htmlFor="page-summary">Summary</Label>
              <Textarea
                id="page-summary"
                value={pageForm.summary}
                onChange={(event) => setPageForm((prev) => ({ ...prev, summary: event.target.value }))}
                rows={3}
                placeholder="Short hero summary displayed on marketing pages."
              />
            </div>
            <div>
              <Label htmlFor="page-content">Body Markdown / HTML</Label>
              <Textarea
                id="page-content"
                value={pageForm.content}
                onChange={(event) => setPageForm((prev) => ({ ...prev, content: event.target.value }))}
                rows={8}
                placeholder="Primary content block (Markdown or HTML)."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="page-hero">Hero Image URL</Label>
                <Input
                  id="page-hero"
                  value={pageForm.hero_image}
                  onChange={(event) => setPageForm((prev) => ({ ...prev, hero_image: event.target.value }))}
                  placeholder="https://cdn.example.com/hero.png"
                />
              </div>
              <div>
                <Label htmlFor="page-seo-description">SEO Description</Label>
                <Input
                  id="page-seo-description"
                  value={pageForm.seo_description}
                  onChange={(event) => setPageForm((prev) => ({ ...prev, seo_description: event.target.value }))}
                  placeholder="Meta description for search engines"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPageDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savePageMutation.isPending}>
                {savePageMutation.isPending ? 'Saving…' : 'Save Page'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDocumentId ? 'Edit Document' : 'Create Document'}</DialogTitle>
            <DialogDescription>Manage hosted assets and document metadata for customer downloads.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleDocumentSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="document-title">Title</Label>
                <Input
                  id="document-title"
                  value={documentForm.title}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="2025 CNC Capability Deck"
                  required
                />
              </div>
              <div>
                <Label htmlFor="document-status">Status</Label>
                <Select
                  value={documentForm.status}
                  onValueChange={(value) =>
                    setDocumentForm((prev) => ({ ...prev, status: value as ContractsV1.AdminCmsStatusV1 }))
                  }
                >
                  <SelectTrigger id="document-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CMS_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="document-slug">Slug</Label>
                <Input
                  id="document-slug"
                  value={documentForm.slug}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="/docs/cnc-capabilities"
                />
              </div>
              <div>
                <Label htmlFor="document-type">Document Type</Label>
                <Input
                  id="document-type"
                  value={documentForm.document_type}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, document_type: event.target.value }))}
                  placeholder="pdf | spec | runbook"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="document-description">Description</Label>
              <Textarea
                id="document-description"
                value={documentForm.description}
                onChange={(event) => setDocumentForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                placeholder="Short copy shown to admins and customer portal viewers."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="document-asset-url">Asset URL</Label>
                <Input
                  id="document-asset-url"
                  value={documentForm.asset_url}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, asset_url: event.target.value }))}
                  placeholder="https://cdn.example.com/assets/cnc-capabilities.pdf"
                />
              </div>
              <div>
                <Label htmlFor="document-storage-path">Storage Path</Label>
                <Input
                  id="document-storage-path"
                  value={documentForm.storage_path}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, storage_path: event.target.value }))}
                  placeholder="public/docs/cnc-capabilities.pdf"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDocumentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveDocumentMutation.isPending}>
                {saveDocumentMutation.isPending ? 'Saving…' : 'Save Document'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </RequireAnyRole>
  );
}
