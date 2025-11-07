import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = {
  main: [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Quotes', href: '/admin/quotes' },
    { name: 'Orders', href: '/admin/orders' },
    { name: 'Customers', href: '/admin/customers' },
    { name: 'Organizations', href: '/admin/organizations' },
    { name: 'Suppliers', href: '/admin/suppliers' },
    { name: 'Analytics', href: '/admin/analytics' },
    { name: 'Invoices', href: '/admin/invoices' },
    { name: 'Shipments', href: '/admin/shipments' },
  ],
  catalog: [
    { name: 'Materials', href: '/admin/catalog/materials' },
    { name: 'Machines', href: '/admin/machines' },
    { name: 'Capacity', href: '/admin/capacity' },
    { name: 'Finishes', href: '/admin/catalog/finishes' },
    { name: 'Pricing Engine', href: '/admin/pricing' },
    { name: 'Certifications', href: '/admin/catalog/certifications' },
  ],
  settings: [
    { name: 'Organization', href: '/admin/settings/organization' },
    { name: 'Team', href: '/admin/settings/team' },
    { name: 'API Keys', href: '/admin/settings/api-keys' },
    { name: 'Webhooks', href: '/admin/settings/webhooks' },
  ],
};

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="flex flex-col space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500">Main</h3>
        <div className="flex flex-col space-y-1">
          {navigation.main.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm ${
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500">Catalog</h3>
        <div className="flex flex-col space-y-1">
          {navigation.catalog.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm ${
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-500">Settings</h3>
        <div className="flex flex-col space-y-1">
          {navigation.settings.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm ${
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
