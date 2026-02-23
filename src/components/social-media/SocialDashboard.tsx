import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MOCK_ACCOUNTS, PLATFORM_CONFIG, type ConnectedAccount } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '@/lib/utils';

export function SocialDashboard() {
  const connectedAccounts = MOCK_ACCOUNTS.filter(a => a.connected);
  const disconnectedAccounts = MOCK_ACCOUNTS.filter(a => !a.connected);

  return (
    <div className="space-y-6">
      {/* Connected accounts header */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Contas sociais do perfil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {connectedAccounts.map(account => (
            <ConnectedAccountCard key={account.id} account={account} />
          ))}
          {disconnectedAccounts.map(account => (
            <DisconnectedAccountCard key={account.id} account={account} />
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Resumo Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">21.380</p>
              <p className="text-xs text-muted-foreground">Seguidores totais</p>
              <p className="text-xs text-[hsl(var(--success))] mt-1">+3.2% este mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">83</p>
              <p className="text-xs text-muted-foreground">Posts publicados</p>
              <p className="text-xs text-muted-foreground mt-1">últimos 30 dias</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">3.4%</p>
              <p className="text-xs text-muted-foreground">Eng. médio</p>
              <p className="text-xs text-[hsl(var(--success))] mt-1">+0.5% vs anterior</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">Posts agendados</p>
              <p className="text-xs text-muted-foreground mt-1">próximos 7 dias</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ConnectedAccountCard({ account }: { account: ConnectedAccount }) {
  return (
    <Card className="overflow-hidden">
      <div className={cn(
        "h-20 flex items-center justify-between px-4",
        account.platform === 'instagram'
          ? 'bg-gradient-to-br from-[hsl(280,70%,50%)] via-[hsl(330,80%,55%)] to-[hsl(30,90%,55%)]'
          : account.platform === 'facebook'
          ? 'bg-[hsl(220,70%,50%)]'
          : 'bg-primary'
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <PlatformIcon platform={account.platform} size="lg" className="text-primary-foreground shrink-0" />
          <span className="text-sm font-medium text-primary-foreground truncate">{account.accountName}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 shrink-0">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      <CardContent className="p-3">
        <Badge variant="outline" className="text-[10px] border-[hsl(var(--success))] text-[hsl(var(--success))]">
          CONECTADO
        </Badge>
        {account.followers && (
          <p className="text-xs text-muted-foreground mt-1">
            {account.followers.toLocaleString()} seguidores
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DisconnectedAccountCard({ account }: { account: ConnectedAccount }) {
  return (
    <Card className="flex flex-col items-center justify-center p-6 text-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="absolute top-2 right-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Conecte sua conta do {PLATFORM_CONFIG[account.platform].label}</p>
        </TooltipContent>
      </Tooltip>
      <PlatformIcon platform={account.platform} size="lg" />
      <p className="text-sm font-medium mt-2">{PLATFORM_CONFIG[account.platform].label}</p>
      <Button variant="default" size="sm" className="mt-3 text-xs">
        Conectar
      </Button>
    </Card>
  );
}
