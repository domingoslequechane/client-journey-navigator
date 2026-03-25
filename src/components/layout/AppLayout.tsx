import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { AccessChangeNotification } from '@/components/auth/AccessChangeNotification';

export function AppLayout() {
  const { queueLength, isSyncing } = useSyncQueue();
  const location = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden font-sans">
      <OfflineIndicator pendingCount={queueLength} isSyncing={isSyncing} />
      <AccessChangeNotification />

      {/* Mobile Header (Fixed/Sticky) */}
      <MobileHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area - Keyed to path trigger blurIn on navigation */}
        <main 
          key={location.pathname}
          className="flex flex-col flex-1 overflow-y-auto w-full md:pt-0 animate-in"
          style={{ animationName: 'blurIn', animationDuration: '0.5s', animationFillMode: 'both' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
