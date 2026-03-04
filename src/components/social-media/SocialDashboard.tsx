import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Plus, RefreshCw, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { PLATFORM_CONFIG, ALL_PLATFORMS, type SocialPlatform } from '@/lib/social-media-mock';
import { useSocialAccounts, type SocialAccount } from '@/hooks/useSocialAccounts';
import { useSocialPosts } from '@/hooks/useSocialPosts';
import { PlatformIcon } from './PlatformIcon';
import { AccountManagementModal } from './AccountManagementModal';
import { ConnectPlatformModal } from './ConnectPlatformModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SocialDashboardProps {
  selectedClient: string;
}

export function SocialDashboard({ selectedClient }: SocialDashboardProps) {
  const clientId = selectedClient !== 'all' ? selectedClient : undefined;
  
  const { accounts, isLoading: loadingAccounts, deleteAccount, connectPlatform, syncAccounts } = useSocialAccounts(clientId);
  const { posts, isLoading: loadingPosts, deleteAllPosts } = useSocialPosts({ clientId });

  const [managingAccount, setManagingAccount] = useState<SocialAccount | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const connectedAccounts = accounts.filter(a => a.is_connected);
  const connectedPlatforms = new Set(connectedAccounts.map(a => a.platform));
  const availablePlatforms = ALL_PLATFORMS.filter(p => !connectedPlatforms.has(p));

  const totalFollowers = connectedAccounts.reduce((sum, a) => sum + (a.followers_count || 0), 0);
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled' || p.status === 'approved').length;
  const pendingCount = posts.filter(p => p.status === 'pending_approval').length;

  const handleConnect = (platform: SocialPlatform) => {
    setConnectingPlatform(null);
    if (clientId) {
      connectPlatform.mutate({ platform, clientId });
    }
  };

  const handleDisconnect = (id: string) => {
    deleteAccount.mutate(id);
  };

  const handleSync = () => {
    syncAccounts.mutate(clientId);
  };

  const handleResetData = async () => {
    if (!clientId) {
      toast.error('Selecione um cliente para resetar');
      return;
    }
    
    setIsResetting(true);
    try {
      await deleteAllPosts.mutateAsync(clientId);
      for (const account of accounts) {
        try {
          await deleteAccount.mutateAsync(account.id);
        } catch (err) {
          console.error(`Erro ao remover conta ${account.id}:`, err);
        }
      }
      toast.success('Todos os dados e conexões foram resetados com sucesso!');
      setResetModalOpen(false);
    } catch (error) {
      console.error('Erro no reset:', error);
      toast.error('Erro ao resetar dados. Tente novamente.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      {selectedClient === 'all' && (
        <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione uma marca específica acima para gerenciar conexões e ver métricas detalhadas.
          </p>
        </div>
      )}

      {selectedClient !== 'all' && (
        <div className="space-y-8">
          {/* Connected Channels Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Canais Conectados</h2>
                <p className="text-sm text-muted-foreground">Gerencie suas contas ativas e sincronize dados.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleSync}
                  disabled={syncAccounts.isPending || connectedAccounts.length === 0}
                >
                  <RefreshCw className={cn("h-4 w-4", syncAccounts.isPending && "animate-spin")} />
                  Sincronizar
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                  onClick={() => setResetModalOpen(true)}
                  disabled={isResetting || (accounts.length === 0 && posts.length === 0)}
                >
                  {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Resetar
                </Button>
              </div>
            </div>

            {loadingAccounts ? (
              <div className="flex flex-col items-center justify-center py-12 border rounded-xl bg-muted/10 border-dashed">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-medium">Carregando canais...</p>
              </div>
            ) : connectedAccounts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {connectedAccounts.map(account => (
                  <ConnectedAccountCard
                    key={account.id}
                    account={account}
                    onManage={() => setManagingAccount(account)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 border rounded-xl bg-muted/10 border-dashed text-center px-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg">Nenhum canal conectado</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                  Conecte suas redes sociais abaixo para começar a agendar posts e ver métricas.
                </p>
              </div>
            )}
          </section>

          {/* Available Channels Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight">Canais Disponíveis</h2>
              <p className="text-sm text-muted-foreground">Conecte novas plataformas para expandir sua presença.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {availablePlatforms.map(platform => (
                <AvailablePlatformCard
                  key={platform}
                  platform={platform}
                  onConnect={() => setConnectingPlatform(platform)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Quick Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Resumo Rápido {selectedClient === 'all' ? '(Geral)' : ''}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold tracking-tight">{totalFollowers.toLocaleString()}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Seguidores totais</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold tracking-tight">{publishedCount}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Posts publicados</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold tracking-tight text-[hsl(var(--info))]">{scheduledCount}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Agendados</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold tracking-tight text-[hsl(var(--warning))]">{pendingCount}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">Aguardando aprovação</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <AccountManagementModal
        open={!!managingAccount}
        onOpenChange={(v) => !v && setManagingAccount(null)}
        account={managingAccount}
        onDisconnect={handleDisconnect}
        onSync={handleSync}
        isSyncing={syncAccounts.isPending}
      />

      <ConnectPlatformModal
        open={!!connectingPlatform}
        onOpenChange={(v) => !v && setConnectingPlatform(null)}
        platform={connectingPlatform}
        onConnect={handleConnect}
        isConnecting={connectPlatform.isPending}
      />

      <ConfirmActionModal
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        title="Resetar todos os dados?"
        description="Esta ação irá remover TODAS as conexões de redes sociais e TODOS os posts (publicados, agendados e rascunhos) deste cliente. Esta ação não pode ser desfeita."
        confirmLabel="Resetar Tudo"
        variant="destructive"
        onConfirm={handleResetData}
        loading={isResetting}
      />
    </div>
  );
}

function ConnectedAccountCard({ account, onManage }: { account: SocialAccount; onManage: () => void }) {
  const platform = account.platform as SocialPlatform;
  
  return (
    <Card 
      className="group relative overflow-hidden border-border/50 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
      onClick={onManage}
    >
      <div className={cn(
        "absolute top-0 left-0 w-full h-1",
        platform === 'instagram' ? 'bg-gradient-to-r from-[hsl(330,70%,50%)] to-[hsl(30,90%,55%)]' :
        platform === 'facebook' ? 'bg-[hsl(220,70%,50%)]' :
        platform === 'linkedin' ? 'bg-[hsl(210,80%,40%)]' :
        platform === 'youtube' ? 'bg-[hsl(0,80%,50%)]' :
        'bg-primary'
      )} />
      
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            {account.avatar_url ? (
              <img 
                src={account.avatar_url} 
                alt={account.account_name} 
                className="h-14 w-14 rounded-full object-cover border-2 border-background shadow-sm"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-background shadow-sm">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1">
              <PlatformIcon platform={platform} variant="circle" size="sm" className="border-2 border-background shadow-sm" />
            </div>
          </div>
          <Badge variant="outline" className="bg-success/5 text-success border-success/20 gap-1 py-0.5 px-2">
            <CheckCircle2 className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Ativo</span>
          </Badge>
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-base truncate leading-tight">{account.account_name}</h3>
          {account.username && (
            <p className="text-xs text-muted-foreground truncate">@{account.username}</p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Seguidores</span>
            <span className="text-sm font-bold">{(account.followers_count || 0).toLocaleString()}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Gerenciar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AvailablePlatformCard({ platform, onConnect }: { platform: SocialPlatform; onConnect: () => void }) {
  const config = PLATFORM_CONFIG[platform];
  
  return (
    <Card 
      className="group hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer border-dashed"
      onClick={onConnect}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-3">
        <div className="relative">
          <PlatformIcon platform={platform} size="lg" className="grayscale group-hover:grayscale-0 transition-all" />
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="h-3 w-3" />
          </div>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-bold truncate">{config.label}</p>
          <p className="text-[10px] text-muted-foreground">Conectar</p>
        </div>
      </CardContent>
    </Card>
  );
}