import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from './PlatformIcon';
import { type SocialPlatform, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { CheckCircle2, ExternalLink, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectPlatformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: SocialPlatform | null;
  onConnect: (platform: SocialPlatform, viaMeta?: boolean) => void;
  isConnecting?: boolean;
}

const META_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook'];

const PLATFORM_INSTRUCTIONS: Partial<Record<SocialPlatform, { steps: string[] }>> = {
  instagram: {
    steps: [
      'Faça login no Instagram em uma nova aba do seu navegador com a conta que deseja gerenciar.',
      'Permita que a plataforma gerencie a sua conta quando solicitado.',
      'Finalize o processo de conexão selecionando a conta desejada.',
    ],
  },
  facebook: {
    steps: [
      'Faça login no Facebook em uma nova aba com a conta que administra as páginas.',
      'Permita o acesso às páginas e contas que deseja gerenciar.',
      'Selecione as páginas do Facebook que deseja conectar.',
    ],
  },
  linkedin: {
    steps: [
      'Faça login no LinkedIn com sua conta profissional.',
      'Autorize o acesso à sua página ou perfil.',
      'Selecione a página da empresa que deseja gerenciar.',
    ],
  },
  tiktok: {
    steps: [
      'Faça login na sua conta TikTok em uma nova aba.',
      'Autorize o gerenciamento da sua conta.',
      'Confirme a conexão para começar a publicar.',
    ],
  },
  twitter: {
    steps: [
      'Faça login no X (Twitter) com a conta que deseja conectar.',
      'Autorize o acesso de leitura e escrita.',
      'Confirme a conexão.',
    ],
  },
  youtube: {
    steps: [
      'Faça login na sua conta Google/YouTube.',
      'Selecione o canal que deseja gerenciar.',
      'Autorize o acesso ao canal para publicação.',
    ],
  },
  pinterest: {
    steps: [
      'Faça login na sua conta Pinterest.',
      'Autorize o acesso ao seu perfil e painéis.',
      'Confirme a conexão.',
    ],
  },
  threads: {
    steps: [
      'Faça login no Threads com sua conta Instagram.',
      'Autorize o gerenciamento da conta.',
      'Confirme a conexão.',
    ],
  },
};

export function ConnectPlatformModal({
  open,
  onOpenChange,
  platform,
  onConnect,
  isConnecting,
}: ConnectPlatformModalProps) {
  const [connectMode, setConnectMode] = useState<'direct' | 'meta' | null>(null);

  if (!platform) return null;

  const config = PLATFORM_CONFIG[platform];
  const instructions = PLATFORM_INSTRUCTIONS[platform];
  const isMetaPlatform = META_PLATFORMS.includes(platform);

  const handleConnect = () => {
    onConnect(platform, connectMode === 'meta');
  };

  const handleClose = (v: boolean) => {
    if (!v) setConnectMode(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <PlatformIcon platform={platform} size="lg" />
            Conectar o {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection mode for Meta platforms */}
          {isMetaPlatform && !connectMode && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Escolha como deseja conectar:</p>
              <button
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                onClick={() => setConnectMode('direct')}
              >
                <PlatformIcon platform={platform} size="lg" />
                <div>
                  <p className="font-medium text-sm">Conexão direta</p>
                  <p className="text-xs text-muted-foreground">Conecte uma única conta do {config.label}</p>
                </div>
              </button>
              <button
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                onClick={() => setConnectMode('meta')}
              >
                <div className="w-10 h-10 rounded-full bg-[hsl(220,70%,50%)]/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-[hsl(220,70%,50%)]" />
                </div>
                <div>
                  <p className="font-medium text-sm">Entrar com Meta Business Suite</p>
                  <p className="text-xs text-muted-foreground">
                    Conecte todas as páginas e contas de uma BM do Facebook
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Instructions (shown after selecting mode or for non-meta platforms) */}
          {(!isMetaPlatform || connectMode) && instructions && (
            <div className="space-y-4">
              {connectMode === 'meta' && (
                <div className="rounded-lg bg-[hsl(220,70%,50%)]/5 border border-[hsl(220,70%,50%)]/20 p-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[hsl(220,70%,50%)]" />
                    Meta Business Suite
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ao conectar via Meta Business Suite, todas as páginas e contas da sua BM serão importadas automaticamente.
                  </p>
                </div>
              )}

              {instructions.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <p className="text-sm">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => {
            if (connectMode && isMetaPlatform) {
              setConnectMode(null);
            } else {
              handleClose(false);
            }
          }}>
            {connectMode && isMetaPlatform ? 'Voltar' : 'Cancelar'}
          </Button>
          {(!isMetaPlatform || connectMode) && (
            <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Continuar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
