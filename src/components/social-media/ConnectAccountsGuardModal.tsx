import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlatformIcon } from './PlatformIcon';
import { ALL_PLATFORMS, PLATFORM_CONFIG, type SocialPlatform } from '@/lib/social-media-mock';
import { WifiOff } from 'lucide-react';

interface ConnectAccountsGuardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectPlatform: (platform: SocialPlatform) => void;
  onGoToDashboard: () => void;
}

export function ConnectAccountsGuardModal({ open, onOpenChange, onConnectPlatform, onGoToDashboard }: ConnectAccountsGuardModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-2">
            <WifiOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <DialogTitle>Nenhuma conta conectada</DialogTitle>
          <DialogDescription className="text-center">
            Para criar posts, primeiro conecte pelo menos uma rede social deste cliente. Selecione uma plataforma abaixo para conectar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {ALL_PLATFORMS.map(platform => (
            <Button
              key={platform}
              variant="outline"
              className="flex items-center gap-2 h-12 justify-start"
              onClick={() => {
                onOpenChange(false);
                onConnectPlatform(platform);
              }}
            >
              <PlatformIcon platform={platform} size="sm" />
              <span className="text-sm">{PLATFORM_CONFIG[platform].label}</span>
            </Button>
          ))}
        </div>

        <Button variant="secondary" className="w-full mt-2" onClick={() => { onOpenChange(false); onGoToDashboard(); }}>
          Ir para Dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}
