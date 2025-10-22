import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Customer Portal - CNC Quote',
  description: 'Customer portal for CNC quoting platform',
}

import PortalLanding from '@/components/portal/PortalLanding';

export default function PortalPage() {
  return <PortalLanding />;
}
