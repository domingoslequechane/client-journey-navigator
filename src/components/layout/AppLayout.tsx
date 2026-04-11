import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { AccessChangeNotification } from '@/components/auth/AccessChangeNotification';
import { TrialStatusBanner } from '@/components/subscription/TrialStatusBanner';
import { TrialStartedModal } from '@/components/subscription/TrialStartedModal';

export function AppLayout() {
  const { queueLength, isSyncing } = useSyncQueue();
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Reset scroll position of the main content area on navigation
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row bg-background font-sans min-h-screen md:h-screen md:overflow-hidden">
      <OfflineIndicator pendingCount={queueLength} isSyncing={isSyncing} />
      <AccessChangeNotification />
      <TrialStartedModal />
      <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden overflow-visible">
        {/* Desktop Sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area - Keyed to path trigger blurIn on navigation */}
        <main 
          ref={mainContentRef}
          className="w-full md:flex-1 md:overflow-y-auto relative overflow-visible"
        >
          <MobileHeader />
          <TrialStatusBanner />
          <div className="flex-1 w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
