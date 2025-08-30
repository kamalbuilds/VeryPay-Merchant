'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Search, Download, Filter, Calendar as CalendarIcon, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  hash: string
  from: string
  to: string
  amount: number
  token: string
  status: 'confirmed' | 'pending' | 'failed'
  timestamp: Date
  gasUsed: number
  gasPrice: number
  blockNumber?: number
  type: 'send' | 'receive'
}

interface TransactionStats {
  totalVolume: number
  totalTransactions: number
  confirmedTransactions: number
  pendingTransactions: number
  failedTransactions: number
  averageAmount: number
}

// Mock data
const generateMockTransactions = (): Transaction[] => {
  const statuses: Transaction['status'][] = ['confirmed', 'pending', 'failed']
  const tokens = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH']
  const types: Transaction['type'][] = ['send', 'receive']
  
  return Array.from({ length: 150 }, (_, i) => ({
    id: `tx-${i + 1}`,
    hash: `0x${Math.random().toString(16).substr(2, 64)}`,
    from: `0x${Math.random().toString(16).substr(2, 40)}`,
    to: `0x${Math.random().toString(16).substr(2, 40)}`,
    amount: Math.random() * 1000 + 0.001,
    token: tokens[Math.floor(Math.random() * tokens.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    gasUsed: Math.floor(Math.random() * 100000 + 21000),
    gasPrice: Math.random() * 50 + 10,
    blockNumber: Math.random() > 0.3 ? Math.floor(Math.random() * 1000000 + 18000000) : undefined,
    type: types[Math.floor(Math.random() * types.length)]
  }))
}

const mockTransactions = generateMockTransactions()

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions)
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(mockTransactions)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tokenFilter, setTokenFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false)
  const itemsPerPage = 20

  // Calculate statistics
  const stats: TransactionStats = React.useMemo(() => {
    const confirmed = filteredTransactions.filter(tx => tx.status === 'confirmed')
    const pending = filteredTransactions.filter(tx => tx.status === 'pending')
    const failed = filteredTransactions.filter(tx => tx.status === 'failed')
    
    return {
      totalVolume: confirmed.reduce((sum, tx) => sum + tx.amount, 0),
      totalTransactions: filteredTransactions.length,
      confirmedTransactions: confirmed.length,
      pendingTransactions: pending.length,
      failedTransactions: failed.length,
      averageAmount: confirmed.length > 0 ? confirmed.reduce((sum, tx) => sum + tx.amount, 0) / confirmed.length : 0
    }
  }, [filteredTransactions])

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(prev => 
        prev.map(tx => 
          tx.status === 'pending' && Math.random() > 0.9
            ? { ...tx, status: Math.random() > 0.1 ? 'confirmed' : 'failed', blockNumber: Math.floor(Math.random() * 1000000 + 18000000) }
            : tx
        )
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Filter transactions
  useEffect(() => {
    let filtered = transactions

    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter)
    }

    if (tokenFilter !== 'all') {
      filtered = filtered.filter(tx => tx.token === tokenFilter)
    }

    if (dateRange.from) {
      filtered = filtered.filter(tx => tx.timestamp >= dateRange.from!)
    }

    if (dateRange.to) {
      filtered = filtered.filter(tx => tx.timestamp <= dateRange.to!)
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }, [transactions, searchTerm, statusFilter, tokenFilter, dateRange])

  const getStatusBadgeVariant = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed': return 'default'
      case 'pending': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Hash', 'From', 'To', 'Amount', 'Token', 'Status', 'Timestamp', 'Gas Used', 'Gas Price', 'Block Number']
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(tx => [
        tx.id,
        tx.hash,
        tx.from,
        tx.to,
        tx.amount.toFixed(6),
        tx.token,
        tx.status,
        tx.timestamp.toISOString(),
        tx.gasUsed,
        tx.gasPrice.toFixed(2),
        tx.blockNumber || 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalVolume.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed transactions only
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalTransactions > 0 
                ? ((stats.confirmedTransactions / stats.totalTransactions) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingTransactions} pending, {stats.failedTransactions} failed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per confirmed transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by hash, address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tokenFilter} onValueChange={setTokenFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tokens</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="DAI">DAI</SelectItem>
                <SelectItem value="WETH">WETH</SelectItem>
              </SelectContent>
            </Select>
            <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-64 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={2}
                />
                <div className="p-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setDateRange({})
                      setIsDateRangeOpen(false)
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hash</TableHead>
                <TableHead>From/To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Block</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      {transaction.type === 'send' ? (
                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                      ) : (
                        <ArrowDownLeft className="h-3 w-3 text-green-500" />
                      )}
                      <span>{transaction.hash.slice(0, 10)}...{transaction.hash.slice(-8)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div>From: {transaction.from.slice(0, 6)}...{transaction.from.slice(-4)}</div>
                      <div>To: {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {transaction.amount.toFixed(6)} {transaction.token}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(transaction.timestamp, 'MMM dd, HH:mm')}
                  </TableCell>
                  <TableCell className="text-xs">
                    {transaction.blockNumber || 'Pending'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
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

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedTransaction.status)}>
                      {selectedTransaction.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1 flex items-center space-x-2">
                    {selectedTransaction.type === 'send' ? (
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-green-500" />
                    )}
                    <span className="capitalize">{selectedTransaction.type}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                <div className="mt-1 font-mono text-sm bg-muted p-2 rounded break-all">
                  {selectedTransaction.hash}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">From</label>
                  <div className="mt-1 font-mono text-sm bg-muted p-2 rounded break-all">
                    {selectedTransaction.from}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">To</label>
                  <div className="mt-1 font-mono text-sm bg-muted p-2 rounded break-all">
                    {selectedTransaction.to}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <div className="mt-1 text-lg font-semibold">
                    {selectedTransaction.amount.toFixed(6)} {selectedTransaction.token}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <div className="mt-1">
                    {format(selectedTransaction.timestamp, 'PPP pp')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gas Used</label>
                  <div className="mt-1">{selectedTransaction.gasUsed.toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gas Price</label>
                  <div className="mt-1">{selectedTransaction.gasPrice.toFixed(2)} Gwei</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Block Number</label>
                  <div className="mt-1">{selectedTransaction.blockNumber || 'Pending'}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}