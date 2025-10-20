// Admin content management contracts (v1)
// These types back the CMS tooling for landing pages and documents.

export type AdminCmsStatusV1 = 'draft' | 'review' | 'published' | 'archived';

export interface AdminCmsPageV1 {
  id: string;
  slug: string;
  title: string;
  status: AdminCmsStatusV1;
  summary?: string | null;
  content?: string | null;
  hero_image?: string | null;
  seo_description?: string | null;
  updated_at: string;
  created_at?: string | null;
  updated_by?: string | null;
  published_at?: string | null;
}

export interface AdminCmsDocumentV1 {
  id: string;
  title: string;
  slug?: string | null;
  status: AdminCmsStatusV1;
  description?: string | null;
  document_type?: string | null;
  asset_url?: string | null;
  storage_path?: string | null;
  updated_at: string;
  created_at?: string | null;
  updated_by?: string | null;
  published_at?: string | null;
}

export interface AdminCmsPagesResponseV1 {
  fetched_at: string;
  pages: AdminCmsPageV1[];
}

export interface AdminCmsDocumentsResponseV1 {
  fetched_at: string;
  documents: AdminCmsDocumentV1[];
}
