import React from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WalletConnect } from '@/components/web3/WalletConnect';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

export function Header({ showMenuButton, onMenuClick }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="VeryPay" 
              className="w-8 h-8"
              onError={(e) => {
                // Fallback to a colored div if logo doesn't exist
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-8 h-8 bg-very-500 rounded-lg flex items-center justify-center text-white text-sm font-bold';
                fallback.textContent = 'V';
                target.parentNode?.insertBefore(fallback, target);
              }}
            />
            <span className="font-bold text-lg hidden sm:inline">
              {t('app.name')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <LanguageSelector />
          
          <NotificationDropdown />
          
          <WalletConnect variant="compact" />
          
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}