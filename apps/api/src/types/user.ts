export interface User {
  id: string;
  sub: string;  // Supabase user ID (auth.users.id)
  org_id: string;
  default_org_id?: string;
  last_org_id?: string;
  email: string;
  name?: string;
  roles?: string[];
}
