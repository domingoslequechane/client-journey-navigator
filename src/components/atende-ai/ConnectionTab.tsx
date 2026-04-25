import React, { useState } from 'react';
import {
  Instagram,
  RefreshCw,
  QrCode,
  Key,
  Zap,
  CheckCircle2,
  XCircle,
  Hash,
  Loader2,
  Wifi,
  WifiOff,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAtendeAIConnectionPoller } from '@/hooks/useAtendeAIDetail';
import type { AtendeAIInstance } from '@/types';

interface ConnectionTabProps {
  agent: AtendeAIInstance;
  instanceAction: {
    mutateAsync: (args: { action: 'connect' | 'status' | 'disconnect' | 'get-qr' | 'debug-auth'; phone?: string }) => Promise<any>;
    isPending: boolean;
  };
}

// ─── Connected State ─────────────────────────────────────────────────────────
function ConnectedView({ agent, onDisconnect, isPending }: {
  agent: AtendeAIInstance;
  onDisconnect: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 dark:bg-zinc-900/30 border-2 border-dashed border-emerald-500/20 rounded-2xl animate-in fade-in duration-500">
      
      {/* Icon matching the placeholder's size */}
      <div className="relative mb-4">
        <div className="text-emerald-500">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#0c0c0c] rounded-full p-0.5 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-white dark:fill-[#0c0c0c]" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        WhatsApp conectado
      </h3>
      
      {/* Description */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <p className="text-sm text-zinc-500 font-medium max-w-sm text-center px-6">
          Conta operante e conectada. O <span className="text-[#ff7a00] font-bold">Atende AI</span> está a processar mensagens em tempo real.
        </p>
      </div>

      {/* Connection Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 w-full max-w-2xl px-6">
         <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-center gap-1 shadow-sm">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Canal Conectado</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
               <Zap className="h-4 w-4 text-[#ff7a00]" />
               WhatsApp
            </span>
         </div>
         <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-center gap-1 shadow-sm">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Business Name</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white truncate" title={agent.clients?.company_name || agent.company_name || 'Desconhecido'}>
               {agent.clients?.company_name || agent.company_name || 'Desconhecido'}
            </span>
         </div>
         <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-center gap-1 shadow-sm">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">JID (Número)</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white font-mono break-all">
               {agent.connected_number ? `+${agent.connected_number}` : 'N/A'}
            </span>
         </div>
      </div>

      {/* Actions */}
      <Button
        variant="outline"
        onClick={onDisconnect}
        disabled={isPending}
        className="rounded-lg font-bold border-red-200 dark:border-red-900/30 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2 px-6"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        {isPending ? 'Desconectando...' : 'Desconectar aparelho'}
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function ConnectionTab({ agent, instanceAction }: ConnectionTabProps) {
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'messenger' | 'instagram'>('whatsapp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [mode, setMode] = useState<'qr' | 'pair'>('qr');
  const [loadingQR, setLoadingQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const isConnected = !!(agent?.whatsapp_connected);

  // Polling automático de estado enquanto a instância não está conectada
  useAtendeAIConnectionPoller(
    agent?.id,
    agent?.evolution_instance_id,
    isConnected,
    true, // sempre activo quando este componente está montado
    (data: any) => {
      // Receber QR ou Pairing Code via background polling se ainda não estiver conectado
      if (data?.qrCode && data.qrCode !== qrCode) {
        const src = data.qrCode.startsWith('data:')
          ? data.qrCode
          : `data:image/png;base64,${data.qrCode}`;
        setQrCode(src);
        setLoadingQR(false);
      }
      if (data?.pairingCode && data.pairingCode !== pairingCode) {
        setPairingCode(data.pairingCode);
        setLoadingQR(false);
      }
    }
  );

  // ─── Get QR Code directly from Evolution Go API ───
  const handleGetQR = async () => {
    setLoadingQR(true);
    setQrCode(null);
    setPairingCode(null);

    try {
      const data = await instanceAction.mutateAsync({ action: 'connect' });
      
      if (data?.qrCode) {
        const src = data.qrCode.startsWith('data:')
          ? data.qrCode
          : `data:image/png;base64,${data.qrCode}`;
        setQrCode(src);
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
      } else if (data?.ok === false) {
        throw new Error(data.error || 'Erro ao gerar QR Code');
      } else {
        toast.info('O servidor está processando a solicitação do QR Code. Por favor, aguarde alguns segundos enquanto a instância inicializa.');
      }
    } catch (e: any) {
      console.error('[ConnectionTab] QR fetch error:', e);
      toast.error('Erro ao gerar QR Code: ' + e.message);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleGetPairingCode = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 9) {
      toast.error('Digite um número de telemóvel válido com código do país (ex: 258841234567)');
      return;
    }

    setLoadingQR(true);
    setPairingCode(null);
    setQrCode(null);

    try {
      const data = await instanceAction.mutateAsync({ action: 'connect', phone: digits });
      
      if (data?.pairingCode) {
        setPairingCode(data.pairingCode);
        toast.success('Código de pareamento gerado! Insira no seu WhatsApp.');
      } else if (data?.ok === false) {
        throw new Error(data.error || 'Erro ao gerar código de pareamento');
      } else {
        toast.warning('O servidor não retornou o código de pareamento. Verifique se o número está correto ou tente conectar via QR Code.');
      }
    } catch (e: any) {
      console.error('[ConnectionTab] Pairing fetch error:', e);
      toast.error('Erro ao gerar código de pareamento: ' + e.message);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await instanceAction.mutateAsync({ action: 'disconnect' });
      setQrCode(null);
      setPairingCode(null);
    } catch (e: any) {
      toast.error('Erro ao desconectar: ' + e.message);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace('-', ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formatar código como XXXX-XXXX
  const formattedCode = pairingCode
    ? pairingCode.replace(/[^A-Z0-9]/gi, '').replace(/(.{4})(.{4})/, '$1-$2').toUpperCase()
    : null;



  // ─── Constants ───
  const channels = [
    { 
      id: 'whatsapp', 
      label: 'WhatsApp', 
      color: 'text-emerald-500',
      icon: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      )
    },
    { 
      id: 'messenger', 
      label: 'Messenger', 
      color: 'text-blue-500', 
      soon: true,
      icon: (props: any) => (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.304 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.291 14.89l-3.068-3.28-5.988 3.28 6.588-7.001 3.13 3.28 5.927-3.28-6.589 7.001z"/>
        </svg>
      )
    },
    { 
      id: 'instagram', 
      label: 'Instagram', 
      color: 'text-pink-500', 
      soon: true,
      icon: (props: any) => <Instagram {...props} />
    },
  ];

  // ─── Disconnected State — Connection Form ───
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* Main Channel Selection - Standard Tabs Style */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800">
        {channels.map((chan) => (
          <button
            key={chan.id}
            onClick={() => setSelectedChannel(chan.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative",
              selectedChannel === chan.id 
                ? "text-zinc-900 dark:text-white" 
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
          >
            <chan.icon className={cn("h-4 w-4", selectedChannel === chan.id ? chan.color : "text-zinc-300")} />
            {chan.label}
            {chan.soon && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold ml-1 uppercase tracking-tight">
                Em breve
              </span>
            )}
            {selectedChannel === chan.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff7a00] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {selectedChannel === 'whatsapp' ? (
        isConnected ? (
          <ConnectedView
            agent={agent}
            onDisconnect={handleDisconnect}
            isPending={instanceAction.isPending}
          />
        ) : (
        <>
          {/* Warning: no API key */}
          {!agent.instance_api_key && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400">
              <WifiOff className="h-5 w-5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Ação necessária</p>
                <p className="text-xs opacity-90">
                  Chave de API da instância não encontrada. Recrie a instância para gerar uma nova chave.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* ── LEFT: Codes (QR or Pairing) ── */}
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center min-h-[420px] bg-white dark:bg-[#0c0c0c] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
                
                {/* Mode Switcher */}
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg mb-8">
                  <button 
                    onClick={() => setMode('qr')}
                    className={cn(
                      "px-5 py-1.5 text-xs font-bold rounded-md transition-all",
                      mode === 'qr' 
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                  >
                    QR Code
                  </button>
                  <button 
                    onClick={() => setMode('pair')}
                    className={cn(
                      "px-5 py-1.5 text-xs font-bold rounded-md transition-all",
                      mode === 'pair' 
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                  >
                    Código de pareamento
                  </button>
                </div>

                {mode === 'qr' ? (
                  <div className="w-full flex flex-col items-center gap-10">
                    {/* Header from image */}
                    <div className="text-center space-y-2">
                       <div className="flex items-center justify-center gap-2 text-[#ff7a00]">
                         <QrCode className="h-5 w-5" />
                         <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Conectar WhatsApp</h3>
                       </div>
                       <p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                         Escaneie o QR Code abaixo com seu WhatsApp para conectar a instância <span className="font-mono text-zinc-900 dark:text-white font-bold">{agent.whatsapp_connected ? 'Ativa' : 'Pendente'}</span>
                       </p>
                    </div>

                    <div className="p-4 bg-white rounded-xl shadow-xl ring-1 ring-zinc-100 dark:ring-zinc-800">
                      {qrCode ? (
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 object-contain" />
                      ) : (
                        <div className="w-56 h-56 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 gap-3 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                          {loadingQR ? (
                            <Loader2 className="h-8 w-8 text-[#ff7a00] animate-spin" />
                          ) : (
                            <>
                              <QrCode className="h-12 w-12 text-zinc-100 dark:text-zinc-800" />
                              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center px-4">
                                Clique para gerar
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleGetQR}
                      disabled={loadingQR || !agent.instance_api_key}
                      className="w-full max-w-[320px] h-11 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 font-bold rounded-xl gap-3 transition-all"
                    >
                      {loadingQR ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {qrCode ? 'Atualizar QR Code' : 'Gerar QR Code'}
                    </Button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-8">
                    {formattedCode ? (
                      <div className="flex flex-col items-center gap-10 w-full animate-in zoom-in-95">
                         <div className="text-center space-y-2">
                           <div className="flex items-center justify-center gap-2 text-[#ff7a00]">
                             <Key className="h-5 w-5" />
                             <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Pareamento Numérico</h3>
                           </div>
                           <p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">
                             Insira este código no seu WhatsApp para conectar a instância.
                           </p>
                        </div>

                        <div className="flex gap-2">
                          {formattedCode.split('').map((char, i) => (
                            <div key={i} className="flex items-center gap-1">
                              {char !== '-' ? (
                                <div className="w-10 h-14 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-2xl font-bold text-[#ff7a00] shadow-sm">
                                  {char}
                                </div>
                              ) : (
                                <div className="px-1 text-zinc-300">-</div>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleCopyCode}
                          className="h-10 px-8 rounded-lg font-bold border-zinc-200 dark:border-zinc-800 hover:border-[#ff7a00] text-zinc-600 dark:text-zinc-400 hover:text-[#ff7a00]"
                        >
                          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {copied ? 'Copiado!' : 'Copiar código'}
                        </Button>
                      </div>
                    ) : (
                      <div className="w-full max-w-[320px] space-y-8">
                        <div className="text-center space-y-2">
                           <div className="flex items-center justify-center gap-2 text-[#ff7a00]">
                             <Key className="h-5 w-5" />
                             <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Parear com número</h3>
                           </div>
                           <p className="text-xs text-zinc-500 leading-relaxed">
                             Digite o número do WhatsApp que deseja conectar.
                           </p>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Número do WhatsApp (com DDI)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">+</span>
                            <Input
                              placeholder="258841234567"
                              className="h-12 pl-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-[#ff7a00]/20 font-bold"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                          </div>
                          <Button 
                            onClick={handleGetPairingCode}
                            disabled={loadingQR || !phoneNumber || !agent.instance_api_key}
                            className="w-full h-11 bg-[#ff7a00] hover:bg-[#e66e00] text-white font-bold rounded-xl gap-2 transition-all mt-4"
                          >
                            {loadingQR ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                            Gerar código
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Instructions & Status ── */}
            <div className="space-y-6">
              
              {/* Instructions Container - Styled like the image */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-7 border border-zinc-200 dark:border-zinc-800 space-y-6">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">Como conectar:</h4>
                
                <div className="space-y-4">
                  {(mode === 'qr'
                    ? [
                        'Abra o WhatsApp no seu celular',
                        'Toque em Menu ou Configurações',
                        'Toque em Dispositivos conectados',
                        'Toque em Conectar um dispositivo',
                        'Aponte seu celular para esta tela para capturar o código'
                      ]
                    : [
                        'No WhatsApp, vá em "Dispositivos conectados"',
                        'Toque em "Conectar um dispositivo"',
                        'Selecione "Conectar com número de telefone" no rodapé',
                        'Insira o código de 8 caracteres gerado ao lado'
                      ]
                  ).map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <span className="text-sm font-bold text-zinc-400 dark:text-zinc-600 shrink-0">{idx + 1}.</span>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-normal">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Notice */}
              <div className="px-1">
                <p className="text-[12px] text-zinc-400 dark:text-zinc-500 leading-relaxed italic">
                  * Certifique-se de que seu celular está conectado à internet durante o processo.
                </p>
              </div>
            </div>
          </div>
        </>
        )
      ) : (
        /* Placeholder for Other Channels */
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 dark:bg-zinc-900/30 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
           {(() => {
             const activeChan = channels.find(c => c.id === selectedChannel);
             if (!activeChan) return <Zap className="h-12 w-12 text-zinc-300 mb-4 animate-pulse" />;
             return <activeChan.icon className={cn("h-12 w-12 mb-4 animate-pulse opacity-80", activeChan.color)} />;
           })()}
           <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
             Integração com {selectedChannel.charAt(0).toUpperCase() + selectedChannel.slice(1)}
           </h3>
           <p className="text-sm text-zinc-500 font-medium max-w-sm text-center px-6">
             Estamos trabalhando para trazer essa integração oficial em breve. Notificaremos assim que estiver disponível.
           </p>
           <Button 
             variant="outline" 
             className="mt-8 rounded-lg font-bold border-zinc-200 dark:border-zinc-800"
             onClick={() => setSelectedChannel('whatsapp')}
           >
             Voltar para o WhatsApp
           </Button>
        </div>
      )}
    </div>
  );
}
