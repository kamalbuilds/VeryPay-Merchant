'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Gift, 
  Star,
  Activity,
  CreditCard,
  Wallet,
  ArrowRight,
  QrCode,
  Send,
  History
} from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

// Mock customer data
const customerData = {
  address: '0x1234567890123456789012345678901234567890',
  name: 'Alex Johnson',
  tier: 'Gold',
  rewardsBalance: 1247.85,
  loyaltyPoints: 12450,
  totalSpent: 3420.50,
  walkingRewards: 485.30,
  nextTier: 'Platinum',
  pointsToNextTier: 2550,
  joinedDate: '2024-03-15'
}

const tierProgress = (customerData.loyaltyPoints - 5000) / (15000 - 5000) // Gold tier progress

const recentTransactions = [
  {
    id: '1',
    merchant: 'Coffee Corner',
    amount: 12.50,
    veryAmount: 9.50,
    rewards: 0.95,
    date: '2024-08-30',
    type: 'purchase'
  },
  {
    id: '2',
    merchant: 'Walking Rewards',
    amount: 0,
    veryAmount: 0,
    rewards: 5.25,
    date: '2024-08-30',
    type: 'walking'
  },
  {
    id: '3',
    merchant: 'Pizza Palace',
    amount: 25.75,
    veryAmount: 19.60,
    rewards: 2.18,
    date: '2024-08-29',
    type: 'purchase'
  },
  {
    id: '4',
    merchant: 'Book Store',
    amount: 45.00,
    veryAmount: 34.20,
    rewards: 4.50,
    date: '2024-08-29',
    type: 'purchase'
  },
]

const walkingStats = {
  todaySteps: 8420,
  todayDistance: 6.2,
  todayRewards: 6.2,
  weeklySteps: 47620,
  weeklyDistance: 35.1,
  weeklyRewards: 35.1,
  stepsToBonus: 22380,
}

const tierBenefits = [
  { title: '3x Reward Points', description: 'Earn 3x points on every purchase' },
  { title: 'Free Transaction Fees', description: 'No fees on $VERY transactions' },
  { title: 'Priority Support', description: '24/7 dedicated customer support' },
]

export default function CustomerPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-very-500 to-very-600" />
              <span className="hidden font-bold sm:inline-block text-foreground">VeryPay</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <span className="text-muted-foreground">{customerData.name}</span>
              <span className="text-muted-foreground">Gold Member</span>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <Card className="bg-gradient-to-r from-very-500 to-very-600 text-white border-0">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Welcome back, Alex Johnson!</CardTitle>
            <CardDescription className="text-very-100">
              Keep earning rewards with every purchase and step you take
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-very-200 dark:border-very-800">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-very-100 dark:bg-very-900/30 flex items-center justify-center mb-2">
                <Wallet className="h-6 w-6 text-very-600 dark:text-very-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {customerData.rewardsBalance.toFixed(2)}
              </CardTitle>
              <CardDescription className="text-muted-foreground">$VERY Rewards Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-very-600 hover:bg-very-700 text-white" size="sm">
                <Gift className="mr-2 h-4 w-4" />
                Redeem Rewards
              </Button>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-800 bg-gradient-to-br from-yellow-50 to-background dark:from-yellow-950/20 dark:to-background">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-2">
                <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {customerData.tier}
              </CardTitle>
              <CardDescription className="text-muted-foreground">Current Tier Status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress to {customerData.nextTier}</span>
                  <span>{Math.round(tierProgress * 100)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${tierProgress * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {customerData.pointsToNextTier.toLocaleString()} points to {customerData.nextTier}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20 dark:to-background">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {customerData.walkingRewards.toFixed(2)}
              </CardTitle>
              <CardDescription className="text-muted-foreground">Walking Rewards Earned</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white" size="sm">
                <MapPin className="mr-2 h-4 w-4" />
                Start Walking
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Walking Tracker */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span>Walking Rewards Tracker</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">Earn $VERY tokens by staying active</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Today's Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {walkingStats.todaySteps.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">Steps Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {walkingStats.todayDistance}km
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    +{walkingStats.todayRewards}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">$VERY Earned</p>
                </div>
              </div>

              {/* Weekly Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2 text-muted-foreground">
                  <span>Weekly Goal Progress</span>
                  <span>{Math.round((walkingStats.weeklySteps / 70000) * 100)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(walkingStats.weeklySteps / 70000) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {walkingStats.stepsToBonus.toLocaleString()} steps to weekly bonus
                </p>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white">
                <MapPin className="mr-2 h-4 w-4" />
                Track My Walk
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <Clock className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">Your latest transactions and rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between pb-4 border-b last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'purchase' 
                          ? 'bg-blue-100 dark:bg-blue-900/30' 
                          : 'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        {transaction.type === 'purchase' ? (
                          <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{transaction.merchant}</p>
                        <p className="text-xs text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        +{transaction.rewards.toFixed(2)} $VERY
                      </p>
                      {transaction.amount > 0 && (
                        <p className="text-xs text-muted-foreground">${transaction.amount.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/transactions">
                <Button variant="outline" className="w-full mt-4">
                  View All Transactions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Your Gold Tier Benefits */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>Your {customerData.tier} Tier Benefits</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">Exclusive perks and rewards for {customerData.tier} members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tierBenefits.map((benefit, index) => (
                <div key={index} className="bg-secondary rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button className="h-auto p-4 flex-col space-y-2" variant="outline">
            <QrCode className="h-6 w-6" />
            <span className="text-sm">Scan QR Code</span>
          </Button>
          <Button className="h-auto p-4 flex-col space-y-2" variant="outline">
            <Send className="h-6 w-6" />
            <span className="text-sm">Send $VERY</span>
          </Button>
          <Button className="h-auto p-4 flex-col space-y-2" variant="outline">
            <Gift className="h-6 w-6" />
            <span className="text-sm">Rewards Shop</span>
          </Button>
          <Button className="h-auto p-4 flex-col space-y-2" variant="outline">
            <History className="h-6 w-6" />
            <span className="text-sm">History</span>
          </Button>
        </div>
      </div>
    </div>
  )
}