import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlatformIcon } from './PlatformIcon';
import { ConfirmActionModal } from './ConfirmActionModal';
import { type SocialAccount } from '@/hooks/useSocialAccounts';
import { type SocialPlatform, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { Unplug, RefreshCw, User, Calendar, Lock, AlertCircle, FileEdit, Loader2, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface AccountManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SocialAccount | null;
  onDisconnect: (id: string) => void;
  onSync: () => void;
  isSyncing?: boolean;
}

interface FacebookPage {
  id: string;
  name: string;
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
  const [fbPages, setFbPages] = useState<FacebookPage[] | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [savingPage, setSavingPage] = useState(false);
  const queryClient = useQueryClient();

  if (!account) return null;

  const platform = account.platform as SocialPlatform;
  const config = PLATFORM_CONFIG[platform];
  const isLocked = account.is_social_locked;
  const disconnectCount = account.social_disconnection_count || 0;
  const isFacebook = platform === 'facebook';

  const handleDisconnect = () => {
    onDisconnect(account.id);
    setConfirmDisconnect(false);
    onOpenChange(false);
  };

  const handleLoadFbPages = async () => {
    setLoadingPages(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-pages', {
        body: { account_id: account.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Late API returns { pages: [...] } or an array directly
      const pages: FacebookPage[] = Array.isArray(data) ? data : (data.pages || data.data || []);
      setFbPages(pages);
      // Pre-select the already saved one
      if (account.facebook_page_id) setSelectedPageId(account.facebook_page_id);
    } catch (err: any) {
      toast.error('Erro ao buscar páginas: ' + err.message);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleSavePage = async () => {
    if (!selectedPageId) return;
    setSavingPage(true);
    try {
      const { data, error } = await supabase.functions.invoke('facebook-pages', {
        body: { account_id: account.id, facebook_page_id: selectedPageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Página do Facebook guardada!');
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao guardar página: ' + err.message);
    } finally {
      setSavingPage(false);
    }
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
                  Activo
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Account info */}
            <div className="rounded-xl border border-border p-5 space-y-4 bg-muted/5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {account.avatar_url ? (
                    <img src={account.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-sm" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-background shadow-sm">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1">
                    <PlatformIcon platform={platform} variant="circle" size="sm" className="border-2 border-background shadow-sm" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate leading-tight">{account.account_name}</p>
                  {account.username && (
                    <p className="text-sm text-muted-foreground">@{account.username}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Seguidores</span>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold">{(account.followers_count || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Conectado em</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-sm">{format(parseISO(account.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Facebook Page Picker */}
            {isFacebook && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-semibold">Página do Facebook</p>
                </div>

                {account.facebook_page_id && !fbPages && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <span>Página configurada (ID: {account.facebook_page_id})</span>
                  </div>
                )}
                {!account.facebook_page_id && !fbPages && (
                  <p className="text-xs text-muted-foreground">
                    Configure qual página do Facebook será usada ao publicar posts.
                  </p>
                )}

                {!fbPages && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-blue-500/30 hover:bg-blue-500/10"
                    onClick={handleLoadFbPages}
                    disabled={loadingPages}
                  >
                    {loadingPages ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileEdit className="h-4 w-4" />}
                    {account.facebook_page_id ? 'Alterar página' : 'Selecionar página'}
                  </Button>
                )}

                {fbPages && (
                  <div className="space-y-3">
                    {fbPages.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma página encontrada nesta conta.</p>
                    ) : (
                      <>
                        <Select value={selectedPageId} onValueChange={setSelectedPageId}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Selecione uma página..." />
                          </SelectTrigger>
                          <SelectContent>
                            {fbPages.map((page) => (
                              <SelectItem key={page.id} value={page.id}>
                                {page.name} ({page.id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          onClick={handleSavePage}
                          disabled={!selectedPageId || savingPage}
                        >
                          {savingPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Guardar página
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

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