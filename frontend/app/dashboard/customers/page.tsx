'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Download, Trophy, TrendingUp, Clock, DollarSign, Star, Award } from 'lucide-react'
import { format } from 'date-fns'

interface Customer {
  id: string
  address: string
  name?: string
  avatar?: string
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  totalSpent: number
  rewardsEarned: number
  transactionCount: number
  joinDate: Date
  lastTransaction: Date
  isActive: boolean
  loyaltyPoints: number
  recentActivity: CustomerActivity[]
}

interface CustomerActivity {
  id: string
  type: 'transaction' | 'reward' | 'tier_upgrade'
  description: string
  amount?: number
  timestamp: Date
}

interface CustomerStats {
  totalCustomers: number
  activeCustomers: number
  totalRevenue: number
  averageSpent: number
  topTierCustomers: number
  newCustomersThisMonth: number
}

// Mock data generator
const generateMockCustomers = (): Customer[] => {
  const tiers: Customer['tier'][] = ['Bronze', 'Silver', 'Gold', 'Platinum']
  const names = [
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Wilson',
    'Frank Miller', 'Grace Lee', 'Henry Ford', 'Ivy Chen', 'Jack Ryan'
  ]
  
  return Array.from({ length: 50 }, (_, i) => {
    const tier = tiers[Math.floor(Math.random() * tiers.length)]
    const joinDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
    const lastTransaction = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    const totalSpent = Math.random() * 10000 + 100
    const transactionCount = Math.floor(Math.random() * 100 + 5)
    
    const recentActivity: CustomerActivity[] = Array.from({ length: Math.floor(Math.random() * 8 + 2) }, (_, j) => ({
      id: `activity-${i}-${j}`,
      type: ['transaction', 'reward', 'tier_upgrade'][Math.floor(Math.random() * 3)] as CustomerActivity['type'],
      description: 'Recent activity description',
      amount: Math.random() * 500,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    }))

    recentActivity.forEach(activity => {
      switch (activity.type) {
        case 'transaction':
          activity.description = `Made a transaction of $${activity.amount?.toFixed(2)}`
          break
        case 'reward':
          activity.description = `Earned ${Math.floor(activity.amount || 0)} loyalty points`
          break
        case 'tier_upgrade':
          activity.description = `Upgraded to ${tier} tier`
          break
      }
    })
    
    return {
      id: `customer-${i + 1}`,
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      name: Math.random() > 0.3 ? names[i % names.length] : undefined,
      avatar: Math.random() > 0.5 ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}` : undefined,
      tier,
      totalSpent,
      rewardsEarned: Math.floor(totalSpent * 0.05),
      transactionCount,
      joinDate,
      lastTransaction,
      isActive: Math.random() > 0.2,
      loyaltyPoints: Math.floor(totalSpent * 0.1),
      recentActivity: recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }
  })
}

const mockCustomers = generateMockCustomers()

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers)
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>(mockCustomers)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'totalSpent' | 'transactionCount' | 'joinDate'>('totalSpent')
  const itemsPerPage = 12

  // Calculate statistics
  const stats: CustomerStats = React.useMemo(() => {
    const now = new Date()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    return {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.isActive).length,
      totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
      averageSpent: customers.length > 0 ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length : 0,
      topTierCustomers: customers.filter(c => c.tier === 'Platinum' || c.tier === 'Gold').length,
      newCustomersThisMonth: customers.filter(c => c.joinDate >= monthAgo).length
    }
  }, [customers])

  // Filter customers
  useEffect(() => {
    let filtered = customers

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(customer => customer.tier === tierFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => 
        statusFilter === 'active' ? customer.isActive : !customer.isActive
      )
    }

    // Sort customers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'totalSpent':
          return b.totalSpent - a.totalSpent
        case 'transactionCount':
          return b.transactionCount - a.transactionCount
        case 'joinDate':
          return b.joinDate.getTime() - a.joinDate.getTime()
        default:
          return 0
      }
    })

    setFilteredCustomers(filtered)
    setCurrentPage(1)
  }, [customers, searchTerm, tierFilter, statusFilter, sortBy])

  const getTierBadgeVariant = (tier: Customer['tier']) => {
    switch (tier) {
      case 'Platinum': return 'default'
      case 'Gold': return 'secondary'
      case 'Silver': return 'outline'
      case 'Bronze': return 'destructive'
      default: return 'outline'
    }
  }

  const getTierColor = (tier: Customer['tier']) => {
    switch (tier) {
      case 'Platinum': return 'text-purple-500'
      case 'Gold': return 'text-yellow-500'
      case 'Silver': return 'text-gray-400'
      case 'Bronze': return 'text-orange-600'
      default: return 'text-gray-400'
    }
  }

  const exportCustomerData = () => {
    const headers = ['ID', 'Address', 'Name', 'Tier', 'Total Spent', 'Rewards Earned', 'Transaction Count', 'Join Date', 'Last Transaction', 'Active', 'Loyalty Points']
    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(customer => [
        customer.id,
        customer.address,
        customer.name || 'N/A',
        customer.tier,
        customer.totalSpent.toFixed(2),
        customer.rewardsEarned.toFixed(2),
        customer.transactionCount,
        customer.joinDate.toISOString(),
        customer.lastTransaction.toISOString(),
        customer.isActive,
        customer.loyaltyPoints
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)

  const getActivityIcon = (type: CustomerActivity['type']) => {
    switch (type) {
      case 'transaction': return <DollarSign className="h-4 w-4 text-blue-500" />
      case 'reward': return <Star className="h-4 w-4 text-yellow-500" />
      case 'tier_upgrade': return <Award className="h-4 w-4 text-purple-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCustomers} active ({((stats.activeCustomers / stats.totalCustomers) * 100).toFixed(1)}%)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.averageSpent.toFixed(0)} average per customer
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Customers</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topTierCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Gold and Platinum tier customers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newCustomersThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              New customer acquisitions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by address or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Bronze">Bronze</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalSpent">Total Spent</SelectItem>
                <SelectItem value="transactionCount">Transactions</SelectItem>
                <SelectItem value="joinDate">Join Date</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportCustomerData} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customer Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedCustomers.map((customer) => (
          <Card 
            key={customer.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedCustomer(customer)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={customer.avatar} />
                  <AvatarFallback>
                    {customer.name 
                      ? customer.name.split(' ').map(n => n[0]).join('').toUpperCase()
                      : customer.address.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium truncate">
                      {customer.name || `User ${customer.id.split('-')[1]}`}
                    </h3>
                    {customer.isActive && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {customer.address.slice(0, 6)}...{customer.address.slice(-4)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={getTierBadgeVariant(customer.tier)} className={getTierColor(customer.tier)}>
                  {customer.tier}
                </Badge>
                <span className="text-sm font-medium">${customer.totalSpent.toFixed(0)}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Loyalty Progress</span>
                  <span>{customer.loyaltyPoints} pts</span>
                </div>
                <Progress value={Math.min((customer.loyaltyPoints % 1000) / 10, 100)} className="h-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Transactions</span>
                  <div className="font-medium">{customer.transactionCount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Rewards</span>
                  <div className="font-medium">${customer.rewardsEarned.toFixed(0)}</div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Last seen: {format(customer.lastTransaction, 'MMM dd')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Customer Details Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Header */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedCustomer.avatar} />
                  <AvatarFallback className="text-lg">
                    {selectedCustomer.name 
                      ? selectedCustomer.name.split(' ').map(n => n[0]).join('').toUpperCase()
                      : selectedCustomer.address.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">
                    {selectedCustomer.name || `Customer ${selectedCustomer.id.split('-')[1]}`}
                  </h2>
                  <p className="text-muted-foreground font-mono text-sm">
                    {selectedCustomer.address}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={getTierBadgeVariant(selectedCustomer.tier)} className={getTierColor(selectedCustomer.tier)}>
                      {selectedCustomer.tier}
                    </Badge>
                    {selectedCustomer.isActive ? (
                      <Badge variant="default" className="text-green-700 bg-green-100">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                  <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">${selectedCustomer.totalSpent.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total Spent</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedCustomer.transactionCount}</div>
                        <p className="text-xs text-muted-foreground">Transactions</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">${selectedCustomer.rewardsEarned.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Rewards Earned</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold">{selectedCustomer.loyaltyPoints}</div>
                        <p className="text-xs text-muted-foreground">Loyalty Points</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Join Date</label>
                      <div className="mt-1">{format(selectedCustomer.joinDate, 'PPP')}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Transaction</label>
                      <div className="mt-1">{format(selectedCustomer.lastTransaction, 'PPP pp')}</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <div className="space-y-3">
                    {selectedCustomer.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(activity.timestamp, 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="loyalty" className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">Current Tier: {selectedCustomer.tier}</h3>
                        <span className="text-sm text-muted-foreground">
                          {selectedCustomer.loyaltyPoints} points
                        </span>
                      </div>
                      <Progress 
                        value={Math.min((selectedCustomer.loyaltyPoints % 1000) / 10, 100)} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {1000 - (selectedCustomer.loyaltyPoints % 1000)} points to next tier
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {(['Bronze', 'Silver', 'Gold', 'Platinum'] as const).map((tier, index) => (
                        <div 
                          key={tier}
                          className={`text-center p-4 rounded-lg border ${
                            selectedCustomer.tier === tier 
                              ? 'bg-primary/10 border-primary' 
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className={`text-2xl mb-2 ${getTierColor(tier)}`}>
                            {tier === 'Bronze' && '🥉'}
                            {tier === 'Silver' && '🥈'}
                            {tier === 'Gold' && '🥇'}
                            {tier === 'Platinum' && '💎'}
                          </div>
                          <div className="text-sm font-medium">{tier}</div>
                          <div className="text-xs text-muted-foreground">
                            {index * 1000}+ points
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Benefits</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {selectedCustomer.tier === 'Platinum' && (
                          <>
                            <li>• 10% cashback on all transactions</li>
                            <li>• Priority customer support</li>
                            <li>• Exclusive event invitations</li>
                            <li>• Custom payment solutions</li>
                          </>
                        )}
                        {selectedCustomer.tier === 'Gold' && (
                          <>
                            <li>• 7% cashback on all transactions</li>
                            <li>• Priority customer support</li>
                            <li>• Monthly bonus rewards</li>
                          </>
                        )}
                        {selectedCustomer.tier === 'Silver' && (
                          <>
                            <li>• 5% cashback on all transactions</li>
                            <li>• Extended transaction history</li>
                          </>
                        )}
                        {selectedCustomer.tier === 'Bronze' && (
                          <>
                            <li>• 2% cashback on all transactions</li>
                            <li>• Basic customer support</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}