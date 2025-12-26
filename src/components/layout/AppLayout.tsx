import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { useSyncQueue } from '@/hooks/useSyncQueue';

export function AppLayout() {
  const { queueLength, isSyncing } = useSyncQueue();

  return (
    <div className="flex h-screen bg-background">
      <OfflineIndicator pendingCount={queueLength} isSyncing={isSyncing} />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <main 
        className="flex-1 overflow-auto pb-20 md:pb-0"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Outlet />
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
