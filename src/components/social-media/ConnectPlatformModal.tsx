import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlatformIcon } from './PlatformIcon';
import { type SocialPlatform, PLATFORM_CONFIG } from '@/lib/social-media-mock';
import { ExternalLink, Loader2 } from 'lucide-react';

interface ConnectPlatformModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: SocialPlatform | null;
  onConnect: (platform: SocialPlatform, viaMeta?: boolean) => void;
  isConnecting?: boolean;
}

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
  if (!platform) return null;

  const config = PLATFORM_CONFIG[platform];
  const instructions = PLATFORM_INSTRUCTIONS[platform];

  const handleConnect = () => {
    onConnect(platform, false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <PlatformIcon platform={platform} size="lg" />
            Conectar o {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {instructions && (
            <div className="space-y-4">
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}