import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/stores/useAppStore';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isAuthenticated } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Don't show sidebar on payment page for cleaner mobile experience
  const showSidebar = !location.pathname.includes('/payment') && isAuthenticated;

  return (
    <div className="min-h-screen bg-background">
      {showSidebar && (
        <Sidebar 
          open={sidebarOpen} 
          onOpenChange={setSidebarOpen} 
        />
      )}
      
      <div className={`${showSidebar ? 'md:pl-64' : ''}`}>
        <Header 
          showMenuButton={showSidebar}
          onMenuClick={() => setSidebarOpen(true)}
        />
        
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}