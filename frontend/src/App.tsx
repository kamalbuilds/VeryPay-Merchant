import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/toaster';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { Layout } from '@/components/layout/Layout';

// Pages
import Dashboard from '@/pages/Dashboard';
import Payment from '@/pages/Payment';
import Customer from '@/pages/Customer';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';

function App() {
  const { t } = useTranslation();

  return (
    <NotificationProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/customer" element={<Customer />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster />
    </NotificationProvider>
  );
}

export default App;