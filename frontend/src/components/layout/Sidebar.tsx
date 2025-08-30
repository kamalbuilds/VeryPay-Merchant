import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  BarChart3, 
  Settings, 
  X,
  Wallet,
  Gift,
  History,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navigationItems = [
  {
    name: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'payment',
    href: '/payment',
    icon: CreditCard,
  },
  {
    name: 'customer',
    href: '/customer',
    icon: Users,
  },
  {
    name: 'analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-very-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-bold text-lg">VeryPay</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="md:hidden"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
            (item.href === '/dashboard' && location.pathname === '/');
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => onOpenChange(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-4 h-4" />
              {t(`navigation.${item.name}`)}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <div className="p-4 space-y-4 border-t">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-lg font-semibold">$2,450.00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-lg font-semibold">1,247</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:z-50 md:flex md:w-64 md:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-0">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar */}
      {open && (
        <div className="relative z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-background border-r">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}