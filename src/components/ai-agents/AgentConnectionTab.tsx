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
  instanceAction: UseMutationResult<any, any, { action: 'connect' | 'status' | 'disconnect', phone?: string }, unknown>;
  updateConfig: UseMutationResult<AIAgent, any, Partial<AIAgent>, unknown>;
  onRefresh: () => void;
}

export function AgentConnectionTab({ agent, instanceAction, updateConfig, onRefresh }: AgentConnectionTabProps) {
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState<'qr' | 'code'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
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
    setPairingCode(null);

    try {
      // Formata o número (se houver) removendo tudo que não é dígito
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      
      const result = await instanceAction.mutateAsync({ 
        action: 'connect', 
        phone: connectMode === 'code' ? formattedPhone : undefined 
      });

      if (result.qrcode || result.paircode) {
        if (result.qrcode) setQrCode(result.qrcode);
        if (result.paircode) setPairingCode(result.paircode);

        // Start polling for connection status
        pollingRef.current = setInterval(async () => {
          try {
            const statusResult = await instanceAction.mutateAsync({ action: 'status' });
            if (statusResult.whatsapp_connected) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setQrCode(null);
              setPairingCode(null);
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
      } else if (result.error && result.debug) {
        console.error('Debug UAZAPI:', result.debug);
        toast.error(`Erro técnico UAZAPI: ${JSON.stringify(result.debug).substring(0, 100)}...`);
        setConnecting(false);
      } else {
        toast.error('Não foi possível iniciar a conexão. Verifique os dados e tente novamente.');
        setConnecting(false);
      }
    } catch (error: any) {
      console.error('Erro ao conectar WhatsApp:', error);
      toast.error('Erro ao conectar: ' + (error.message || 'Falha na comunicação.'));
      setConnecting(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    try {
      await instanceAction.mutateAsync({ action: 'disconnect' });
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
                : pairingCode
                  ? 'No seu WhatsApp, vá em Aparelhos Conectados > Conectar com número de telefone e digite o código abaixo.'
                  : qrCode
                    ? 'Escaneie o QR Code com o WhatsApp do celular do cliente para conectar.'
                    : 'Escolha como deseja conectar o agente ao WhatsApp Business do cliente.'}
            </DialogDescription>
          </DialogHeader>

          {!isWhatsappConnected && !qrCode && !pairingCode && !connecting && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={connectMode === 'qr' ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setConnectMode('qr')}
                >
                  <QrCode className="h-6 w-6" />
                  <span className="text-xs uppercase font-bold">QR Code</span>
                </Button>
                <Button
                  variant={connectMode === 'code' ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setConnectMode('code')}
                >
                  <Smartphone className="h-6 w-6" />
                  <span className="text-xs uppercase font-bold">Código</span>
                </Button>
              </div>

              {connectMode === 'code' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">
                    Número do WhatsApp (com DDD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      +
                    </span>
                    <input
                      type="text"
                      placeholder="Ex: 5511999999999"
                      className="w-full p-3 pl-7 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                      value={phoneNumber}
                      onChange={(e) => {
                        // Aceita apenas dígitos
                        const onlyDigits = e.target.value.replace(/\D/g, '');
                        setPhoneNumber(onlyDigits);
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Inclua o código do país à esquerda (ex: 258...)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* QR Code Display */}
          {connectMode === 'qr' && qrCode && (
            <div className="flex justify-center py-4 text-center">
              <div className="border rounded-xl p-3 bg-white">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-56 h-56 object-contain"
                />
              </div>
            </div>
          )}

          {/* Pairing Code Display */}
          {connectMode === 'code' && pairingCode && (
            <div className="flex justify-center items-center py-8">
              <div className="flex gap-1.5 items-center">
                {pairingCode.replace(/-/g, '').split('').map((char, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div 
                      className="w-8 h-12 bg-muted rounded-lg flex items-center justify-center text-xl font-bold border-2 border-primary/20 shadow-sm"
                    >
                      {char}
                    </div>
                    {i === 3 && (
                      <span className="text-2xl font-bold text-muted-foreground mx-1">
                        -
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {connecting && !qrCode && !pairingCode && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Iniciando conexão...</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setWhatsappDialogOpen(false);
              setQrCode(null);
              setPairingCode(null);
              setConnecting(false);
            }}>
              {(qrCode || pairingCode) ? 'Fechar' : 'Cancelar'}
            </Button>
            {!qrCode && !pairingCode && !connecting && (
              <Button
                variant={isWhatsappConnected ? 'destructive' : 'default'}
                onClick={isWhatsappConnected ? handleDisconnectWhatsapp : handleConnectWhatsapp}
                disabled={instanceAction.isPending || (connectMode === 'code' && !phoneNumber)}
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
