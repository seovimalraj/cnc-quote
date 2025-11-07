export default function MembersPage() {
  // Mock data for demonstration
  const members = [
    {
      id: '1',
      user_email: 'john@acme.com',
      user_name: 'John Doe',
      role: 'buyer',
      invited_at: '2024-01-15T00:00:00Z',
      invited_by_email: 'admin@acme.com'
    },
    {
      id: '2',
      user_email: 'sarah@acme.com',
      user_name: 'Sarah Smith',
      role: 'admin',
      invited_at: '2024-01-16T00:00:00Z',
      invited_by_email: 'admin@acme.com'
    },
    {
      id: '3',
      user_email: 'mike@acme.com',
      user_name: 'Mike Johnson',
      role: 'viewer',
      invited_at: '2024-01-17T00:00:00Z',
      invited_by_email: 'admin@acme.com'
    }
  ];

  const getRoleDisplayName = (role: string) => {
    const names: Record<string, string> = {
      admin: 'Admin',
      buyer: 'Buyer',
      viewer: 'Viewer'
    };
    return names[role] || role;
  };

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
        <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md cursor-not-allowed opacity-50">
          Invite Member
        </button>
      </div>

      {/* Members Table */}
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
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
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
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {getRoleDisplayName(member.role)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(member.invited_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.invited_by_email || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-red-600 cursor-not-allowed opacity-50">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
