import React, { useState } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  QrCode, 
  Key, 
  Zap, 
  MessageCircle, 
  Instagram, 
  Facebook,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function ConnectionTab({ agent, onRefreshQR, onGeneratePairCode }: { 
  agent: any; 
  onRefreshQR: () => void;
  onGeneratePairCode: (phone: string) => void;
}) {
  const [platform, setPlatform] = useState('whatsapp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  if (agent?.whatsapp_connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-10 shadow-sm">
           <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
             <CheckCircle2 className="h-7 w-7 text-white stroke-[3px]" />
           </div>
        </div>

        <div className="text-center space-y-4 mb-12">
          <div className="flex items-center justify-center gap-3">
             <Smartphone className="h-6 w-6 text-emerald-500" />
             <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">WhatsApp conectado</h3>
          </div>
          <p className="text-zinc-500 font-medium max-w-md mx-auto leading-relaxed text-sm">
            A conta <span className="text-zinc-900 dark:text-white font-bold">{agent.phone || '258868499221'}</span> está operante e o <span className="text-[#ff7a00] font-bold">Atende AI</span> está processando mensagens normalmente.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
           <Button className="bg-[#ff7a00] hover:bg-[#e66e00] text-white font-bold h-11 px-8 rounded-xl gap-2 shadow-sm active:scale-95 transition-all">
             <Zap className="h-4 w-4 fill-white" />
             Retomar
           </Button>

           <Button variant="outline" className="bg-white dark:bg-[#121212] border-zinc-200 dark:border-[#222] hover:border-[#ff7a00]/50 text-zinc-900 dark:text-white font-bold h-11 px-8 rounded-xl gap-2 active:scale-95 transition-all">
             <RefreshCw className="h-4 w-4" />
             Reiniciar
           </Button>

           <Button variant="link" className="text-red-500 hover:text-red-400 font-bold gap-2 px-6 text-xs">
             <XCircle className="h-3.5 w-3.5" />
             Desconectar
           </Button>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!phoneNumber) return;
    setLoadingCode(true);
    // Simulation
    setTimeout(() => {
      setPairingCode('9XLR-6AZX');
      setLoadingCode(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Platform Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-[#222]/50 pb-0 w-fit">
        {[
          { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
          { id: 'instagram', label: 'Instagram', icon: Instagram },
          { id: 'messenger', label: 'Messenger', icon: MessageCircle },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={cn(
               "flex items-center gap-2 px-8 py-3 text-sm font-bold transition-all relative",
               platform === p.id ? "text-[#ff7a00]" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <p.icon className="h-4 w-4" />
            {p.label}
            {platform === p.id && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-[#ff7a00] rounded-t-full shadow-sm" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start pt-4">
        
        <div className="xl:col-span-5 flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#ff7a00]/30 to-transparent blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-white p-4 rounded-2xl shadow-xl overflow-hidden border-4 border-zinc-100 dark:border-[#121212]">
              {agent?.qrCode ? (
                <img src={agent.qrCode} alt="WhatsApp QR Code" className="w-[260px] h-[260px]" />
              ) : (
                <div className="w-[260px] h-[260px] flex items-center justify-center bg-zinc-50 dark:bg-muted/5">
                   <QrCode className="h-20 w-20 text-zinc-200 dark:text-[#222]" />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-3">
             <span className="text-zinc-900 dark:text-white font-bold text-sm tracking-tight">Conexão via QR code</span>
              <Button 
                variant="outline" 
                onClick={onRefreshQR}
                className="bg-white dark:bg-[#1a1a1a] border-zinc-200 dark:border-[#333] text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-[#ff7a00] transition-colors gap-2 h-10 px-6 rounded-xl"
              >
               <RefreshCw className="h-4 w-4 text-[#ff7a00]" />
               Atualizar QR
             </Button>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="hidden xl:block w-px h-full bg-gradient-to-b from-transparent via-zinc-200 dark:via-[#222] to-transparent self-stretch" />

        {/* PAIRING CODE SECTION */}
        <div className="xl:col-span-6 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-[#ff7a00]/10 rounded-lg">
                 <Key className="h-5 w-5 text-[#ff7a00]" />
               </div>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Código de pareamento</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-md font-bold tracking-tight">
              Não possui um leitor de QR code? Conecte instâncias de WhatsApp informando o código de 8 dígitos gerado diretamente no aplicativo do seu celular.
            </p>
          </div>

          <Card className="bg-white dark:bg-[#121212]/50 border-zinc-200 dark:border-[#222] rounded-2xl overflow-hidden border-2 border-dashed group hover:border-[#ff7a00]/30 transition-all shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-3">
                 <div className="relative flex-1 group">
                    <Input 
                      placeholder="Nº com código do país. Ex: 55849..." 
                      className="bg-zinc-50 dark:bg-[#0c0c0c] border-zinc-200 dark:border-[#333] h-11 pl-11 rounded-xl focus-visible:ring-[#ff7a00]/40 text-zinc-900 dark:text-white font-bold placeholder:text-zinc-400 dark:placeholder:text-zinc-600 tracking-tight text-xs"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#ff7a00] opacity-40" />
                 </div>
                <Button 
                  onClick={handleGenerate}
                  disabled={loadingCode || !phoneNumber}
                  className="bg-[#ff7a00] hover:bg-[#e66e00] text-white font-bold h-11 px-6 rounded-xl gap-2 shadow-sm disabled:opacity-20 active:scale-95 transition-all text-xs"
                >
                  {loadingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Gerar código
                </Button>
              </div>

               {pairingCode && (
                <div className="bg-zinc-50 dark:bg-[#0c0c0c] border border-zinc-100 dark:border-[#ff7a00]/20 rounded-xl p-6 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
                  <span className="text-xs text-zinc-500 font-bold tracking-tight mb-1">Código de pareamento</span>
                  <span className="text-4xl font-black text-[#ff7a00] tracking-[0.2em] font-mono filter drop-shadow-[0_0_10px_rgba(255,122,0,0.1)]">
                    {pairingCode}
                  </span>
                </div>
              )}

              <p className="text-xs text-zinc-500 font-bold tracking-tight text-center leading-relaxed">
                Informe o número do WhatsApp que deseja conectar para gerar o código de 8 dígitos.
              </p>
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="bg-white dark:bg-[#121212] border border-zinc-100 dark:border-[#222] rounded-2xl p-6 space-y-4 shadow-sm">
            {[
              { num: 1, text: "Abra o WhatsApp no celular principal" },
              { num: 2, text: "Acesse as \"Configurações\" > \"Aparelhos conectados\"" },
              { num: 3, text: "Selecione \"Conectar com número de telefone\"" },
              { num: 4, text: "Escaneie o QR code ou digite o código acima" },
            ].map((step) => (
               <div key={step.num} className="flex items-center gap-3.5 group">
                <div className="w-7 h-7 rounded-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-100 dark:border-[#333] flex items-center justify-center text-[#ff7a00] font-bold text-xs group-hover:bg-[#ff7a00] group-hover:text-white transition-all">
                  {step.num}
                </div>
                <span className="text-xs text-zinc-500 font-bold tracking-tight group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{step.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
