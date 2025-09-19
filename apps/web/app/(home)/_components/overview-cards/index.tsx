import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

const stats = [
  {
    title: "Total Orders",
    value: "1,234",
    change: "+12%",
    changeType: "increase",
    icon: Package,
    color: "text-primary"
  },
  {
    title: "Pending Orders",
    value: "23",
    change: "-5%",
    changeType: "decrease",
    icon: Clock,
    color: "text-warning"
  },
  {
    title: "Revenue",
    value: "$45,678",
    change: "+8%",
    changeType: "increase",
    icon: DollarSign,
    color: "text-success"
  },
  {
    title: "Active Customers",
    value: "89",
    change: "+15%",
    changeType: "increase",
    icon: Users,
    color: "text-info"
  }
];

export function OverviewCardsGroup() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-dark dark:text-white">
              {stat.value}
            </div>
            <p className={`text-xs ${
              stat.changeType === 'increase'
                ? 'text-success'
                : stat.changeType === 'decrease'
                ? 'text-danger'
                : 'text-gray-500'
            }`}>
              {stat.change} from last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}