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
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'instagram' | 'messenger' | null>(null);
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
              setSelectedChannel(null);
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
        setSelectedChannel(null);
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
      setSelectedChannel(null);
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

      {/* Channels Overview / Connection Detail */}
      {!selectedChannel ? (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wider mb-3 normal-case">
            Canais de atendimento
          </h3>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {/* WhatsApp - Available */}
            <Card
              className={cn(
                'cursor-pointer hover:shadow-md transition-all group',
                isWhatsappConnected && 'border-green-500/30'
              )}
              onClick={() => setSelectedChannel('whatsapp')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 shrink-0 group-hover:bg-green-500/20 transition-colors">
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
            <Card 
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setSelectedChannel('instagram')}
            >
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
            <Card 
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setSelectedChannel('messenger')}
            >
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
      ) : (
        <Card className="border-2 border-primary/10 overflow-hidden bg-card">
          <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setSelectedChannel(null);
                  setQrCode(null);
                  setPairingCode(null);
                  setConnecting(false);
                }}
              >
                <PowerOff className="h-4 w-4 rotate-90" />
              </Button>
              <div>
                <h3 className="font-semibold capitalize">Conectar {selectedChannel}</h3>
                <p className="text-[10px] text-muted-foreground italic">Configuração do canal de atendimento</p>
              </div>
            </div>
            {isWhatsappConnected && selectedChannel === 'whatsapp' && (
              <Button variant="destructive" size="sm" onClick={handleDisconnectWhatsapp}>
                Desconectar
              </Button>
            )}
          </div>
          
          <CardContent className="p-6">
            {selectedChannel === 'whatsapp' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Column: Codes */}
                <div className="space-y-6 flex flex-col items-center justify-center min-h-[400px]">
                  {!isWhatsappConnected ? (
                    <>
                      {!qrCode && !pairingCode && !connecting ? (
                        <div className="w-full space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant={connectMode === 'qr' ? 'default' : 'outline'}
                              className="h-24 flex-col gap-2 rounded-2xl border-2"
                              onClick={() => setConnectMode('qr')}
                            >
                              <QrCode className="h-8 w-8 text-primary" />
                              <span className="text-xs uppercase font-black tracking-tighter">QR Code</span>
                            </Button>
                            <Button
                              variant={connectMode === 'code' ? 'default' : 'outline'}
                              className="h-24 flex-col gap-2 rounded-2xl border-2"
                              onClick={() => setConnectMode('code')}
                            >
                              <Smartphone className="h-8 w-8 text-primary" />
                              <span className="text-xs uppercase font-black tracking-tighter">Código</span>
                            </Button>
                          </div>

                          {connectMode === 'code' && (
                            <div className="space-y-2 pt-2">
                              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                WhatsApp do Cliente
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">
                                  +
                                </span>
                                <input
                                  type="text"
                                  placeholder="5511999999999"
                                  className="w-full h-14 pl-8 pr-4 rounded-xl border-2 bg-background font-medium focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                  value={phoneNumber}
                                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground italic text-center">
                                Digite o número com DDI e DDD (ex: 55...)
                              </p>
                            </div>
                          )}

                          <Button 
                            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20"
                            onClick={handleConnectWhatsapp}
                            disabled={connecting || (connectMode === 'code' && !phoneNumber)}
                          >
                            {connecting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                            Gerar Conexão
                          </Button>
                        </div>
                      ) : null}

                      {connecting && !qrCode && !pairingCode && (
                        <div className="flex flex-col items-center gap-4">
                          <div className="h-20 w-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                          <p className="text-lg font-bold text-primary animate-pulse italic">Iniciando conexão...</p>
                        </div>
                      )}

                      {qrCode && (
                        <div className="flex flex-col items-center gap-6">
                           <div className="relative p-6 bg-white rounded-3xl shadow-2xl overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img src={qrCode} alt="QR Code" className="w-64 h-64 object-contain relative z-10" />
                          </div>
                          <Button 
                            variant="outline" 
                            className="rounded-full border-2 h-12 px-8 font-bold"
                            onClick={() => { setQrCode(null); setConnecting(false); }}
                          >
                            Refazer Conexão
                          </Button>
                        </div>
                      )}

                      {pairingCode && (
                        <div className="flex flex-col items-center gap-8 w-full">
                          <div className="flex flex-wrap justify-center gap-2">
                            {pairingCode.replace(/-/g, '').split('').map((char, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-10 h-14 md:w-12 md:h-16 bg-muted border-2 border-primary/20 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-black shadow-inner">
                                  {char}
                                </div>
                                {i === 3 && <div className="text-3xl font-black text-primary/30 mx-1">-</div>}
                              </div>
                            ))}
                          </div>
                          <Button 
                            variant="outline" 
                            className="rounded-full border-2 h-12 px-8 font-bold"
                            onClick={() => { setPairingCode(null); setConnecting(false); }}
                          >
                            Refazer Conexão
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                        <Smartphone className="h-10 w-10 text-emerald-500" />
                      </div>
                      <h4 className="text-2xl font-black text-emerald-600 italic">WhatsApp Conectado</h4>
                      <p className="text-muted-foreground font-medium">
                        O agente está operando no número: <br />
                        <span className="text-foreground font-bold">{agent.connected_number}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Column: Instructions */}
                <div className="bg-muted/30 p-8 rounded-3xl border-2 border-dashed border-primary/10 space-y-6">
                  <div>
                    <h4 className="text-xl font-black italic mb-4 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Smartphone className="h-4 w-4 text-primary" />
                      </div>
                      Como conectar:
                    </h4>
                    <ul className="space-y-4">
                      {[
                        'Abra o WhatsApp no celular do cliente',
                        'Toque em Menu (⋮) ou Configurações (⚙️)',
                        'Selecione "Aparelhos Conectados"',
                        pairingCode 
                          ? 'Toque em "Conectar com número de telefone"' 
                          : 'Toque em "Conectar um aparelho"',
                        pairingCode
                          ? 'Digite o código de 8 dígitos mostrado à esquerda'
                          : 'Aponte a câmera para o QR Code à esquerda'
                      ].map((step, idx) => (
                        <li key={idx} className="flex gap-4 items-start">
                          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium leading-tight">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-2">
                      <Lock className="h-3 w-3" />
                      Segurança
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      A conexão é encriptada ponta-a-ponta. Seus dados e mensagens estão protegidos pelos protocolos oficiais do WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Lock className="h-10 w-10 text-primary" />
                </div>
                <h4 className="text-2xl font-black italic">Canal em Breve</h4>
                <p className="text-muted-foreground max-w-sm font-medium italic">
                  Estamos trabalhando para integrar o {selectedChannel} nesta funcionalidade. Fique atento às atualizações!
                </p>
                <Button 
                  variant="outline" 
                  className="rounded-full font-bold"
                  onClick={() => setSelectedChannel(null)}
                >
                  Voltar para Canais
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
