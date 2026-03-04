import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
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

  const accountsByPlatform = new Map<SocialPlatform, SocialAccount>();
  // Ordenamos para que as contas conectadas venham por último e sobrescrevam as desconectadas no Map
  [...accounts]
    .sort((a, b) => (a.is_connected === b.is_connected ? 0 : a.is_connected ? 1 : -1))
    .forEach(a => accountsByPlatform.set(a.platform as SocialPlatform, a));

  const totalFollowers = accounts.filter(a => a.is_connected).reduce((sum, a) => sum + (a.followers_count || 0), 0);
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
      // 1. Apagar todos os posts do cliente
      await deleteAllPosts.mutateAsync(clientId);
      
      // 2. Desconectar todas as contas (iterar sobre as contas e deletar)
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
    <div className="space-y-6">
      {selectedClient === 'all' && (
        <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione uma marca específica acima para gerenciar conexões e ver métricas detalhadas.
          </p>
        </div>
      )}

      {selectedClient !== 'all' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Canais Conectados</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={() => setResetModalOpen(true)}
              disabled={isResetting || (accounts.length === 0 && posts.length === 0)}
            >
              {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Resetar Dados
            </Button>
          </div>
          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando canais...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {ALL_PLATFORMS.map(platform => {
                const account = accountsByPlatform.get(platform);
                if (account && account.is_connected) {
                  return (
                    <ConnectedAccountCard
                      key={account.id}
                      account={account}
                      onManage={() => setManagingAccount(account)}
                    />
                  );
                }
                return (
                  <DisconnectedAccountCard
                    key={platform}
                    platform={platform}
                    onConnect={() => setConnectingPlatform(platform)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Resumo Rápido {selectedClient === 'all' ? '(Geral)' : ''}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalFollowers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Seguidores totais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{publishedCount}</p>
              <p className="text-xs text-muted-foreground">Posts publicados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[hsl(var(--info))]">{scheduledCount}</p>
              <p className="text-xs text-muted-foreground">Agendados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-[hsl(var(--warning))]">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
            </CardContent>
          </Card>
        </div>
      </div>

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
    <Card className="overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={onManage}>
      <div className={cn(
        "h-20 flex items-center justify-between px-4",
        platform === 'instagram'
          ? 'bg-gradient-to-br from-[hsl(280,70%,50%)] via-[hsl(330,80%,55%)] to-[hsl(30,90%,55%)]'
          : platform === 'facebook'
          ? 'bg-[hsl(220,70%,50%)]'
          : platform === 'linkedin'
          ? 'bg-[hsl(210,80%,40%)]'
          : platform === 'youtube'
          ? 'bg-[hsl(0,80%,50%)]'
          : 'bg-primary'
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <PlatformIcon platform={platform} size="lg" className="text-primary-foreground shrink-0" />
          <span className="text-sm font-medium text-primary-foreground truncate">{account.account_name}</span>
        </div>
      </div>
      <CardContent className="p-3">
        <Badge variant="outline" className="text-[10px] border-[hsl(var(--success))] text-[hsl(var(--success))]">
          Activo
        </Badge>
        {account.username && (
          <p className="text-xs text-muted-foreground mt-1">@{account.username}</p>
        )}
        {account.followers_count > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {account.followers_count.toLocaleString()} seguidores
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DisconnectedAccountCard({ platform, onConnect }: { platform: SocialPlatform; onConnect: () => void }) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="h-20 flex items-center justify-between px-4 bg-muted/30 grayscale opacity-60">
        <div className="flex items-center gap-2 min-w-0">
          <PlatformIcon platform={platform} size="lg" className="text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground truncate">{PLATFORM_CONFIG[platform].label}</span>
        </div>
      </div>
      <CardContent className="p-3 flex flex-col flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Inactivo
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary" onClick={onConnect}>
            Conectar
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
          Nenhuma conta conectada para esta plataforma.
        </p>
      </CardContent>
    </Card>
  );
}