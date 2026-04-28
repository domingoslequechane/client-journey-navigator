import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, CheckCircle2, AlertCircle, ExternalLink, Key, X, Zap, PowerOff, FlaskConical, Loader2, CheckCheck, XCircle, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AtendeAIInstance } from '@/types';

// ─── Provider Logos (official SVG inline) ────────────────────────────────────

function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.032.067L9.644 19.9a4.5 4.5 0 0 1-6.044-1.596zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0L4.103 14.3A4.5 4.5 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387 2.019-1.168a.075.075 0 0 1 .071 0l4.715 2.723a4.5 4.5 0 0 1-.676 8.123V12.48a.79.79 0 0 0-.396-.729zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.713-2.72a4.5 4.5 0 0 1 6.797 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  );
}

function AnthropicLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.827 3.52h3.603L24 20.479h-3.603l-6.57-16.959zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 10.455L8.453 7.687 6.205 13.977h4.496z"/>
    </svg>
  );
}

function GroqLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5c4.136 0 7.5 3.364 7.5 7.5s-3.364 7.5-7.5 7.5S4.5 16.136 4.5 12 7.864 4.5 12 4.5zm0 2.25a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zm0 2.25a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>
    </svg>
  );
}

function DeepSeekLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.748 4.482a.915.915 0 0 0-.023-.109c-.024-.088-.06-.17-.107-.245a1.07 1.07 0 0 0-.089-.12c-.006-.007-.009-.016-.015-.023a.881.881 0 0 0-.134-.115.907.907 0 0 0-.221-.125.782.782 0 0 0-.1-.033A.906.906 0 0 0 22.8 3.7a.919.919 0 0 0-.498.135l-4.156 2.62a.9.9 0 0 0-.139.103.824.824 0 0 0-.048.044c-.015.016-.034.03-.049.047a.9.9 0 0 0-.088.116c-.014.022-.024.045-.036.068-.02.04-.04.08-.054.124-.01.03-.016.06-.022.09-.01.05-.015.1-.017.15v.015a.946.946 0 0 0 .016.158c.005.03.011.059.02.088.014.044.034.085.055.126.012.023.022.047.036.069.026.04.057.076.089.11.015.017.034.031.05.047.014.014.027.03.043.043a.903.903 0 0 0 .139.103l4.156 2.62a.919.919 0 0 0 .498.135.904.904 0 0 0 .26-.038.78.78 0 0 0 .1-.033.907.907 0 0 0 .22-.125.881.881 0 0 0 .135-.115c.006-.007.01-.016.015-.023.033-.038.063-.078.089-.12.047-.075.083-.157.107-.245a.915.915 0 0 0 .023-.109.946.946 0 0 0 .017-.158V4.64a.946.946 0 0 0-.017-.158zM12 .75C5.787.75.75 5.787.75 12S5.787 23.25 12 23.25 23.25 18.213 23.25 12 18.213.75 12 .75zm0 3a8.25 8.25 0 1 1 0 16.5A8.25 8.25 0 0 1 12 3.75zm.53 3.47a.75.75 0 0 0-1.06 0L8.22 10.47a.75.75 0 0 0 1.06 1.06L11 9.81v4.44a.75.75 0 0 0 1.5 0V9.81l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3.75-3.75z"/>
    </svg>
  );
}

function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.182a9.818 9.818 0 1 1 0 19.636A9.818 9.818 0 0 1 12 2.182zm0 1.636a8.182 8.182 0 1 0 0 16.364A8.182 8.182 0 0 0 12 3.818zm.001 2.11c.407 0 .808.034 1.2.1l-1.2 6.518-1.2-6.517a8.14 8.14 0 0 1 1.2-.1zm-4.16 1.58l5.36 3.893-5.36 3.892a8.182 8.182 0 0 1 0-7.784zm8.32 0a8.182 8.182 0 0 1 0 7.784l-5.36-3.892 5.36-3.892zM12 14.546l1.2 6.517a8.194 8.194 0 0 1-2.4 0l1.2-6.517z"/>
    </svg>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmProviderModal({
  open,
  providerName,
  isDeactivating,
  onConfirm,
  onCancel,
  isLoading,
}: {
  open: boolean;
  providerName: string;
  isDeactivating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Gradient hero */}
        <div className={cn(
          "relative px-8 pt-10 pb-8 text-white text-center",
          isDeactivating
            ? "bg-gradient-to-br from-red-600 via-red-500 to-rose-400"
            : "bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400"
        )}>
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              {isDeactivating
                ? <PowerOff className="h-8 w-8 text-white" />
                : <Zap className="h-8 w-8 text-white" />
              }
            </div>
            <h2 className="text-xl font-bold mb-2">
              {isDeactivating ? 'Desactivar Provedor?' : 'Activar Provedor?'}
            </h2>
            <p className="text-white/90 text-sm leading-relaxed">
              {isDeactivating
                ? `O agente deixará de responder no WhatsApp até que um novo provedor seja activado. Confirma a desactivação do ${providerName}?`
                : `O ${providerName} será definido como o provedor de inteligência artificial activo para este agente. Confirma?`
              }
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 bg-card">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 text-sm font-semibold"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              className={cn(
                "flex-1 gap-2 h-11 text-sm font-semibold border-0",
                isDeactivating
                  ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
                  : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              )}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isDeactivating ? <PowerOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {isLoading ? 'A processar...' : (isDeactivating ? 'Desactivar' : 'Confirmar')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



// ─── Test AI Modal ────────────────────────────────────────────────────────

type StepStatus = 'idle' | 'running' | 'ok' | 'error';

interface DiagStep {
  label: string;
  detail: string;
  status: StepStatus;
}

function StepRow({ step }: { step: DiagStep }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="mt-0.5 shrink-0">
        {step.status === 'idle'    && <div className="h-4 w-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />}
        {step.status === 'running' && <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />}
        {step.status === 'ok'      && <CheckCheck className="h-4 w-4 text-emerald-500" />}
        {step.status === 'error'   && <XCircle className="h-4 w-4 text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold",
          step.status === 'ok'    && 'text-emerald-600 dark:text-emerald-400',
          step.status === 'error' && 'text-red-600 dark:text-red-400',
          step.status === 'idle'  && 'text-zinc-400 dark:text-zinc-600',
          step.status === 'running' && 'text-orange-500',
        )}>{step.label}</p>
        {step.detail && (
          <p className="text-xs text-zinc-500 mt-0.5 break-words">{step.detail}</p>
        )}
      </div>
    </div>
  );
}

function TestAIModal({ open, onClose, instance }: { open: boolean; onClose: () => void; instance: any }) {
  const [steps, setSteps] = useState<DiagStep[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => { setSteps([]); setDone(false); };

  const setStep = (index: number, patch: Partial<DiagStep>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  const runTest = async () => {
    setRunning(true);
    setDone(false);

    const provider = instance.ai_provider || '';
    const apiKeys = instance.ai_api_keys || {};
    const aiModels = instance.ai_models || {};
    const apiKey = apiKeys[provider] || '';
    const model = aiModels[provider] || (provider === 'openai' ? 'gpt-4o-mini' : '');
    const providerName = provider ? (provider.charAt(0).toUpperCase() + provider.slice(1)) : 'Nenhum';

    const initial: DiagStep[] = [
      { label: 'Provedor de IA configurado', detail: '', status: 'running' },
      { label: 'Chave de API presente', detail: '', status: 'idle' },
      { label: 'Modelo selecionado', detail: '', status: 'idle' },
      { label: 'Chamada à API do provedor', detail: '', status: 'idle' },
    ];
    setSteps(initial);

    await new Promise(r => setTimeout(r, 600));

    // Step 1: provider
    if (!provider) {
      setStep(0, { status: 'error', detail: 'Nenhum provedor activo. Vá à aba API e defina um provedor como activo.' });
      setRunning(false); setDone(true); return;
    }
    setStep(0, { status: 'ok', detail: `Provedor: ${providerName}` });
    setStep(1, { status: 'running' });
    await new Promise(r => setTimeout(r, 500));

    // Step 2: key
    if (!apiKey) {
      setStep(1, { status: 'error', detail: `A chave de API do ${providerName} não está configurada. Adicione a chave na aba API.` });
      setRunning(false); setDone(true); return;
    }
    setStep(1, { status: 'ok', detail: `Chave presente: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` });
    setStep(2, { status: 'running' });
    await new Promise(r => setTimeout(r, 400));

    // Step 3: model
    if (!model) {
      setStep(2, { status: 'error', detail: 'Nenhum modelo selecionado. Escolha um modelo no dropdown da aba API.' });
      setRunning(false); setDone(true); return;
    }
    setStep(2, { status: 'ok', detail: `Modelo: ${model}` });
    setStep(3, { status: 'running' });
    await new Promise(r => setTimeout(r, 300));

    // Step 4: actual API call
    try {
      let endpoint = '';
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let payload: any = {};
      const testMessages = [
        { role: 'system', content: 'Responda apenas com: OK' },
        { role: 'user', content: 'Teste de conexão. Responda apenas com: OK' },
      ];

      if (provider === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        payload = { model, messages: testMessages, max_tokens: 10 };
      } else if (provider === 'anthropic') {
        endpoint = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        payload = { model, max_tokens: 10, messages: [{ role: 'user', content: 'Teste. Responda: OK' }], system: 'Responda apenas com: OK' };
      } else if (provider === 'groq') {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        payload = { model, messages: testMessages, max_tokens: 10 };
      } else if (provider === 'deepseek') {
        endpoint = 'https://api.deepseek.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        payload = { model, messages: testMessages, max_tokens: 10 };
      } else if (provider === 'google') {
        endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        payload = { model, messages: testMessages, max_tokens: 10 };
      }

      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error?.message || data?.error?.code || JSON.stringify(data);
        setStep(3, { status: 'error', detail: `Erro ${res.status}: ${errMsg}` });
      } else {
        const reply = provider === 'anthropic'
          ? data?.content?.[0]?.text
          : data?.choices?.[0]?.message?.content;
        setStep(3, { status: 'ok', detail: `Resposta recebida: "${(reply || '').trim()}"` });
      }
    } catch (err: any) {
      setStep(3, { status: 'error', detail: `Erro de rede: ${err.message}. Verifique se a chave está correcta e tem saldo.` });
    }

    setRunning(false);
    setDone(true);
  };

  const handleClose = () => { reset(); onClose(); };
  const allOk = done && steps.every(s => s.status === 'ok');
  const hasFail = done && steps.some(s => s.status === 'error');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button]:hidden">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className={cn(
          "relative px-8 pt-10 pb-8 text-white text-center transition-all duration-500",
          allOk  ? 'bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500'
          : hasFail ? 'bg-gradient-to-br from-red-600 via-rose-500 to-orange-400'
          : 'bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400'
        )}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              {running ? <Loader2 className="h-8 w-8 text-white animate-spin" /> : <FlaskConical className="h-8 w-8 text-white" />}
            </div>
            <h2 className="text-xl font-bold mb-1">Diagnóstico da IA</h2>
            <p className="text-white/80 text-sm">
              {!running && !done && 'Clique em iniciar para testar a ligação ao provedor de IA.'}
              {running && 'A verificar configuração...'}
              {allOk  && 'Tudo operacional! A IA está a responder correctamente.'}
              {hasFail && 'Foram encontrados problemas. Veja os detalhes abaixo.'}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-4 bg-card">
          {steps.length > 0 ? (
            <div className="space-y-0">
              {steps.map((step, i) => <StepRow key={i} step={step} />)}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-4">O diagnóstico ainda não foi iniciado.</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 bg-card">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-10" onClick={handleClose} disabled={running}>
              Fechar
            </Button>
            <Button
              className="flex-1 h-10 gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 text-white font-semibold"
              onClick={() => { reset(); setTimeout(runTest, 50); }}
              disabled={running}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              {done ? 'Testar de Novo' : 'Iniciar Teste'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─── Provider definitions ─────────────────────────────────────────────────────

interface AIProvider {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  docsUrl: string;
  gradient: string;
  textColor: string;
  borderColor: string;
  badgeColor: string;
  logo: React.ComponentType<{ className?: string }>;
  models: { id: string; name: string }[];
  disabled?: boolean;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4 Turbo e outros modelos da OpenAI. O mais popular e versátil do mercado.',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    gradient: 'from-zinc-900 to-zinc-800',
    textColor: 'text-white',
    borderColor: 'border-zinc-700 hover:border-white/30',
    badgeColor: 'bg-white/10 text-white',
    logo: OpenAILogo,
    models: [
      { id: 'gpt-4o', name: 'gpt-4o (Recomendado)' },
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini' },
      { id: 'gpt-4-turbo', name: 'gpt-4-turbo' },
      { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' }
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus e Haiku. Excelente para raciocínio e escrita longa.',
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/keys',
    gradient: 'from-[#cc785c] to-[#b5622a]',
    textColor: 'text-white',
    borderColor: 'border-[#cc785c]/40 hover:border-[#cc785c]/80',
    badgeColor: 'bg-white/10 text-white',
    logo: AnthropicLogo,
    disabled: true,
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet-20241022 (Recomendado)' },
      { id: 'claude-3-5-sonnet-20240620', name: 'claude-3-5-sonnet-20240620' },
      { id: 'claude-3-opus-20240229', name: 'claude-3-opus-20240229' },
      { id: 'claude-3-haiku-20240307', name: 'claude-3-haiku-20240307' }
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'LLaMA, Mixtral e outros modelos open-source. Ultra-rápido com latência extremamente baixa.',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    gradient: 'from-[#f55036] to-[#cc2200]',
    textColor: 'text-white',
    borderColor: 'border-[#f55036]/40 hover:border-[#f55036]/70',
    badgeColor: 'bg-white/10 text-white',
    logo: GroqLogo,
    disabled: true,
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'llama-3.3-70b-versatile (Recomendado)' },
      { id: 'llama-3.1-70b-versatile', name: 'llama-3.1-70b-versatile' },
      { id: 'llama-3.1-8b-instant', name: 'llama-3.1-8b-instant' },
      { id: 'mixtral-8x7b-32768', name: 'mixtral-8x7b-32768' }
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek-V3 e R1. Custo ultra-baixo com qualidade comparável ao GPT-4.',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    gradient: 'from-[#4D6BFE] to-[#2244CC]',
    textColor: 'text-white',
    borderColor: 'border-[#4D6BFE]/40 hover:border-[#4D6BFE]/80',
    badgeColor: 'bg-white/10 text-white',
    logo: DeepSeekLogo,
    disabled: true,
    models: [
      { id: 'deepseek-chat', name: 'deepseek-chat (Recomendado)' },
      { id: 'deepseek-reasoner', name: 'deepseek-reasoner' }
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 1.5 Pro e Flash. Multimodal com enorme janela de contexto.',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    gradient: 'from-[#4285F4] via-[#EA4335] to-[#FBBC04]',
    textColor: 'text-white',
    borderColor: 'border-blue-400/40 hover:border-blue-400/80',
    badgeColor: 'bg-white/10 text-white',
    logo: GeminiLogo,
    disabled: true,
    models: [
      { id: 'gemini-1.5-flash', name: 'Gemini 3.1 Flash (Recomendado)' },
      { id: 'gemini-1.5-flash-8b', name: 'Gemini 3.1 Flash-Lite' },
      { id: 'gemini-1.5-pro', name: 'Gemini 3.1 Pro' }
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface AtendeAPITabProps {
  instance: AtendeAIInstance;
  updateConfig: {
    mutateAsync: (updates: Partial<AtendeAIInstance>) => Promise<AtendeAIInstance>;
    isPending: boolean;
  };
}

// ─── Provider Card ────────────────────────────────────────────────────────────

const MASK = '••••••••••••••••••••••••••••••••';

function ProviderCard({
  provider,
  savedKey,
  savedModel,
  isActive,
  onSave,
  isSaving,
  onSetActive,
}: {
  provider: AIProvider;
  savedKey: string;
  savedModel: string;
  isActive: boolean;
  onSave: (id: string, key: string, model: string) => void;
  isSaving: boolean;
  onSetActive: (id: string | null) => void;
}) {
  const [key, setKey] = useState(savedKey ? MASK : '');
  const [model, setModel] = useState(savedModel);
  const [visible, setVisible] = useState(false);
  
  const isKeyDirty = savedKey ? (key !== MASK) : (key !== '');
  const isDirty = isKeyDirty || model !== savedModel;
  const hasKey = !!savedKey;
  const Logo = provider.logo;
  
  useEffect(() => {
    setKey(savedKey ? MASK : '');
    setModel(savedModel);
  }, [savedKey, savedModel]);

  return (
    <div
      className={cn(
        'relative rounded-2xl border transition-all duration-300 overflow-hidden group',
        provider.borderColor,
        isActive && 'ring-2 ring-[#ff7a00] ring-offset-2 ring-offset-white dark:ring-offset-[#0c0c0c]',
        provider.disabled && 'opacity-60 grayscale cursor-not-allowed'
      )}
    >
      {/* Gradient header */}
      <div className={cn('bg-gradient-to-r p-5 flex items-start justify-between gap-4', provider.gradient)}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
            <Logo className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-tight">{provider.name}</h3>
            <p className="text-white/60 text-xs mt-0.5 leading-relaxed max-w-[260px]">
              {provider.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {provider.disabled ? (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-600/50 px-2 py-0.5 rounded-full">
              <AlertCircle className="h-3 w-3" />
              Em breve
            </span>
          ) : hasKey ? (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Configurado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-white/10 text-white/50 border border-white/20 px-2 py-0.5 rounded-full">
              <AlertCircle className="h-3 w-3" />
              Sem chave
            </span>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="p-4 bg-white dark:bg-[#0f0f0f] space-y-3">
        <div className="flex items-center gap-2">
          {/* API Key Input (75%) */}
          <div className="relative flex-[3]">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type={visible && key !== MASK ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onFocus={() => {
                if (key === MASK) setKey('');
              }}
              onBlur={() => {
                if (key === '' && savedKey) setKey(MASK);
              }}
              placeholder={hasKey ? 'Chave de API salva (digite para alterar)' : `Chave de API — ex: ${provider.placeholder}`}
              disabled={provider.disabled}
              className="pl-9 pr-10 h-10 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-[#ff7a00]/30 focus-visible:border-[#ff7a00]/50 transition-colors w-full disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => {
                if (key === MASK) return;
                setVisible(!visible);
              }}
              disabled={provider.disabled || key === MASK}
              title={key === MASK ? "Para sua segurança, chaves salvas não podem ser visualizadas" : ""}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-20"
            >
              {visible && key !== MASK ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Model Select (25%) */}
          <div className="relative flex-[1]">
            <Select value={model} onValueChange={setModel} disabled={provider.disabled}>
              <SelectTrigger className="h-10 w-full rounded-md text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 focus:ring-[#ff7a00]/30 focus:border-[#ff7a00]/50 transition-colors text-zinc-900 dark:text-zinc-100 disabled:opacity-50">
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                {provider.models.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSetActive(isActive ? null : provider.id)}
            disabled={!isActive && (!hasKey || provider.disabled)}
            className={cn(
              "h-8 text-[10px] font-bold uppercase tracking-wider px-3 rounded-lg border transition-all",
              isActive 
                ? "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20" 
                : "text-zinc-500 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            {isActive ? 'Desactivar' : 'Definir como Activo'}
          </Button>

          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors ml-auto", provider.disabled && "pointer-events-none opacity-50")}
          >
            Obter chave <ExternalLink className="h-3 w-3" />
          </a>
          <Button
            size="sm"
            onClick={() => {
              const finalKey = key === MASK ? savedKey! : key;
              onSave(provider.id, finalKey, model);
            }}
            disabled={!isDirty || isSaving || provider.disabled}
            className="h-8 text-xs font-bold bg-[#ff7a00] hover:bg-[#e66d00] text-white rounded-lg px-4 disabled:opacity-40 transition-all"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function AtendeAPITab({ instance, updateConfig }: AtendeAPITabProps) {
  const savedKeys: Record<string, string> = (instance as any).ai_api_keys || {};
  const activeProvider: string = (instance as any).ai_provider || '';

  const handleSave = async (providerId: string, key: string, model: string) => {
    try {
      const updatedKeys = { ...savedKeys, [providerId]: key };
      const updatedModels = { ...(instance.ai_models || {}), [providerId]: model };
      
      // Remove empty keys
      if (!key.trim()) delete updatedKeys[providerId];
      if (!model.trim()) delete updatedModels[providerId];

      await updateConfig.mutateAsync({
        ai_api_keys: updatedKeys,
        ai_models: updatedModels,
      } as any);

      toast.success(`Configuração da ${AI_PROVIDERS.find(p => p.id === providerId)?.name} guardada!`);
    } catch {
      // Error handled by mutation
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    providerId: string | null;
    isDeactivating: boolean;
  }>({ open: false, providerId: null, isDeactivating: false });

  const requestSetActive = (providerId: string | null) => {
    setConfirmModal({
      open: true,
      providerId,
      isDeactivating: providerId === null,
    });
  };

  const handleConfirm = async () => {
    try {
      const { providerId } = confirmModal;
      await updateConfig.mutateAsync({ ai_provider: providerId } as any);
      if (providerId) {
        toast.success(`${AI_PROVIDERS.find(p => p.id === providerId)?.name} definida como API activa!`);
      } else {
        toast.success('Provedor de IA desactivado.');
      }
    } catch {
      // Error handled by mutation
    } finally {
      setConfirmModal({ open: false, providerId: null, isDeactivating: false });
    }
  };

  const [testModalOpen, setTestModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
          <Key className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Gestão de Chaves API
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Conecte os melhores modelos de IA do mundo mantendo o controle total dos custos.
          </p>
        </div>
        
          <div className="ml-auto shrink-0 flex flex-col items-end gap-2">
            {/* Test button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTestModalOpen(true)}
              className="h-8 gap-2 text-[10px] font-bold uppercase tracking-wider border-orange-500/30 text-orange-600 hover:bg-orange-500/10 hover:text-orange-600 transition-all px-3"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Testar IA
            </Button>

            {activeProvider && (
              <div className="shrink-0 flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-1 shadow-sm">
                <div className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </div>
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  {AI_PROVIDERS.find(p => p.id === activeProvider)?.name || activeProvider} Activa
                </span>
              </div>
            )}
          </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">As suas chaves são privadas</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 leading-relaxed">
            As chaves são armazenadas de forma segura e apenas usadas para processar as mensagens do seu atendente. Nunca partilhamos as suas credenciais.
          </p>
        </div>
      </div>

      {/* AI Verification Settings */}
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl border transition-colors",
                instance.ai_verification_enabled 
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-500" 
                  : "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
              )}>
                {instance.ai_verification_enabled ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Verificação de Segurança (Whitelist)</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  Quando activo, o agente Camila enviará mensagens para todos, mas apenas responderá automaticamente a contactos verificados.
                </p>
              </div>
            </div>
            
            <Button
              size="sm"
              variant={instance.ai_verification_enabled ? "default" : "outline"}
              onClick={() => updateConfig.mutateAsync({ ai_verification_enabled: !instance.ai_verification_enabled } as any)}
              disabled={updateConfig.isPending}
              className={cn(
                "h-8 gap-2 text-[10px] font-bold uppercase tracking-wider transition-all px-4 rounded-full",
                instance.ai_verification_enabled 
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/20" 
                  : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              {updateConfig.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : (instance.ai_verification_enabled ? 'Activado' : 'Desactivado')}
            </Button>
          </div>
        </div>
        
        {instance.ai_verification_enabled && (
          <div className="p-5 flex items-start gap-3 bg-blue-500/5">
            <ShieldAlert className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              <strong>Atenção:</strong> Novos contactos não serão atendidos pela IA até que você os "Verifique" manualmente no chat ou envie uma mensagem para eles através do sistema.
            </p>
          </div>
        )}
      </div>

      {/* Provider grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {AI_PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            savedKey={savedKeys[provider.id] || ''}
            savedModel={(instance.ai_models || {})[provider.id] || ''}
            isActive={activeProvider === provider.id}
            onSave={handleSave}
            isSaving={updateConfig.isPending}
            onSetActive={requestSetActive}
          />
        ))}
      </div>

      {/* Test Modal */}
      <TestAIModal open={testModalOpen} onClose={() => setTestModalOpen(false)} instance={instance} />

      {/* Confirmation Modal */}
      <ConfirmProviderModal
        open={confirmModal.open}
        providerName={AI_PROVIDERS.find(p => p.id === confirmModal.providerId)?.name || 'Provedor'}
        isDeactivating={confirmModal.isDeactivating}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmModal({ open: false, providerId: null, isDeactivating: false })}
        isLoading={updateConfig.isPending}
      />
    </div>
  );
}
