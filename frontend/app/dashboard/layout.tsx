'use client'

import Link from 'next/link'
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  Settings, 
  TrendingUp, 
  QrCode,
  Wallet,
  BarChart3,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/dashboard/transactions', icon: CreditCard },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'QR Codes', href: '/dashboard/qr-codes', icon: QrCode },
  { name: 'Rewards', href: '/dashboard/rewards', icon: TrendingUp },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden w-64 bg-card shadow-sm lg:block border-r">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-very-500 to-very-600" />
              <span className="font-bold text-foreground">VeryPay</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-very-100 text-very-900 dark:bg-very-900/20 dark:text-very-400' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-very-600 dark:text-very-400' : 'text-muted-foreground'
                  }`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Wallet Connection - Simplified */}
          <div className="border-t p-4">
            <ConnectButton 
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-foreground">Merchant Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="lg:hidden">
              <ConnectButton />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="container mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}