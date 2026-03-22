import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  useEffect(() => {
    if (needRefresh) {
      toast.info('Nova atualização disponível!', {
        description: 'Clique para atualizar e ver as novas funcionalidades.',
        action: {
          label: 'Atualizar Agora',
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity,
        position: 'bottom-right',
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
      });
    }

    if (offlineReady) {
      toast.success('App pronto para uso offline!');
    }
  }, [needRefresh, offlineReady, updateServiceWorker]);

  return null;
}
