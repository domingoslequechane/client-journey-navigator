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
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden font-sans">
      <OfflineIndicator pendingCount={queueLength} isSyncing={isSyncing} />
      <AccessChangeNotification />
      <TrialStartedModal />

      {/* Mobile Header (Fixed/Sticky) */}
      <MobileHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area - Keyed to path trigger blurIn on navigation */}
        <main 
          ref={mainContentRef}
          className="flex flex-col flex-1 overflow-y-auto w-full md:pt-0 relative"
        >
          <TrialStatusBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
