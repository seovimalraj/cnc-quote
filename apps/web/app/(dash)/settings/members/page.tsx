/**
 * Organization Members Management Page
 * 
 * Allows org admins to:
 * - View all members in the organization
 * - Change member roles
 * - Invite new members
 * - Remove members
 * 
 * Protected by RBAC: Only org_admin and admin roles can access
 */

'use client';

import { useState, useEffect } from 'react';
import { usePermissions, getRoleDisplayName, getAllRoles, UserRole } from '../../../../lib/rbac';

interface OrgMember {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  role: UserRole;
  invited_at: string;
  invited_by_email?: string;
  last_role_change_at?: string;
}

export default function MembersPage() {
  const { can } = usePermissions();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('buyer');
  const [inviting, setInviting] = useState(false);

  // Check permissions
  const canChangeRole = can('change_role', 'users');
  const canInvite = can('invite', 'users');
  const canRemove = can('delete', 'users');

  // Fetch members on mount
  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/organizations/members');
      if (!response.ok) throw new Error('Failed to fetch members');
      
      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(memberId: string, newRole: UserRole) {
    if (!canChangeRole) {
      alert('You do not have permission to change roles');
      return;
    }

    try {
      const response = await fetch(`/api/organizations/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to change role');

      // Refresh members list
      await fetchMembers();
    } catch (err) {
      console.error('Error changing role:', err);
      alert('Failed to change role');
    }
  }

  async function inviteMember() {
    if (!canInvite) {
      alert('You do not have permission to invite members');
      return;
    }

    if (!inviteEmail || !inviteEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setInviting(true);
      
      const response = await fetch('/api/organizations/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) throw new Error('Failed to invite member');

      // Reset form and close modal
      setInviteEmail('');
      setInviteRole('buyer');
      setShowInviteModal(false);

      // Refresh members list
      await fetchMembers();
    } catch (err) {
      console.error('Error inviting member:', err);
      alert('Failed to invite member');
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!canRemove) {
      alert('You do not have permission to remove members');
      return;
    }

    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizations/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove member');

      // Refresh members list
      await fetchMembers();
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Failed to remove member');
    }
  }

  // Permission check: redirect if no access
  if (!can('view', 'users') && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">
            You do not have permission to view organization members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your team members and their roles
          </p>
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Invite Member
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
        </div>
      )}

      {/* Members Table */}
      {!loading && members.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <p className="text-gray-500">No members found</p>
        </div>
      )}

      {!loading && members.length > 0 && (
        <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited By
                </th>
                {(canChangeRole || canRemove) && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {member.user_name?.charAt(0) || member.user_email.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.user_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500">{member.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canChangeRole ? (
                      <select
                        value={member.role}
                        onChange={(e) => changeRole(member.id, e.target.value as UserRole)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        {getAllRoles().map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getRoleDisplayName(member.role)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.invited_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.invited_by_email || '—'}
                  </td>
                  {(canChangeRole || canRemove) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canRemove && (
                        <button
                          onClick={() => removeMember(member.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowInviteModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Invite New Member
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    {getAllRoles().map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  disabled={inviting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={inviteMember}
                  disabled={inviting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
