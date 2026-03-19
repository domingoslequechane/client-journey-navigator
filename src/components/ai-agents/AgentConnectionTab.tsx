import { useState, useEffect, useRef } from 'react';
import { Power, PowerOff, MessageCircle, Globe, Send, Smartphone, Lock, Loader2, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AIAgent } from '@/types';
import type { UseMutationResult } from '@tanstack/react-query';

interface AgentConnectionTabProps {
  agent: AIAgent;
  instanceAction: UseMutationResult<any, any, 'connect' | 'status' | 'disconnect', unknown>;
  updateConfig: UseMutationResult<AIAgent, any, Partial<AIAgent>, unknown>;
  onRefresh: () => void;
}

export function AgentConnectionTab({ agent, instanceAction, updateConfig, onRefresh }: AgentConnectionTabProps) {
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = agent.status === 'active';
  const isWhatsappConnected = agent.whatsapp_connected;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleToggleAgent = async () => {
    const newStatus = isActive ? 'paused' : 'active';
    try {
      await updateConfig.mutateAsync({ status: newStatus } as any);
    } catch {
      // Error handled by mutation
    }
  };

  const handleConnectWhatsapp = async () => {
    setConnecting(true);
    setQrCode(null);

    try {
      const result = await instanceAction.mutateAsync('connect');

      if (result.qrcode) {
        setQrCode(result.qrcode);
        // Start polling for connection status
        pollingRef.current = setInterval(async () => {
          try {
            const statusResult = await instanceAction.mutateAsync('status');
            if (statusResult.whatsapp_connected) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setQrCode(null);
              setConnecting(false);
              setWhatsappDialogOpen(false);
              toast.success('WhatsApp conectado com sucesso!');
              onRefresh();
            }
          } catch {
            // Ignore polling errors
          }
        }, 4000);
      } else if (result.status === 'connected' || result.owner) {
        toast.success('WhatsApp já está conectado!');
        setConnecting(false);
        setWhatsappDialogOpen(false);
        onRefresh();
      }
    } catch {
      setConnecting(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    try {
      await instanceAction.mutateAsync('disconnect');
      setWhatsappDialogOpen(false);
      onRefresh();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className={cn(
        'border-2 transition-colors',
        isActive ? 'border-emerald-500/30' : 'border-border'
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'p-3 rounded-xl',
                isActive ? 'bg-emerald-500/10' : 'bg-muted'
              )}>
                {isActive ? (
                  <Power className="h-6 w-6 text-emerald-500" />
                ) : (
                  <PowerOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isActive ? 'Agente Ativo' : 'Agente Pausado'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? 'O agente está respondendo automaticamente nos canais conectados'
                    : 'O agente está pausado e não responde a novas mensagens'}
                </p>
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggleAgent}
              disabled={updateConfig.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Channels */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Canais de Atendimento
        </h3>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {/* WhatsApp - Available */}
          <Card
            className={cn(
              'cursor-pointer hover:shadow-md transition-all',
              isWhatsappConnected && 'border-green-500/30'
            )}
            onClick={() => setWhatsappDialogOpen(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">WhatsApp</h4>
                    {isWhatsappConnected ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Conectado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Não conectado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isWhatsappConnected && agent.connected_number
                      ? `Conectado: ${agent.connected_number}`
                      : 'Conecte o agente ao WhatsApp Business do cliente'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instagram - Coming Soon */}
          <Card className="opacity-50 cursor-not-allowed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-pink-500/10 shrink-0">
                  <MessageCircle className="h-5 w-5 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">Instagram</h4>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      Em breve
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Responda mensagens diretas automaticamente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messenger - Coming Soon */}
          <Card className="opacity-50 cursor-not-allowed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">Messenger</h4>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      Em breve
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Integre com o Facebook Messenger do cliente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webchat - Coming Soon */}
          <Card className="opacity-50 cursor-not-allowed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
                  <Globe className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">Webchat</h4>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Lock className="h-2.5 w-2.5" />
                      Em breve
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione um widget de chat no site do cliente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* WhatsApp Connect/Disconnect Dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={(open) => {
        if (!open && pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setWhatsappDialogOpen(open);
        if (!open) {
          setQrCode(null);
          setConnecting(false);
        }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center">
              {isWhatsappConnected ? 'Desconectar WhatsApp' : 'Conectar WhatsApp'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isWhatsappConnected
                ? 'Ao desconectar, o agente deixará de responder pelo WhatsApp deste cliente.'
                : qrCode
                  ? 'Escaneie o QR Code com o WhatsApp do celular do cliente para conectar.'
                  : 'O agente passará a responder automaticamente as mensagens recebidas no WhatsApp Business do cliente.'}
            </DialogDescription>
          </DialogHeader>

          {/* QR Code Display */}
          {qrCode && (
            <div className="flex justify-center py-4">
              <div className="border rounded-xl p-3 bg-white">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-56 h-56 object-contain"
                />
              </div>
            </div>
          )}

          {connecting && !qrCode && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)}>
              {qrCode ? 'Fechar' : 'Cancelar'}
            </Button>
            {!qrCode && !connecting && (
              <Button
                variant={isWhatsappConnected ? 'destructive' : 'default'}
                onClick={isWhatsappConnected ? handleDisconnectWhatsapp : handleConnectWhatsapp}
                disabled={instanceAction.isPending}
              >
                {instanceAction.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isWhatsappConnected ? 'Desconectar' : 'Conectar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
