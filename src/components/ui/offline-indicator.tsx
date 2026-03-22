import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  pendingCount?: number;
  isSyncing?: boolean;
}

export function OfflineIndicator({ pendingCount = 0, isSyncing = false }: OfflineIndicatorProps) {
  const { isOnline, justReconnected } = useOnlineStatus();

  // Don't show anything if online and not just reconnected and not syncing
  if (isOnline && !justReconnected && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300',
        !isOnline && 'bg-amber-500/90 text-amber-950',
        justReconnected && !isSyncing && 'bg-green-500/90 text-green-950',
        isSyncing && 'bg-blue-500/90 text-blue-950'
      )}
    >
      {!isOnline && (
        <>
          <WifiOff className="h-4 w-4" />
          <span>
            Desconectado - seus dados estão salvos localmente
            {pendingCount > 0 && ` (${pendingCount} ${pendingCount === 1 ? 'item pendente' : 'itens pendentes'})`}
          </span>
        </>
      )}
      
      {isOnline && isSyncing && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Sincronizando dados...</span>
        </>
      )}
      
      {isOnline && justReconnected && !isSyncing && (
        <>
          <CheckCircle2 className="h-4 w-4" />
          <span>Reconectado</span>
        </>
      )}
    </div>
  );
}
