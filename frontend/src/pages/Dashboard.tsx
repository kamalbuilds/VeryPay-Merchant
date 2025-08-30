import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, 
  CreditCard, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/useAppStore';
import { useTransactionStore } from '@/stores/useTransactionStore';
import { formatDistanceToNow } from 'date-fns';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { TransactionChart } from '@/components/charts/TransactionChart';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, merchant } = useAppStore();
  const { transactions, todayTransactions, weekTransactions, monthTransactions } = useTransactionStore();

  // Mock data - in real app, this would come from API
  const stats = {
    todayRevenue: todayTransactions.reduce((sum, tx) => sum + tx.usdValue, 0),
    weeklyRevenue: weekTransactions.reduce((sum, tx) => sum + tx.usdValue, 0),
    monthlyRevenue: monthTransactions.reduce((sum, tx) => sum + tx.usdValue, 0),
    totalCustomers: 1247,
    newCustomers: 23,
    totalTransactions: transactions.length,
    pendingTransactions: transactions.filter(tx => tx.status === 'pending').length,
  };

  const recentTransactions = transactions.slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {t('dashboard.welcome')}{user?.name && `, ${user.name}`}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your merchant activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.todayRevenue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="inline-flex items-center text-green-600">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +12%
              </span>{' '}
              from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.transactions')}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              <span className="inline-flex items-center text-green-600">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +5%
              </span>{' '}
              from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.customers')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="inline-flex items-center text-blue-600">
                +{stats.newCustomers} new today
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Weekly Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.weeklyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="inline-flex items-center text-green-600">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                +8%
              </span>{' '}
              from last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>
              Daily revenue for the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume</CardTitle>
            <CardDescription>
              Transaction count and volume trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionChart />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
              <CardDescription>
                Your latest payment transactions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-very-100 rounded-lg flex items-center justify-center">
                      {transaction.status === 'confirmed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        Payment {transaction.type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(transaction.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(transaction.usdValue)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.amount} {transaction.token}
                      </p>
                    </div>
                    {getStatusBadge(transaction.status)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <Button variant="very" size="sm" className="mt-2">
                  Create Payment Link
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for merchant operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button variant="outline" className="justify-start">
              <CreditCard className="w-4 h-4 mr-2" />
              Create Payment QR
            </Button>
            <Button variant="outline" className="justify-start">
              <Users className="w-4 h-4 mr-2" />
              View Customers
            </Button>
            <Button variant="outline" className="justify-start">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}