import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PLATFORM_CONFIG, ALL_PLATFORMS, type SocialPlatform } from '@/lib/social-media-mock';
import { useSocialAccounts, type SocialAccount } from '@/hooks/useSocialAccounts';
import { useSocialPosts } from '@/hooks/useSocialPosts';
import { PlatformIcon } from './PlatformIcon';
import { AccountManagementModal } from './AccountManagementModal';
import { ConnectPlatformModal } from './ConnectPlatformModal';
import { cn } from '@/lib/utils';

interface SocialDashboardProps {
  selectedClient: string;
}

export function SocialDashboard({ selectedClient }: SocialDashboardProps) {
  const clientId = selectedClient !== 'all' ? selectedClient : undefined;
  const { accounts, isLoading: loadingAccounts, deleteAccount, connectPlatform, syncAccounts } = useSocialAccounts(clientId);
  const { posts } = useSocialPosts();

  const [managingAccount, setManagingAccount] = useState<SocialAccount | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<SocialPlatform | null>(null);

  const accountsByPlatform = new Map<SocialPlatform, SocialAccount>();
  accounts.forEach(a => accountsByPlatform.set(a.platform as SocialPlatform, a));

  const connectedAccounts = accounts.filter(a => a.is_connected);
  const disconnectedPlatforms = ALL_PLATFORMS.filter(p => !accountsByPlatform.has(p));

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

  return (
    <div className="space-y-6">
      {selectedClient === 'all' && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione um cliente para gerenciar suas contas de redes sociais.
            Só é possível conectar redes de clientes registrados.
          </p>
        </div>
      )}

      {selectedClient !== 'all' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Contas sociais do cliente</h2>
          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {connectedAccounts.map(account => (
                <ConnectedAccountCard
                  key={account.id}
                  account={account}
                  onManage={() => setManagingAccount(account)}
                />
              ))}
              {disconnectedPlatforms.map(platform => (
                <DisconnectedAccountCard
                  key={platform}
                  platform={platform}
                  onConnect={() => setConnectingPlatform(platform)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Resumo Rápido</h2>
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
          CONECTADO
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
    <Card className="flex flex-col items-center justify-center p-6 text-center">
      <PlatformIcon platform={platform} size="lg" />
      <p className="text-sm font-medium mt-2">{PLATFORM_CONFIG[platform].label}</p>
      <Button variant="default" size="sm" className="mt-3 text-xs" onClick={onConnect}>
        Conectar
      </Button>
    </Card>
  );
}
