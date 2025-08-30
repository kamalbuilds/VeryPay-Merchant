"use client"

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function DashboardHeader() {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-very-500 to-very-600" />
          <span className="font-bold">VeryPay Dashboard</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
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
        
        <div className="flex items-center space-x-4">
          <Button asChild>
            <Link href="/payment">
              <Plus className="mr-2 h-4 w-4" />
              Create Payment
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}