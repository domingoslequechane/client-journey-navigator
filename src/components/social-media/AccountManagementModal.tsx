import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from './PlatformIcon';
import { ConfirmActionModal } from './ConfirmActionModal';
import { type SocialAccount } from '@/hooks/useSocialAccounts';
import { type SocialPlatform, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { Unplug, RefreshCw, User, Calendar, Lock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  const isLocked = account.is_social_locked;
  const disconnectCount = account.social_disconnection_count || 0;

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

            {/* Disconnection Limit Info */}
            <div className={cn(
              "p-3 rounded-lg border text-xs space-y-2",
              isLocked ? "bg-destructive/5 border-destructive/20" : "bg-muted/50 border-border"
            )}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Desconexões realizadas:</span>
                <Badge variant={isLocked ? "destructive" : "outline"} className="text-[10px]">
                  {disconnectCount} / 3
                </Badge>
              </div>
              
              {isLocked ? (
                <div className="flex items-start gap-2 text-destructive">
                  <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>Limite de desconexões atingido. Esta conta não pode mais ser removida para liberar o slot de cliente.</p>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>Você pode desconectar contas até 3 vezes por cliente. Após isso, o slot ficará travado.</p>
                </div>
              )}
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
                className={cn(
                  "w-full justify-start gap-3",
                  !isLocked && "text-destructive hover:text-destructive hover:bg-destructive/10"
                )}
                onClick={() => setConfirmDisconnect(true)}
                disabled={isLocked}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unplug className="h-4 w-4" />}
                {isLocked ? "Desconexão bloqueada" : "Desconectar conta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Desconectar conta"
        description={`Tem certeza que deseja desconectar a conta "${account.account_name}" do ${config.label}? Esta ação contará como uma das 3 desconexões permitidas para este cliente.`}
        confirmLabel="Desconectar"
        variant="destructive"
        onConfirm={handleDisconnect}
      />
    </>
  );
}