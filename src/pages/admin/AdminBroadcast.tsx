import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Megaphone, Send, Loader2, Users, Globe, Star, Zap, Bell,
  AlertTriangle, Gift, Trash2, ChevronDown, ChevronUp, Filter,
  Eye, CheckCircle2, Clock, Sparkles, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatedContainer } from '@/components/ui/animated-container';

const BROADCAST_TYPES = [
  { value: 'general', label: 'Comunicado Geral', emoji: '📨', color: 'from-orange-500 to-orange-600' },
  { value: 'celebration', label: 'Celebração / Meta', emoji: '🎉', color: 'from-amber-400 to-orange-500' },
  { value: 'new_feature', label: 'Nova Funcionalidade', emoji: '✨', color: 'from-violet-500 to-indigo-700' },
  { value: 'call_to_action', label: 'Pedido de Ajuda', emoji: '📣', color: 'from-orange-500 to-rose-600' },
  { value: 'alert', label: 'Aviso Importante', emoji: '⚠️', color: 'from-red-500 to-red-700' },
  { value: 'update', label: 'Actualização', emoji: '🔔', color: 'from-sky-500 to-blue-700' },
];

const COUNTRIES = ['all', 'Moçambique', 'Portugal', 'Brasil', 'Angola', 'Cabo Verde'];
const PLANS = ['all', 'trial', 'arco', 'flexa', 'lanca'];
const PLAN_LABELS: Record<string, string> = { all: 'Todos os Planos', trial: 'Trial', arco: 'Arco', flexa: 'Flexa', lanca: 'Lança' };

const INTERNAL_ROUTES = [
  { value: '/app', label: '🏠 Dashboard' },
  { value: '/app/pipeline', label: '📊 CRM / Pipeline' },
  { value: '/app/prospecting', label: '🎯 Prospecção IA' },
  { value: '/app/clients', label: '👥 Clientes' },
  { value: '/app/academia', label: '🎓 Academia' },
  { value: '/app/team', label: '🧑‍🤝‍🧑 Equipa' },
  { value: '/app/ai-assistant', label: '🤖 Agente QIA' },
  { value: '/app/atende-ai', label: '⚡ Atende AI' },
  { value: '/app/subscription', label: '💳 Assinatura' },
  { value: '/app/upgrade', label: '⭐ Upgrade Planos' },
  { value: '/app/support', label: '🎧 Suporte' },
  { value: '/app/finance', label: '💰 Finanças' },
  { value: '/app/social-media', label: '📱 Gestão Redes Sociais' },
  { value: 'custom', label: '🔗 Link Personalizado...' },
];

interface Broadcast {
  id: string;
  title: string;
  message: string;
  broadcast_type: string;
  target_role: string;
  target_plan: string;
  target_country: string;
  show_as_modal: boolean;
  emoji: string | null;
  cta_label: string | null;
  cta_url: string | null;
  created_at: string;
}

export default function AdminBroadcast() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('general');
  const [targetRole, setTargetRole] = useState('all');
  const [targetPlan, setTargetPlan] = useState('all');
  const [targetCountry, setTargetCountry] = useState('all');
  const [showAsModal, setShowAsModal] = useState(true);
  const [emoji, setEmoji] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaRouteMode, setCtaRouteMode] = useState('custom');
  const [ctaUrl, setCtaUrl] = useState('');

  const fetchBroadcasts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('notifications')
      .select('*')
      .eq('is_broadcast', true)
      .order('created_at', { ascending: false });

    if (!error) setBroadcasts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Preencha o título e a mensagem', variant: 'destructive' });
      return;
    }
    if (!user) return;

    setSending(true);
    try {
      const selectedType = BROADCAST_TYPES.find(t => t.value === broadcastType);
      const { error } = await (supabase as any)
        .from('notifications')
        .insert({
          title: title.trim(),
          message: message.trim(),
          type: 'general',
          is_broadcast: true,
          broadcast_type: broadcastType,
          target_role: targetRole,
          target_plan: targetPlan,
          target_country: targetCountry,
          show_as_modal: showAsModal,
          emoji: emoji.trim() || selectedType?.emoji || null,
          cta_label: ctaLabel.trim() || null,
          cta_url: (ctaRouteMode === 'custom' ? ctaUrl.trim() : ctaRouteMode) || null,
          created_by: user.id,
        });

      if (error) throw error;

      toast({ title: 'Broadcast enviado!', description: 'A notificação foi criada com sucesso.' });
      // Reset form
      setTitle(''); setMessage(''); setBroadcastType('general'); setTargetRole('all');
      setTargetPlan('all'); setTargetCountry('all'); setShowAsModal(true);
      setEmoji(''); setCtaLabel(''); setCtaRouteMode('custom'); setCtaUrl('');
      setShowForm(false);
      fetchBroadcasts();
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('notifications').delete().eq('id', id);
    if (!error) {
      setBroadcasts(prev => prev.filter(b => b.id !== id));
      toast({ title: 'Broadcast eliminado' });
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-broadcast', {
        body: { prompt: aiPrompt.trim() }
      });
      if (error) throw error;
      if (data) {
        if (data.title) setTitle(data.title);
        if (data.message) setMessage(data.message);
        if (data.broadcast_type) setBroadcastType(data.broadcast_type);
        if (data.emoji) setEmoji(data.emoji);
        if (data.cta_label) setCtaLabel(data.cta_label);
        if (data.cta_url) {
          const isInternal = INTERNAL_ROUTES.find(r => r.value !== 'custom' && (r.value === data.cta_url || data.cta_url.endsWith(r.value)));
          if (isInternal) {
            setCtaRouteMode(isInternal.value);
            setCtaUrl('');
          } else {
            setCtaRouteMode('custom');
            setCtaUrl(data.cta_url);
          }
        }
        setAiModalOpen(false);
        setAiPrompt('');
        toast({ title: 'Preenchido com IA!', description: 'Os campos foram atualizados.' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao gerar', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingAI(false);
    }
  };

  const selectedTypeConfig = BROADCAST_TYPES.find(t => t.value === broadcastType);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <AnimatedContainer animation="fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-primary flex items-center justify-center shadow-lg">
                <Megaphone className="h-5 w-5 text-white" />
              </div>
              Broadcasts
            </h1>
            <p className="text-muted-foreground mt-1">Envie comunicados para os utilizadores da plataforma</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2 bg-gradient-to-r from-orange-500 to-primary hover:opacity-90 text-white border-0 shadow-lg shadow-primary/20"
          >
            <Megaphone className="h-4 w-4" />
            Novo Broadcast
          </Button>
        </div>
      </AnimatedContainer>

      {/* Compose Form */}
      {showForm && (
        <AnimatedContainer animation="fade-up" delay={0.05}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
            {/* Form Side */}
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-lg">
              {/* Form header gradient preview */}
              <div className={`h-2 bg-gradient-to-r ${selectedTypeConfig?.color || 'from-orange-500 to-primary'}`} />

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{emoji || selectedTypeConfig?.emoji}</span>
                    <h2 className="text-lg font-bold">Compor Broadcast</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAiModalOpen(true)} className="gap-2 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border-violet-500/20">
                    <Sparkles className="h-4 w-4" />
                    Preencher com IA
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Type */}
                <div className="space-y-2">
                  <Label>Tipo de Mensagem</Label>
                  <Select value={broadcastType} onValueChange={setBroadcastType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BROADCAST_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.emoji} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Emoji override */}
                <div className="space-y-2">
                  <Label>Emoji personalizado <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                  <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🚀" maxLength={4} />
                </div>

                {/* Title */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Título *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Celebramos os primeiros 100 utilizadores!" />
                </div>

                {/* Message */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Mensagem *</Label>
                  <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Escreva a sua mensagem aqui. Pode usar múltiplas linhas."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Audience Targeting */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  Audiência Alvo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Papel (Role)</Label>
                    <Select value={targetRole} onValueChange={setTargetRole}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">👥 Todos</SelectItem>
                        <SelectItem value="owner">👑 Owner</SelectItem>
                        <SelectItem value="user">👤 User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">País</Label>
                    <Select value={targetCountry} onValueChange={setTargetCountry}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c} value={c}>
                            {c === 'all' ? '🌍 Todos os países' : `🌐 ${c}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Plano</Label>
                    <Select value={targetPlan} onValueChange={setTargetPlan}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANS.map(p => (
                          <SelectItem key={p} value={p}>{PLAN_LABELS[p] || p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Botão de Acção (CTA) <span className="text-muted-foreground font-normal text-xs">— opcional</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5 md:col-span-1">
                    <Label className="text-xs text-muted-foreground">Texto do Botão</Label>
                    <Input value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="Ex: Partilhar agora" className="h-9" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs text-muted-foreground">URL de destino</Label>
                    <div className="flex gap-2">
                      <Select value={ctaRouteMode} onValueChange={setCtaRouteMode}>
                        <SelectTrigger className="h-9 w-[200px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERNAL_ROUTES.map(route => (
                            <SelectItem key={route.value} value={route.value}>
                              {route.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {ctaRouteMode === 'custom' && (
                        <Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} placeholder="https://..." className="h-9 flex-1" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Show as modal toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div>
                  <p className="text-sm font-medium">Mostrar como Modal</p>
                  <p className="text-xs text-muted-foreground">Aparece em popup ao abrir a plataforma</p>
                </div>
                <Switch checked={showAsModal} onCheckedChange={setShowAsModal} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSend}
                  disabled={sending || !title || !message}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-primary hover:opacity-90 text-white border-0 py-6 text-base font-semibold shadow-lg gap-2"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {sending ? 'Enviando...' : 'Enviar Broadcast'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="px-6">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Side */}
          <div className="hidden lg:block sticky top-24">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview no Utilizador
            </h3>
            <div className="rounded-xl border border-border/10 bg-[#1c1c1e] text-white overflow-hidden shadow-2xl relative w-[380px] mx-auto scale-[0.95] origin-top">
              {/* Header gradient */}
              <div className={`bg-gradient-to-br ${selectedTypeConfig?.color || 'from-orange-500 to-orange-600'} p-8 text-center relative overflow-hidden`}>
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-28 h-28 rounded-full bg-black/15 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/20">
                    <span className="text-3xl leading-none">{emoji || selectedTypeConfig?.emoji}</span>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border bg-white/10 text-white border-white/20 mb-3`}>
                    {selectedTypeConfig?.label || 'Comunicado'}
                  </span>
                  <h2 className="text-2xl font-black text-white leading-snug mb-2">
                    {title || 'Título do Broadcast'}
                  </h2>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                <p className="text-sm text-zinc-300 leading-relaxed text-center whitespace-pre-line">
                  {message || 'A mensagem do seu broadcast aparecerá aqui. Escreva algo para ver como fica.'}
                </p>

                <div className="flex flex-col gap-3">
                  {ctaLabel && (
                    <Button className={`w-full bg-gradient-to-r ${selectedTypeConfig?.color || 'from-orange-500 to-orange-600'} hover:opacity-90 text-white border-0 py-6 text-base font-semibold shadow-lg gap-2 pointer-events-none`}>
                      {ctaLabel}
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 h-12 pointer-events-none">
                    {ctaUrl ? 'Talvez depois' : 'Entendido, obrigado!'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedContainer>
    )}

      {/* Broadcasts List */}
      <AnimatedContainer animation="fade-up" delay={0.1}>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico de Broadcasts ({broadcasts.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border/50">
              <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum broadcast enviado ainda</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Clique em "Novo Broadcast" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => {
                const typeConfig = BROADCAST_TYPES.find(t => t.value === b.broadcast_type);
                return (
                  <div key={b.id} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-colors group">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${typeConfig?.color || 'from-orange-500 to-primary'} flex items-center justify-center text-xl flex-shrink-0`}>
                      {b.emoji || typeConfig?.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{b.title}</span>
                        {b.show_as_modal && <Badge variant="outline" className="text-[10px] shrink-0">Modal</Badge>}
                        <Badge variant="secondary" className="text-[10px] shrink-0">{typeConfig?.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{b.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {b.target_role === 'all' ? 'Todos' : b.target_role === 'owner' ? 'Owner' : 'User'}
                        </span>
                        {b.target_country !== 'all' && (
                          <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{b.target_country}</span>
                        )}
                        {b.target_plan !== 'all' && (
                          <span>{PLAN_LABELS[b.target_plan] || b.target_plan}</span>
                        )}
                        <span className="flex items-center gap-1 ml-auto">
                          <Clock className="h-3 w-3" />
                          {format(new Date(b.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                      onClick={() => handleDelete(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AnimatedContainer>

      {/* AI Modal */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Preencher com IA (GPT-4o mini)
            </DialogTitle>
            <DialogDescription>
              Descreva o que deseja comunicar. A IA vai redigir o título, a mensagem, escolher o tipo de alerta e um emoji adequado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Ex: Quero avisar que lançamos a integração com o WhatsApp na secção de agentes IA. É uma grande novidade!"
              rows={4}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              className="resize-none"
            />
            <Button
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-md"
              onClick={handleGenerateAI}
              disabled={generatingAI || !aiPrompt.trim()}
            >
              {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generatingAI ? 'Gerando...' : 'Gerar Broadcast'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
