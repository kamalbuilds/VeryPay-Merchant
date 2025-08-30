"use client"

import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

interface NavigationProps {
  showThemeToggle?: boolean
  title?: string
  showBackButton?: boolean
  backHref?: string
}

export function Navigation({ showThemeToggle = true, title, showBackButton, backHref = "/" }: NavigationProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {showBackButton && (
          <Link href={backHref} className="mr-6 flex items-center space-x-2 text-sm">
            <span>←</span>
            <span>Back</span>
          </Link>
        )}
        
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-very-500 to-very-600" />
          <span className="font-bold">{title || "VeryPay Merchant"}</span>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
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
          
          {showThemeToggle && (
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}