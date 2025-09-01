export interface User {
  id: string;
  org_id: string;
  email: string;
  name?: string;
  roles?: string[];
}
