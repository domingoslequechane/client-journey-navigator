import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { ScrollToTop } from '@/components/ScrollToTop';
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
    <div className="flex flex-col md:flex-row bg-background font-sans min-h-screen">
      <OfflineIndicator pendingCount={queueLength} isSyncing={isSyncing} />
      <AccessChangeNotification />
      <TrialStartedModal />
      <MobileHeader />
      <ScrollToTop />
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden md:block shrink-0 sticky top-0 h-screen overflow-hidden">
          <Sidebar />
        </div>

        <div className="flex-1 flex flex-col pt-20 md:pt-0">
          {/* Main Content Area - Keyed to path trigger blurIn on navigation */}
          <main 
            ref={mainContentRef}
            className="w-full relative px-4 md:px-0"
          >
            <TrialStatusBanner />
            <div className="w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
