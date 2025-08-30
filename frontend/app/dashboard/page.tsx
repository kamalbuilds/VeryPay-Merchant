import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  CreditCard,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react'
import Link from 'next/link'

// Mock data for demonstration
const stats = [
  {
    name: 'Total Revenue',
    value: '$12,426.50',
    change: '+12.5%',
    changeType: 'positive',
    icon: DollarSign,
    description: 'vs last month'
  },
  {
    name: '$VERY Volume',
    value: '8,425.30',
    change: '+8.2%',
    changeType: 'positive', 
    icon: TrendingUp,
    description: '$VERY tokens processed'
  },
  {
    name: 'Transactions',
    value: '1,234',
    change: '+23.1%',
    changeType: 'positive',
    icon: CreditCard,
    description: 'this month'
  },
  {
    name: 'Active Customers',
    value: '892',
    change: '-2.4%',
    changeType: 'negative',
    icon: Users,
    description: 'unique customers'
  }
]

const recentTransactions = [
  {
    id: '1',
    customer: '0x1234...5678',
    amount: 125.50,
    veryAmount: 95.25,
    status: 'confirmed',
    timestamp: '2 minutes ago',
    type: 'payment'
  },
  {
    id: '2', 
    customer: '0x8765...4321',
    amount: 45.75,
    veryAmount: 34.85,
    status: 'pending',
    timestamp: '5 minutes ago',
    type: 'payment'
  },
  {
    id: '3',
    customer: '0x9876...1234',
    amount: 89.25,
    veryAmount: 67.90,
    status: 'confirmed',
    timestamp: '8 minutes ago',
    type: 'payment'
  },
  {
    id: '4',
    customer: '0x5432...8765',
    amount: 215.80,
    veryAmount: 164.25,
    status: 'confirmed', 
    timestamp: '12 minutes ago',
    type: 'payment'
  },
  {
    id: '5',
    customer: '0x3456...7890',
    amount: 67.40,
    veryAmount: 51.30,
    status: 'failed',
    timestamp: '18 minutes ago',
    type: 'payment'
  }
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your business today.</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button asChild>
            <Link href="/payment">
              <Plus className="mr-2 h-4 w-4" />
              Create Payment
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="flex items-center space-x-2 text-sm">
                <span
                  className={`inline-flex items-center ${
                    stat.changeType === 'positive' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}
                >
                  {stat.changeType === 'positive' ? (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  )}
                  {stat.change}
                </span>
                <span className="text-gray-500">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest payment activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/transactions">
                View All
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`h-2 w-2 rounded-full ${
                      transaction.status === 'confirmed' 
                        ? 'bg-green-500'
                        : transaction.status === 'pending'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.customer}
                      </p>
                      <p className="text-xs text-gray-500">{transaction.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.veryAmount.toFixed(2)} $VERY
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common merchant tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <Button asChild variant="outline" className="h-auto p-4 justify-start">
                <Link href="/payment">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-very-100 flex items-center justify-center">
                      <Plus className="h-4 w-4 text-very-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Create Payment Request</p>
                      <p className="text-sm text-gray-500">Generate QR code for customer payment</p>
                    </div>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-4 justify-start">
                <Link href="/dashboard/qr-codes">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-very-100 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-very-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">View QR Codes</p>
                      <p className="text-sm text-gray-500">Manage active payment QR codes</p>
                    </div>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-4 justify-start">
                <Link href="/dashboard/analytics">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-very-100 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-very-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">View Analytics</p>
                      <p className="text-sm text-gray-500">Detailed sales and customer insights</p>
                    </div>
                  </div>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-auto p-4 justify-start">
                <Link href="/dashboard/rewards">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-very-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-very-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Manage Rewards</p>
                      <p className="text-sm text-gray-500">Configure customer loyalty programs</p>
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest events and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 mt-2 rounded-full bg-green-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">Payment received from 0x1234...5678</p>
                <p className="text-xs text-gray-500">$125.50 (95.25 $VERY) • 2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 mt-2 rounded-full bg-blue-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">New customer registered</p>
                <p className="text-xs text-gray-500">0x8765...4321 • 15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 mt-2 rounded-full bg-yellow-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">QR code generated for $50.00 payment</p>
                <p className="text-xs text-gray-500">Valid for 1 hour • 32 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-2 w-2 mt-2 rounded-full bg-purple-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">Walking rewards distributed</p>
                <p className="text-xs text-gray-500">15.5 $VERY to 8 customers • 1 hour ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}