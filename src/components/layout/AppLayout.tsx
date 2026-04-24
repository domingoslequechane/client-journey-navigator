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
import { PlanExpiredModal } from '@/components/subscription/PlanExpiredModal';
import { BroadcastModal } from '@/components/notifications/BroadcastModal';
import { useBroadcastNotifications } from '@/hooks/useBroadcastNotifications';

export function AppLayout() {
  const { queueLength, isSyncing } = useSyncQueue();
  const { pendingModalNotification, dismissModal } = useBroadcastNotifications();
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Reset scroll position and lock body scroll
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    
    // Lock body scroll to ensure internal scrolling works as expected
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row bg-background font-sans h-[100dvh] w-full overflow-hidden">
      <OfflineIndicator pendingCount={queueLength} isSyncing={isSyncing} />
      <AccessChangeNotification />
      <TrialStartedModal />
      <PlanExpiredModal />
      <BroadcastModal notification={pendingModalNotification} onDismiss={dismissModal} />
      <MobileHeader />
      <ScrollToTop />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0 h-full sticky top-0 z-40">
        <Sidebar />
      </div>

      {/* Scrollable Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto pt-20 md:pt-0">
        <main 
          ref={mainContentRef}
          className="w-full relative px-4 md:px-0 flex-1 flex flex-col h-full"
        >
          <TrialStatusBanner />
          <div className="w-full h-full flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
