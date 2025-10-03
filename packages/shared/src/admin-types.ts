// Admin user representation used in admin panel tables
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  org: string;
  status: string;
  created_at: string;
}

// Organization representation for admin/org admin views
export interface AdminOrg {
  id: string;
  name: string;
  user_count: number;
  plan: string;
  created_at: string;
}

// Generic pagination wrapper used by admin endpoints
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// Re-export type aliases (helps some tooling pick them up explicitly)
export type { AdminUser as TAdminUser, AdminOrg as TAdminOrg };
