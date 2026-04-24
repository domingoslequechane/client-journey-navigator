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
import { cn } from '@/lib/utils';

export function AppLayout() {
  const { queueLength, isSyncing } = useSyncQueue();
  const { pendingModalNotification, dismissModal } = useBroadcastNotifications();
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Reset scroll position on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    document.body.style.overflow = '';
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex flex-col md:flex-row bg-background font-sans min-h-[100dvh] w-full">
      <OfflineIndicator pendingCount={queueLength} isSyncing={isSyncing} />
      <AccessChangeNotification />
      <TrialStartedModal />
      <PlanExpiredModal />
      <BroadcastModal notification={pendingModalNotification} onDismiss={dismissModal} />
      <MobileHeader />
      <ScrollToTop />
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:block shrink-0 h-screen sticky top-0 z-40 overflow-hidden">
        <Sidebar />
      </aside>

      {/* Scrollable Main Content Area */}
      <div className="flex-1 flex flex-col pt-20 md:pt-0 h-[100dvh] overflow-hidden">
        <main 
          ref={mainContentRef}
          className="w-full relative px-4 md:px-0 flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
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
