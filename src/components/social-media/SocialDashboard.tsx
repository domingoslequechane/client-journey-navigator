import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Loader2, RefreshCw } from 'lucide-react';
import { PLATFORM_CONFIG, ALL_PLATFORMS, type SocialPlatform } from '@/lib/social-media-mock';
import { useSocialAccounts, type SocialAccount } from '@/hooks/useSocialAccounts';
import { useSocialPosts } from '@/hooks/useSocialPosts';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '@/lib/utils';

export function SocialDashboard() {
  const { accounts, isLoading: loadingAccounts, deleteAccount, connectPlatform, syncAccounts } = useSocialAccounts();
  const { posts, isLoading: loadingPosts } = useSocialPosts();

  // Build account map by platform
  const accountsByPlatform = new Map<SocialPlatform, SocialAccount>();
  accounts.forEach(a => accountsByPlatform.set(a.platform as SocialPlatform, a));

  const connectedAccounts = accounts.filter(a => a.is_connected);
  const disconnectedPlatforms = ALL_PLATFORMS.filter(p => !accountsByPlatform.has(p));

  // Stats from real posts
  const totalFollowers = connectedAccounts.reduce((sum, a) => sum + (a.followers_count || 0), 0);
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled' || p.status === 'approved').length;
  const pendingCount = posts.filter(p => p.status === 'pending_approval').length;

  const handleConnect = (platform: SocialPlatform) => {
    connectPlatform.mutate(platform);
  };

  const handleDisconnect = (id: string) => {
    deleteAccount.mutate(id);
  };

  const handleSync = () => {
    syncAccounts.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Connected accounts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Contas sociais do perfil</h2>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSync}
            disabled={syncAccounts.isPending}
          >
            <RefreshCw className={cn("h-4 w-4", syncAccounts.isPending && "animate-spin")} />
            Sincronizar
          </Button>
        </div>
        {loadingAccounts ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {connectedAccounts.map(account => (
              <ConnectedAccountCard key={account.id} account={account} onDisconnect={() => handleDisconnect(account.id)} />
            ))}
            {disconnectedPlatforms.map(platform => (
              <DisconnectedAccountCard
                key={platform}
                platform={platform}
                onConnect={() => handleConnect(platform)}
                isConnecting={connectPlatform.isPending}
              />
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}

function ConnectedAccountCard({ account, onDisconnect }: { account: SocialAccount; onDisconnect: () => void }) {
  const platform = account.platform as SocialPlatform;
  return (
    <Card className="overflow-hidden">
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
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 shrink-0" onClick={onDisconnect}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      <CardContent className="p-3">
        <Badge variant="outline" className="text-[10px] border-[hsl(var(--success))] text-[hsl(var(--success))]">
          CONECTADO
        </Badge>
        {account.username && (
          <p className="text-xs text-muted-foreground mt-1">{account.username}</p>
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

function DisconnectedAccountCard({ platform, onConnect, isConnecting }: { platform: SocialPlatform; onConnect: () => void; isConnecting: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center p-6 text-center">
      <PlatformIcon platform={platform} size="lg" />
      <p className="text-sm font-medium mt-2">{PLATFORM_CONFIG[platform].label}</p>
      <Button variant="default" size="sm" className="mt-3 text-xs" onClick={onConnect} disabled={isConnecting}>
        {isConnecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        Conectar
      </Button>
    </Card>
  );
}
