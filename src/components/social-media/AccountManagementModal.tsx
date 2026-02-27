import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from './PlatformIcon';
import { ConfirmActionModal } from './ConfirmActionModal';
import { type SocialAccount } from '@/hooks/useSocialAccounts';
import { type SocialPlatform, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { Unplug, RefreshCw, User, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccountManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SocialAccount | null;
  onDisconnect: (id: string) => void;
  onSync: () => void;
  isSyncing?: boolean;
}

export function AccountManagementModal({
  open,
  onOpenChange,
  account,
  onDisconnect,
  onSync,
  isSyncing,
}: AccountManagementModalProps) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  if (!account) return null;

  const platform = account.platform as SocialPlatform;
  const config = PLATFORM_CONFIG[platform];

  const handleDisconnect = () => {
    onDisconnect(account.id);
    setConfirmDisconnect(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <PlatformIcon platform={platform} size="lg" />
              <div>
                <span>{config.label}</span>
                <Badge variant="outline" className="ml-2 text-[10px] border-[hsl(var(--success))] text-[hsl(var(--success))]">
                  CONECTADO
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Account info */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                {account.avatar_url ? (
                  <img src={account.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{account.account_name}</p>
                  {account.username && (
                    <p className="text-sm text-muted-foreground">@{account.username}</p>
                  )}
                </div>
              </div>

              {account.followers_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{account.followers_count.toLocaleString()} seguidores</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Conectado em {format(parseISO(account.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </div>

              
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={onSync}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar dados
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDisconnect(true)}
              >
                <Unplug className="h-4 w-4" />
                Desconectar conta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Desconectar conta"
        description={`Tem certeza que deseja desconectar a conta "${account.account_name}" do ${config.label}? Você não poderá mais publicar ou agendar posts para esta conta até reconectá-la.`}
        confirmLabel="Desconectar"
        variant="destructive"
        onConfirm={handleDisconnect}
      />
    </>
  );
}
