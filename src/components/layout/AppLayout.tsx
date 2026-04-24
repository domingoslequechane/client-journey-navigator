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

  const isNativeScroll = location.pathname.includes('/social-media');

  // Reset scroll position and lock body scroll
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    
    if (!isNativeScroll) {
      // Lock body scroll to ensure internal scrolling works as expected
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    } else {
      document.body.style.overflow = '';
      window.scrollTo(0, 0);
    }
  }, [location.pathname, isNativeScroll]);

  return (
    <div className={cn(
      "flex flex-col md:flex-row bg-background font-sans w-full",
      !isNativeScroll ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]"
    )}>
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
      <div className={cn(
        "flex-1 flex flex-col pt-20 md:pt-0",
        !isNativeScroll ? "h-full overflow-y-auto" : ""
      )}>
        <main 
          ref={mainContentRef}
          className={cn(
            "w-full relative px-4 md:px-0 flex-1 flex flex-col",
            !isNativeScroll ? "h-full" : ""
          )}
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
