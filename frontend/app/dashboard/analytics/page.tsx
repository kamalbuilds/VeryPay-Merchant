'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity, 
  Download,
  Calendar,
  PieChart,
  BarChart3,
  LineChart
} from 'lucide-react'
import { 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  AreaChart, 
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie
} from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'

interface RevenueData {
  date: string
  revenue: number
  transactions: number
}

interface TokenDistribution {
  name: string
  value: number
  color: string
}

interface PaymentTimeData {
  hour: number
  transactions: number
  day: string
}

interface CustomerMetrics {
  date: string
  newCustomers: number
  returningCustomers: number
  totalCustomers: number
}

interface AnalyticsStats {
  totalRevenue: number
  revenueChange: number
  totalTransactions: number
  transactionsChange: number
  averageTransactionValue: number
  avgValueChange: number
  customerRetentionRate: number
  retentionChange: number
}

// Generate mock data
const generateRevenueData = (days: number): RevenueData[] => {
  const data: RevenueData[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(subDays(new Date(), i))
    data.push({
      date: format(date, 'MMM dd'),
      revenue: Math.random() * 10000 + 5000 + (Math.sin(i / 7) * 2000),
      transactions: Math.floor(Math.random() * 200 + 100 + (Math.sin(i / 7) * 50))
    })
  }
  return data
}

const generateTokenDistribution = (): TokenDistribution[] => [
  { name: 'ETH', value: 45, color: '#627EEA' },
  { name: 'USDC', value: 25, color: '#2775CA' },
  { name: 'USDT', value: 15, color: '#26A17B' },
  { name: 'DAI', value: 10, color: '#F4B731' },
  { name: 'WETH', value: 5, color: '#F0B90B' }
]

const generatePaymentHeatmap = (): PaymentTimeData[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const data: PaymentTimeData[] = []
  
  days.forEach(day => {
    for (let hour = 0; hour < 24; hour++) {
      data.push({
        hour,
        day,
        transactions: Math.floor(Math.random() * 50 + 10)
      })
    }
  })
  return data
}

const generateCustomerMetrics = (days: number): CustomerMetrics[] => {
  const data: CustomerMetrics[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = startOfDay(subDays(new Date(), i))
    const newCustomers = Math.floor(Math.random() * 20 + 5)
    const returningCustomers = Math.floor(Math.random() * 80 + 40)
    data.push({
      date: format(date, 'MMM dd'),
      newCustomers,
      returningCustomers,
      totalCustomers: newCustomers + returningCustomers
    })
  }
  return data
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d')
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [customerData, setCustomerData] = useState<CustomerMetrics[]>([])
  const [tokenDistribution] = useState<TokenDistribution[]>(generateTokenDistribution())
  const [paymentHeatmap] = useState<PaymentTimeData[]>(generatePaymentHeatmap())

  useEffect(() => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
    setRevenueData(generateRevenueData(days))
    setCustomerData(generateCustomerMetrics(days))
  }, [timeframe])

  // Calculate statistics
  const stats: AnalyticsStats = React.useMemo(() => {
    if (revenueData.length === 0) return {
      totalRevenue: 0,
      revenueChange: 0,
      totalTransactions: 0,
      transactionsChange: 0,
      averageTransactionValue: 0,
      avgValueChange: 0,
      customerRetentionRate: 0,
      retentionChange: 0
    }

    const currentPeriod = revenueData.slice(-7)
    const previousPeriod = revenueData.slice(-14, -7)
    
    const currentRevenue = currentPeriod.reduce((sum, d) => sum + d.revenue, 0)
    const previousRevenue = previousPeriod.reduce((sum, d) => sum + d.revenue, 0)
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
    
    const currentTransactions = currentPeriod.reduce((sum, d) => sum + d.transactions, 0)
    const previousTransactions = previousPeriod.reduce((sum, d) => sum + d.transactions, 0)
    const transactionsChange = previousTransactions > 0 ? ((currentTransactions - previousTransactions) / previousTransactions) * 100 : 0
    
    const currentAvgValue = currentTransactions > 0 ? currentRevenue / currentTransactions : 0
    const previousAvgValue = previousTransactions > 0 ? previousRevenue / previousTransactions : 0
    const avgValueChange = previousAvgValue > 0 ? ((currentAvgValue - previousAvgValue) / previousAvgValue) * 100 : 0
    
    const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0)
    const totalTransactions = revenueData.reduce((sum, d) => sum + d.transactions, 0)
    
    return {
      totalRevenue,
      revenueChange,
      totalTransactions,
      transactionsChange,
      averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      avgValueChange,
      customerRetentionRate: 78.5, // Mock retention rate
      retentionChange: 2.3
    }
  }, [revenueData])

  const downloadReport = (type: 'revenue' | 'customers' | 'complete') => {
    let data: any[] = []
    let filename = ''
    
    switch (type) {
      case 'revenue':
        data = revenueData
        filename = 'revenue-report'
        break
      case 'customers':
        data = customerData
        filename = 'customer-report'
        break
      case 'complete':
        data = [
          { type: 'Revenue Data', ...revenueData[0] },
          { type: 'Customer Data', ...customerData[0] },
          { type: 'Token Distribution', ...tokenDistribution[0] }
        ]
        filename = 'complete-analytics-report'
        break
    }
    
    const headers = Object.keys(data[0] || {})
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const StatCard = ({ title, value, change, icon: Icon, prefix = '', suffix = '' }: {
    title: string
    value: number
    change: number
    icon: any
    prefix?: string
    suffix?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {prefix}{value.toFixed(prefix === '$' ? 0 : 1)}{suffix}
        </div>
        <div className={`flex items-center text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {Math.abs(change).toFixed(1)}% from last period
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => downloadReport('complete')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          change={stats.revenueChange}
          icon={DollarSign}
          prefix="$"
        />
        <StatCard
          title="Total Transactions"
          value={stats.totalTransactions}
          change={stats.transactionsChange}
          icon={Activity}
        />
        <StatCard
          title="Average Transaction"
          value={stats.averageTransactionValue}
          change={stats.avgValueChange}
          icon={TrendingUp}
          prefix="$"
        />
        <StatCard
          title="Customer Retention"
          value={stats.customerRetentionRate}
          change={stats.retentionChange}
          icon={Users}
          suffix="%"
        />
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue & Volume</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="tokens">Token Distribution</TabsTrigger>
          <TabsTrigger value="heatmap">Usage Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Revenue Trend</CardTitle>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => downloadReport('revenue')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
                      labelClassName="text-foreground"
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      fill="#8884d8"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaction Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: any) => [value.toLocaleString(), 'Transactions']}
                      labelClassName="text-foreground"
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="transactions" 
                      fill="#82ca9d"
                      radius={[2, 2, 0, 0]}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Customer Acquisition</CardTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => downloadReport('customers')}
              >
                <Download className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RechartsLineChart data={customerData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip 
                    labelClassName="text-foreground"
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newCustomers" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="New Customers"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="returningCustomers" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Returning Customers"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalCustomers" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    name="Total Active"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">78.5%</div>
                <Progress value={78.5} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Customers returning within 30 days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Avg. Customer Lifetime</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">127 days</div>
                <Progress value={65} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Average customer engagement period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Value</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">$2,341</div>
                <Progress value={82} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Average lifetime value per customer
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Token Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={tokenDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tokenDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Token Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tokenDistribution.map((token, index) => (
                  <div key={token.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: token.color }}
                      />
                      <span className="font-medium">{token.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{token.value}%</div>
                      <div className="text-xs text-muted-foreground">
                        ${(token.value * 1000).toLocaleString()} vol.
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Times Heatmap</CardTitle>
              <p className="text-sm text-muted-foreground">
                Transaction patterns by day of week and hour
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <div className="w-12 text-xs font-medium">{day}</div>
                    <div className="flex space-x-1 flex-1">
                      {Array.from({ length: 24 }, (_, hour) => {
                        const data = paymentHeatmap.find(p => p.day === day && p.hour === hour)
                        const intensity = data ? Math.min(data.transactions / 50, 1) : 0
                        return (
                          <div
                            key={hour}
                            className="flex-1 h-4 rounded-sm cursor-pointer transition-colors"
                            style={{
                              backgroundColor: `rgba(34, 197, 94, ${intensity})`,
                              minWidth: '8px'
                            }}
                            title={`${day} ${hour}:00 - ${data?.transactions || 0} transactions`}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                  <span>12 AM</span>
                  <span>6 AM</span>
                  <span>12 PM</span>
                  <span>6 PM</span>
                  <span>11 PM</span>
                </div>
                <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500/20" />
                    <span>Low activity</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500/60" />
                    <span>Medium activity</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span>High activity</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Peak Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2:00 PM</div>
                <p className="text-sm text-muted-foreground">
                  Highest transaction volume
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Peak Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">Wednesday</div>
                <p className="text-sm text-muted-foreground">
                  Most active day of week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Off-Peak Discount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">15%</div>
                <p className="text-sm text-muted-foreground">
                  Potential savings during low-activity hours
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}