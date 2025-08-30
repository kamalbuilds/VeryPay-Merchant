import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, CreditCard, Smartphone, TrendingUp, Users, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-very-500 to-very-600" />
              <span className="hidden font-bold sm:inline-block">VeryPay Merchant</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground">
                Dashboard
              </Link>
              <Link href="/payment" className="transition-colors hover:text-foreground/80 text-muted-foreground">
                Payments
              </Link>
              <Link href="/customer" className="transition-colors hover:text-foreground/80 text-muted-foreground">
                Customers
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-very-50 via-white to-very-50">
        <div className="container px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Accept{' '}
              <span className="bg-gradient-to-r from-very-600 to-very-800 bg-clip-text text-transparent">
                $VERY
              </span>{' '}
              Payments
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              The future of merchant payments with Web3 rewards, loyalty programs, and seamless crypto transactions. 
              Start accepting $VERY tokens today and reward your customers automatically.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button asChild size="lg" className="bg-very-600 hover:bg-very-700">
                <Link href="/dashboard">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/payment">Try Demo Payment</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-very-200 to-very-400 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to accept crypto payments
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Built for modern merchants who want to embrace the future of payments
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-7xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-very-100 hover:border-very-200 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-very-100 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-very-600" />
                  </div>
                  <CardTitle>Instant Payments</CardTitle>
                  <CardDescription>
                    Accept $VERY token payments instantly with real-time transaction monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• QR code payment system</li>
                    <li>• Real-time confirmations</li>
                    <li>• Auto-convert to fiat</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-very-100 hover:border-very-200 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-very-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-very-600" />
                  </div>
                  <CardTitle>Rewards System</CardTitle>
                  <CardDescription>
                    Automatic customer rewards and loyalty program integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Walking rewards tracking</li>
                    <li>• Tier-based loyalty</li>
                    <li>• Automatic distribution</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-very-100 hover:border-very-200 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-very-100 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-very-600" />
                  </div>
                  <CardTitle>Mobile Optimized</CardTitle>
                  <CardDescription>
                    Perfect mobile experience for both merchants and customers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Progressive Web App</li>
                    <li>• Offline capabilities</li>
                    <li>• Push notifications</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-very-100 hover:border-very-200 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-very-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-very-600" />
                  </div>
                  <CardTitle>Customer Insights</CardTitle>
                  <CardDescription>
                    Detailed analytics and customer behavior insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Sales analytics</li>
                    <li>• Customer profiles</li>
                    <li>• Revenue tracking</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-very-100 hover:border-very-200 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-very-100 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-very-600" />
                  </div>
                  <CardTitle>Secure & Compliant</CardTitle>
                  <CardDescription>
                    Enterprise-grade security with regulatory compliance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Multi-signature wallets</li>
                    <li>• Audit trails</li>
                    <li>• KYC integration</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-very-100 hover:border-very-200 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-lg bg-very-100 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-very-600" />
                  </div>
                  <CardTitle>Fast Integration</CardTitle>
                  <CardDescription>
                    Easy setup with comprehensive documentation and support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Simple API integration</li>
                    <li>• Developer tools</li>
                    <li>• 24/7 support</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-very-900 text-white">
        <div className="container px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to start accepting $VERY payments?
            </h2>
            <p className="mt-6 text-lg text-very-100">
              Join thousands of merchants already using VeryPay to accept crypto payments and reward their customers.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/dashboard">
                  Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-very-900">
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded bg-gradient-to-r from-very-500 to-very-600" />
              <span className="font-bold">VeryPay Merchant</span>
            </div>
            <div className="text-sm text-gray-500">
              © 2024 VeryPay. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}