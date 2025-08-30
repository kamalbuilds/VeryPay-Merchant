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
  QrCode
} from 'lucide-react'
import Link from 'next/link'

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
    amount: 28.75,
    veryAmount: 21.85,
    rewards: 2.18,
    date: '2024-08-29',
    type: 'purchase'
  },
  {
    id: '4',
    merchant: 'Book Store',
    amount: 45.99,
    veryAmount: 34.95,
    rewards: 3.50,
    date: '2024-08-29',
    type: 'purchase'
  }
]

const walkingStats = {
  todaySteps: 8420,
  todayDistance: 6.2, // km
  todayRewards: 6.2,
  weeklySteps: 52380,
  weeklyDistance: 38.4,
  weeklyRewards: 38.4
}

export default function CustomerPortalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-very-50 via-white to-very-50">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-very-500 to-very-600" />
            <span className="font-bold">VeryPay Customer</span>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium">{customerData.name}</p>
              <p className="text-xs text-gray-500">{customerData.tier} Member</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-very-100 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-very-600" />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {customerData.name}!</h1>
          <p className="text-gray-600 mt-2">Keep earning rewards with every purchase and step you take</p>
        </div>

        {/* Rewards Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-very-200 bg-gradient-to-br from-very-50 to-white">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-very-100 flex items-center justify-center mb-2">
                <Wallet className="h-6 w-6 text-very-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-very-900">
                {customerData.rewardsBalance.toFixed(2)}
              </CardTitle>
              <CardDescription>$VERY Rewards Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full very-gradient" size="sm">
                <Gift className="mr-2 h-4 w-4" />
                Redeem Rewards
              </Button>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-yellow-900">
                {customerData.tier}
              </CardTitle>
              <CardDescription>Current Tier Status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to {customerData.nextTier}</span>
                  <span>{Math.round(tierProgress * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${tierProgress * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  {customerData.pointsToNextTier.toLocaleString()} points to {customerData.nextTier}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-900">
                {customerData.walkingRewards.toFixed(2)}
              </CardTitle>
              <CardDescription>Walking Rewards Earned</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="sm">
                <MapPin className="mr-2 h-4 w-4" />
                Start Walking
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Walking Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <span>Walking Rewards Tracker</span>
              </CardTitle>
              <CardDescription>Earn $VERY tokens by staying active</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Today's Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-900">
                    {walkingStats.todaySteps.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">Steps Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-900">
                    {walkingStats.todayDistance}km
                  </p>
                  <p className="text-xs text-green-600">Distance</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-900">
                    +{walkingStats.todayRewards}
                  </p>
                  <p className="text-xs text-green-600">$VERY Earned</p>
                </div>
              </div>

              {/* Weekly Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Weekly Goal Progress</span>
                  <span>{Math.round((walkingStats.weeklySteps / 70000) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                    style={{ width: `${Math.min((walkingStats.weeklySteps / 70000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {(70000 - walkingStats.weeklySteps).toLocaleString()} steps to weekly bonus
                </p>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700">
                <MapPin className="mr-2 h-4 w-4" />
                Track My Walk
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-very-600" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>Your latest transactions and rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'walking' 
                          ? 'bg-green-100' 
                          : 'bg-very-100'
                      }`}>
                        {transaction.type === 'walking' ? (
                          <Activity className="h-4 w-4 text-green-600" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-very-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{transaction.merchant}</p>
                        <p className="text-xs text-gray-500">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {transaction.amount > 0 && (
                        <p className="text-sm text-gray-900">${transaction.amount}</p>
                      )}
                      <p className="text-xs text-very-600">+{transaction.rewards} $VERY</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                <ArrowRight className="mr-2 h-4 w-4" />
                View All Transactions
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tier Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <span>Your {customerData.tier} Tier Benefits</span>
            </CardTitle>
            <CardDescription>Exclusive perks and rewards for {customerData.tier} members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <h4 className="font-medium mb-2">3x Reward Multiplier</h4>
                <p className="text-sm text-gray-600">Earn triple rewards on all purchases</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <Gift className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium mb-2">Monthly Bonus</h4>
                <p className="text-sm text-gray-600">50 $VERY bonus every month</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="mx-auto h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium mb-2">Exclusive Deals</h4>
                <p className="text-sm text-gray-600">Special offers from partner merchants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="h-auto p-4 flex-col space-y-2" variant="outline">
                <QrCode className="h-6 w-6" />
                <span className="text-sm">Scan QR Code</span>
              </Button>
              <Button className="h-auto p-4 flex-col space-y-2" variant="outline">
                <Wallet className="h-6 w-6" />
                <span className="text-sm">My Wallet</span>
              </Button>
              <Button className="h-auto p-4 flex-col space-y-2" variant="outline">
                <MapPin className="h-6 w-6" />
                <span className="text-sm">Find Merchants</span>
              </Button>
              <Button className="h-auto p-4 flex-col space-y-2" variant="outline">
                <Gift className="h-6 w-6" />
                <span className="text-sm">Redeem Rewards</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}