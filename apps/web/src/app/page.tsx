'use client';

import DefaultLayout from '@/components/Layouts/DefaultLayout';
import { 
  CubeIcon, 
  ClockIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

// Demo data
const stats = [
  {
    title: 'Total Quotes',
    value: '1,234',
    change: '+12%',
    isPositive: true,
    icon: CubeIcon,
    description: 'From last month',
  },
  {
    title: 'Pending Reviews',
    value: '45',
    change: '-8%',
    isPositive: false,
    icon: ClockIcon,
    description: 'Awaiting approval',
  },
  {
    title: 'Revenue',
    value: '$124,567',
    change: '+23%',
    isPositive: true,
    icon: CurrencyDollarIcon,
    description: 'This month',
  },
  {
    title: 'Active Customers',
    value: '892',
    change: '+15%',
    isPositive: true,
    icon: UserGroupIcon,
    description: 'Total customers',
  },
];

const recentQuotes = [
  {
    id: 'Q-2024-001',
    customer: 'Acme Manufacturing',
    part: 'Aluminum Housing',
    quantity: 100,
    price: '$2,450.00',
    status: 'Approved',
    date: '2024-09-01',
  },
  {
    id: 'Q-2024-002',
    customer: 'TechCorp Industries',
    part: 'Steel Bracket',
    quantity: 250,
    price: '$1,875.00',
    status: 'Pending',
    date: '2024-09-02',
  },
  {
    id: 'Q-2024-003',
    customer: 'Precision Parts Co',
    part: 'Titanium Component',
    quantity: 50,
    price: '$5,200.00',
    status: 'In Review',
    date: '2024-09-03',
  },
  {
    id: 'Q-2024-004',
    customer: 'AutoParts Ltd',
    part: 'Engine Mount',
    quantity: 300,
    price: '$3,600.00',
    status: 'Approved',
    date: '2024-09-03',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Approved':
      return 'bg-meta-3 text-white';
    case 'Pending':
      return 'bg-meta-6 text-white';
    case 'In Review':
      return 'bg-meta-5 text-white';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

export default function Dashboard() {
  return (
    <DefaultLayout>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {/* Stats Cards */}
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-full bg-meta-2 dark:bg-meta-4">
              <stat.icon className="w-6 h-6 text-primary" />
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <h4 className="text-title-md font-bold text-black dark:text-white">
                  {stat.value}
                </h4>
                <span className="text-sm font-medium">{stat.title}</span>
              </div>

              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  stat.isPositive ? 'text-meta-3' : 'text-meta-1'
                }`}
              >
                {stat.change}
                {stat.isPositive ? (
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4" />
                )}
              </span>
            </div>
            <p className="text-xs text-meta-2">{stat.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-7.5 2xl:gap-7.5">
        {/* Recent Quotes Table */}
        <div className="col-span-12 xl:col-span-8">
          <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
              Recent Quotes
            </h4>

            <div className="flex flex-col">
              <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-7">
                <div className="p-2.5 xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Quote ID
                  </h5>
                </div>
                <div className="p-2.5 text-center xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Customer
                  </h5>
                </div>
                <div className="p-2.5 text-center xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Part
                  </h5>
                </div>
                <div className="hidden p-2.5 text-center sm:block xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Quantity
                  </h5>
                </div>
                <div className="hidden p-2.5 text-center sm:block xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Price
                  </h5>
                </div>
                <div className="hidden p-2.5 text-center sm:block xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Status
                  </h5>
                </div>
                <div className="hidden p-2.5 text-center sm:block xl:p-5">
                  <h5 className="text-sm font-medium uppercase xsm:text-base">
                    Actions
                  </h5>
                </div>
              </div>

              {recentQuotes.map((quote, key) => (
                <div
                  className={`grid grid-cols-3 sm:grid-cols-7 ${
                    key === recentQuotes.length - 1
                      ? ''
                      : 'border-b border-stroke dark:border-strokedark'
                  }`}
                  key={key}
                >
                  <div className="flex items-center gap-3 p-2.5 xl:p-5">
                    <p className="text-black dark:text-white sm:block">
                      {quote.id}
                    </p>
                  </div>

                  <div className="flex items-center justify-center p-2.5 xl:p-5">
                    <p className="text-black dark:text-white">{quote.customer}</p>
                  </div>

                  <div className="flex items-center justify-center p-2.5 xl:p-5">
                    <p className="text-meta-3">{quote.part}</p>
                  </div>

                  <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                    <p className="text-black dark:text-white">{quote.quantity}</p>
                  </div>

                  <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                    <p className="text-meta-5 font-medium">{quote.price}</p>
                  </div>

                  <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                        quote.status
                      )}`}
                    >
                      {quote.status}
                    </span>
                  </div>

                  <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                    <div className="flex items-center space-x-3.5">
                      <button className="hover:text-primary">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button className="hover:text-primary">
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button className="hover:text-primary">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart One */}
        <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pt-7.5 pb-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-4">
          <div className="flex w-full flex-col">
            <div className="mb-4">
              <h4 className="text-xl font-semibold text-black dark:text-white">
                Quote Analytics
              </h4>
            </div>
            
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black dark:text-white">
                  Approved Quotes
                </span>
                <span className="text-sm text-meta-3">75%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-meta-3" style={{ width: '75%' }}></div>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black dark:text-white">
                  Pending Review
                </span>
                <span className="text-sm text-meta-6">15%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-meta-6" style={{ width: '15%' }}></div>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black dark:text-white">
                  In Review
                </span>
                <span className="text-sm text-meta-5">10%</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-meta-5" style={{ width: '10%' }}></div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <h5 className="text-2xl font-bold text-black dark:text-white">1,234</h5>
              <p className="text-sm text-body">Total Quotes This Month</p>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
