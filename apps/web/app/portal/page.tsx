import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Customer Portal - CNC Quote',
  description: 'Customer portal for CNC quoting platform',
}

import { withPortalAuth } from '@/components/auth/withPortalAuth';

function PortalPageBase() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-primary-600">Customer Portal</h1>
      <p className="mt-2 text-sm text-gray-600">Select a section from the sidebar.</p>
    </div>
  );
}

const PortalPage = withPortalAuth(PortalPageBase);
export default PortalPage;
