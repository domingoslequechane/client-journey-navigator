import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from './useOnlineStatus';

interface SyncOperation {
  id: string;
  type: 'create' | 'update';
  table: string;
  data: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'sync_queue';
const MAX_RETRIES = 3;

export function useSyncQueue() {
  const [queue, setQueue] = useState<SyncOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const processingRef = useRef(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load sync queue:', error);
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.warn('Failed to save sync queue:', error);
    }
  }, [queue]);

  const addToQueue = useCallback((operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>) => {
    const newOp: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    setQueue(prev => [...prev, newOp]);
    return newOp.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(op => op.id !== id));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0) return;
    
    processingRef.current = true;
    setIsSyncing(true);

    const results: { success: number; failed: number } = { success: 0, failed: 0 };

    for (const operation of queue) {
      try {
        if (operation.type === 'create') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from(operation.table)
            .insert(operation.data);
          
          if (error) throw error;
        } else if (operation.type === 'update') {
          const { id, ...updateData } = operation.data;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from(operation.table)
            .update(updateData)
            .eq('id', id as string);
          
          if (error) throw error;
        }

        removeFromQueue(operation.id);
        results.success++;
      } catch (error) {
        console.error('Sync failed for operation:', operation.id, error);
        results.failed++;
        
        // Update retry count
        setQueue(prev => prev.map(op => 
          op.id === operation.id 
            ? { ...op, retryCount: op.retryCount + 1 }
            : op
        ));

        // Remove if max retries exceeded
        if (operation.retryCount >= MAX_RETRIES) {
          removeFromQueue(operation.id);
          toast({
            title: 'Erro na sincronização',
            description: `Não foi possível sincronizar após ${MAX_RETRIES} tentativas.`,
            variant: 'destructive',
          });
        }
      }
    }

    if (results.success > 0) {
      toast({
        title: 'Sincronização concluída',
        description: `${results.success} ${results.success === 1 ? 'item sincronizado' : 'itens sincronizados'} com sucesso.`,
      });
    }

    setIsSyncing(false);
    processingRef.current = false;
  }, [queue, removeFromQueue, toast]);

  // Auto-sync when coming back online
  const { isOnline } = useOnlineStatus({
    onReconnect: () => {
      if (queue.length > 0) {
        processQueue();
      }
    },
  });

  return {
    queue,
    queueLength: queue.length,
    isSyncing,
    isOnline,
    addToQueue,
    removeFromQueue,
    processQueue,
  };
}
