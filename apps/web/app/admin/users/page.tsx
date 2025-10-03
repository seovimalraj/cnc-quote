'use client';
import React from 'react';
import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';
import { AdminUser, AdminOrg, Paginated } from '@cnc-quote/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AdminUsersPage() {
  const [userPage, setUserPage] = React.useState(1);
  const [orgPage, setOrgPage] = React.useState(1);
  const [userQuery, setUserQuery] = React.useState('');
  const [orgQuery, setOrgQuery] = React.useState('');
  const debouncedUserQuery = useDebounce(userQuery, 300);
  const debouncedOrgQuery = useDebounce(orgQuery, 300);
  const pageSize = 25;

  const { data: usersData, error: usersError, isLoading: usersLoading, mutate: refreshUsers } = useSWR<Paginated<AdminUser>>(`/api/admin/users?page=${userPage}&page_size=${pageSize}&q=${encodeURIComponent(debouncedUserQuery)}`,(u)=>fetch(u).then(r=>r.json()),{ refreshInterval: 60000 });
  const { data: orgsData, error: orgsError, isLoading: orgsLoading, mutate: refreshOrgs } = useSWR<Paginated<AdminOrg>>(`/api/admin/orgs?page=${orgPage}&page_size=${pageSize}&q=${encodeURIComponent(debouncedOrgQuery)}`,(u)=>fetch(u).then(r=>r.json()),{ refreshInterval: 60000 });

  const users = usersData?.data || [];
  const orgs = orgsData?.data || [];
  const loading = usersLoading || orgsLoading;

  const userTotalPages = usersData ? Math.ceil(usersData.total / usersData.page_size) : 1;
  const orgTotalPages = orgsData ? Math.ceil(orgsData.total / orgsData.page_size) : 1;

  return (
    <RequireAnyRole roles={['admin','org_admin']} fallback={<div className="p-4 text-sm text-red-600">Access denied</div>}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users & Organizations</h1>
        <div className="space-x-2">
          <Button variant="outline" size="sm">Invite User</Button>
          <Button size="sm">New Organization</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between w-full">Users
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-gray-400" />
                <input
                  placeholder="Search users..."
                  className="pl-7 pr-2 py-1 border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={userQuery}
                  onChange={e=>{setUserQuery(e.target.value); setUserPage(1);}}
                />
              </div>
              <span className="text-xs text-gray-500">{usersData ? `${usersData.total} total` : ''}</span>
              <Button variant="outline" size="sm" onClick={()=>refreshUsers()}>Refresh</Button>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="icon" disabled={userPage<=1} onClick={()=>setUserPage(p=>Math.max(1,p-1))}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-xs tabular-nums">{userPage}/{userTotalPages}</span>
                <Button variant="outline" size="icon" disabled={userPage>=userTotalPages} onClick={()=>setUserPage(p=>Math.min(userTotalPages,p+1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden relative">
            {usersError && <div className="p-3 text-sm text-red-600">Failed to load users</div>}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                <tr>
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Org</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Created</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 && [...Array(2)].map((_,i)=>(
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={`user-skel-${i}`} className="border-t">
                    <td className="p-2" colSpan={6}><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))}
                {!loading && users.map((u: AdminUser) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2">{u.email}</td>
                    <td className="p-2 font-mono text-xs">{u.role}</td>
                    <td className="p-2">{u.org}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.status==='active' ? 'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{u.status}</span>
                    </td>
                    <td className="p-2 text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-2 space-x-2">
                      <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">Edit</Button>
                      {u.status==='pending' && <Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">Approve</Button>}
                    </td>
                  </tr>
                ))}
                {!loading && users.length===0 && (
                  <tr><td className="p-4 text-sm text-gray-500" colSpan={6}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between w-full">Organizations
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-gray-400" />
                <input
                  placeholder="Search orgs..."
                  className="pl-7 pr-2 py-1 border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={orgQuery}
                  onChange={e=>{setOrgQuery(e.target.value); setOrgPage(1);}}
                />
              </div>
              <span className="text-xs text-gray-500">{orgsData ? `${orgsData.total} total` : ''}</span>
              <Button variant="outline" size="sm" onClick={()=>refreshOrgs()}>Refresh</Button>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="icon" disabled={orgPage<=1} onClick={()=>setOrgPage(p=>Math.max(1,p-1))}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-xs tabular-nums">{orgPage}/{orgTotalPages}</span>
                <Button variant="outline" size="icon" disabled={orgPage>=orgTotalPages} onClick={()=>setOrgPage(p=>Math.min(orgTotalPages,p+1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden relative">
            {orgsError && <div className="p-3 text-sm text-red-600">Failed to load organizations</div>}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Users</th>
                  <th className="p-2">Plan</th>
                  <th className="p-2">Created</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgsLoading && orgs.length === 0 && [...Array(2)].map((_,i)=>(
                  // eslint-disable-next-line react/no-array-index-key
                  <tr key={`org-skel-${i}`} className="border-t">
                    <td className="p-2" colSpan={5}><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))}
                {!orgsLoading && orgs.map((o: AdminOrg) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-2">{o.name}</td>
                    <td className="p-2">{o.user_count}</td>
                    <td className="p-2 capitalize">{o.plan}</td>
                    <td className="p-2 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="p-2 space-x-2"><Button variant="outline" size="sm" className="h-7 px-2 py-1 text-xs">Details</Button></td>
                  </tr>
                ))}
                {!orgsLoading && orgs.length===0 && (
                  <tr><td className="p-4 text-sm text-gray-500" colSpan={5}>No organizations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequireAnyRole>
  );
}
