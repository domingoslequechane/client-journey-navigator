import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { slugify } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Search,
  MapPin,
  Phone,
  Star,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  AlertTriangle,
  Zap,
  Target,
  Clock,
  BarChart3,
  UserPlus,
  Users,
  Globe,
  Instagram,
  MessageCircle,
  Shield,
  X,
  PartyPopper,
  History,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Map,
  BrainCircuit,
  CheckCircle2,
  Lock,
  Crown,
  ArrowRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Prospect {
  id: string;
  name: string;
  rating: number;
  type: string;
  status: string;
  address: string;
  phone: string;
  positioning: 'baixo' | 'médio' | 'médio-alto' | 'alto';
  positioningLabel: string;
  services: string[];
  targetAudience: string[];
  digitalPresence: string[];
  opportunities: string[];
  pitchIdeal: string;
  conversionPotential: 'alto' | 'médio' | 'baixo';
  estimatedBudget: 'pequeno' | 'médio' | 'grande';
  lat: number;
  lng: number;
  recommended?: boolean;
  recommendedReason?: string;
  compatibilityScore?: number;
  // ─── Premium Intelligence Fields ─────────────────────────────
  opportunityData?: {
    score: number;
    classification: string;
    breakdown: {
      financialPotential: number;
      digitalMaturity: number;
      need: number;
      fit: number;
      closingEase: number;
    };
    explanations: string[];
  };
  impactEstimate?: {
    newClientsPerMonth: string;
    averageTicket: string;
    additionalRevenue: string;
    paybackEstimate: string;
  };
  gapAnalysis?: string[];
  decisionProfile?: {
    speed: string;
    focus: string;
    mindset: string;
    sensitivity: string;
    bestApproach: string;
  };
  benchmark?: {
    digitalPresence: string;
    content: string;
    ads: string;
    summary?: string;
  };
  urgencyLevel?: 'ALTA' | 'MÉDIA' | 'BAIXA';
  urgencyReasons?: string[];
  whyNow?: string[];
  clientArchetype?: string;
  closingProbability?: number;
  closingFactors?: string[];
  campaignIdeas?: Array<{
    name: string;
    description: string;
    expectedResult: string;
  }>;
  dynamicScript?: string;
  nextBestAction?: string;
  smartFollowUp?: string[];
  // Legacy fields kept for backwards compat
  estimatedRevenue?: string;
  estimatedLeads?: string;
  decisionProfileLegacy?: string[];
}

interface HistoryEntry extends Prospect {
  location: string;
  segment: string;
  foundAt: string;
}

interface MarketInsights {
  totalEstimatedBusinesses: number;
  averageDigitalMaturity: 'baixo' | 'médio' | 'alto';
  topOpportunities: string[];
  threatAnalysis: string[];
  recommendedApproach: string;
  estimatedConversionRate: string;
  bestContactTime: string;
  segmentTrend: 'crescente' | 'estável' | 'declinante';
}

// ─── Helper components ───────────────────────────────────────────────────────
const StarRating = ({ rating }: { rating: number | null }) => (
  <div className="flex items-center gap-1">
    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
    <span className="text-xs font-semibold text-amber-400">{(rating ?? 0).toFixed(1)}</span>
  </div>
);

const RecommendedBadge = ({ reason, score }: { reason?: string; score?: number }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
      ⭐ Recomendado pela QIA
    </span>
    {reason && <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">{reason}</span>}
  </div>
);

const PotentialBadge = ({ value }: { value: string }) => {
  const colors: Record<string, string> = {
    alto: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    médio: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    baixo: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', colors[value] ?? colors.médio)}>
      {value === 'alto' ? '🔥 Alto' : value === 'médio' ? '⚡ Médio' : '🧊 Baixo'}
    </span>
  );
};

const DigitalPlatformIcon = ({ platform }: { platform: string }) => {
  const name = (platform || '').toLowerCase();
  if (name.includes('instagram')) return <Instagram className="h-3.5 w-3.5" />;
  if (name.includes('whatsapp')) return <MessageCircle className="h-3.5 w-3.5" />;
  if (name.includes('facebook')) return <Globe className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
};


// ─── Prospect Card ────────────────────────────────────────────────────────────
const ProspectCard = ({
  prospect,
  isSelected,
  onToggle,
}: {
  prospect: Prospect;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  const positioningColors: Record<string, string> = {
    'baixo': 'text-slate-400',
    'médio': 'text-amber-400',
    'médio-alto': 'text-orange-400',
    'alto': 'text-emerald-400',
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border transition-all duration-200',
        isSelected
          ? 'border-primary/60 bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border/40 bg-card hover:border-border'
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center z-10">
          <CheckCheck className="h-3 w-3 text-primary-foreground" />
        </div>
      )}

      <div className="p-4">
        {prospect.recommended && (
          <div className="mb-2">
            <RecommendedBadge reason={prospect.recommendedReason} score={prospect.compatibilityScore} />
          </div>
        )}
        {/* Header */}
        <div className="flex items-start gap-3">
          <Checkbox
            id={`prospect-${prospect.id}`}
            checked={isSelected}
            onCheckedChange={() => onToggle(prospect.id)}
            className="mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-sm leading-tight">{prospect.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{prospect.type}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {prospect.opportunityData ? (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-2 py-0.5 rounded-md border border-orange-500/30">
                    <span className="text-[10px] font-bold text-orange-500 uppercase">🔥 Pontuação:</span>
                    <span className="text-sm font-black text-foreground">{prospect.opportunityData.score}/100</span>
                  </div>
                ) : (
                  <StarRating rating={prospect.rating} />
                )}
                {!prospect.opportunityData && <PotentialBadge value={prospect.conversionPotential} />}
                {prospect.opportunityData && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary/50 text-foreground border border-border/50">
                    {prospect.opportunityData.classification}
                  </span>
                )}
              </div>
            </div>

            {prospect.estimatedRevenue && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 mb-2 text-xs font-medium">
                <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  💰 Receita est.: {prospect.estimatedRevenue}
                </span>
                {prospect.estimatedLeads && (
                  <span className="flex items-center gap-1 text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    💡 Potencial: {prospect.estimatedLeads}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {prospect.address}
              </span>
              {prospect.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {prospect.phone}
                </span>
              )}
            </div>

            {/* Positioning & Digital presence */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={cn('text-[10px] font-semibold', positioningColors[prospect.positioning])}>
                ⭐ {prospect.positioningLabel}
              </span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                (prospect.status || '').toLowerCase().includes('aberto') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              )}>
                {prospect.status}
              </span>
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1 border-t border-border/30"
        >
          <span>Ver perfil completo</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <Separator className="opacity-30" />

            {/* ── Impact Estimate Banner ── */}
            {prospect.impactEstimate && (
              <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-3 border border-emerald-500/20">
                <p className="text-[10px] uppercase font-bold text-emerald-500 mb-2">📈 Estimativa de Impacto</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Novos clientes:</span>
                    <p className="font-bold text-foreground">{prospect.impactEstimate.newClientsPerMonth}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ticket médio:</span>
                    <p className="font-bold text-foreground">{prospect.impactEstimate.averageTicket}</p>
                    <p className="text-[9px] text-muted-foreground/80 italic mt-0.5 leading-tight">Valor médio gasto por cliente</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">💰 Receita adicional:</span>
                    <p className="font-bold text-emerald-500 text-sm">{prospect.impactEstimate.additionalRevenue}</p>
                    <p className="text-[9px] text-muted-foreground/80 italic mt-0.5 leading-tight">Estimativa de facturação extra por mês</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">⏱️ Payback estimado:</span>
                    <span className="ml-1 font-semibold text-foreground">{prospect.impactEstimate.paybackEstimate}</span>
                    <p className="text-[9px] text-muted-foreground/80 italic mt-0.5 leading-tight">Tempo necessário para o cliente recuperar o valor que vai pagar à tua agência</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Gap Analysis ── */}
            {prospect.gapAnalysis && prospect.gapAnalysis.length > 0 && (
              <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 relative overflow-hidden">
                <div className="absolute left-0 top-0 h-full w-1 bg-destructive rounded-l-lg" />
                <p className="text-[10px] uppercase tracking-wider font-bold text-destructive flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-3 w-3" /> 🚨 O que está a perder:
                </p>
                <ul className="space-y-1">
                  {prospect.gapAnalysis.map((gap, idx) => (
                    <li key={idx} className="text-xs text-foreground/80">{gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Urgency + Closing Probability ── */}
            <div className="grid grid-cols-2 gap-2">
              {prospect.urgencyLevel && (
                <div className={`rounded-lg p-3 border text-center ${
                  prospect.urgencyLevel === 'ALTA'
                    ? 'bg-red-500/10 border-red-500/20'
                    : prospect.urgencyLevel === 'MÉDIA'
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-secondary/50 border-border/40'
                }`}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">⏱️ Urgência</p>
                  <p className={`text-sm font-black ${
                    prospect.urgencyLevel === 'ALTA' ? 'text-red-500' : prospect.urgencyLevel === 'MÉDIA' ? 'text-amber-500' : 'text-foreground'
                  }`}>{prospect.urgencyLevel}</p>
                </div>
              )}
              {prospect.closingProbability && (
                <div className="rounded-lg p-3 border bg-primary/5 border-primary/20 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">🎯 Fecho</p>
                  <p className="text-sm font-black text-primary">{prospect.closingProbability}%</p>
                  <div className="h-1 bg-background/50 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${prospect.closingProbability}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* ── Decision Profile ── */}
            {prospect.decisionProfile && typeof prospect.decisionProfile === 'object' && !Array.isArray(prospect.decisionProfile) && (
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1 mb-2">
                  <BrainCircuit className="h-3 w-3 text-primary" /> 🧠 Como o Dono Decide:
                </p>
                <div className="space-y-1.5 text-xs">
                  <p><span className="text-muted-foreground">Decisão:</span> <span className="font-semibold text-foreground">{(prospect.decisionProfile as any).speed}</span></p>
                  <p><span className="text-muted-foreground">Foco:</span> <span className="font-semibold text-foreground">{(prospect.decisionProfile as any).focus}</span></p>
                  <p><span className="text-muted-foreground">Mentalidade:</span> <span className="text-foreground/80">{(prospect.decisionProfile as any).mindset}</span></p>
                  <p className="text-primary font-medium">👉 {(prospect.decisionProfile as any).bestApproach}</p>
                </div>
              </div>
            )}

            {/* ── Benchmark ── */}
            {prospect.benchmark && (
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1 mb-2">
                  <TrendingDown className="h-3 w-3 text-orange-500" /> 📉 Benchmark Local:
                </p>
                <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                  {[
                    { label: 'Digital', value: prospect.benchmark.digitalPresence },
                    { label: 'Conteúdo', value: prospect.benchmark.content },
                    { label: 'Ads', value: prospect.benchmark.ads },
                  ].map(item => (
                    <div key={item.label} className="bg-orange-500/10 border border-orange-500/20 rounded-md p-1.5">
                      <p className="text-muted-foreground">{item.label}</p>
                      <p className="font-bold text-orange-500">{item.value}</p>
                    </div>
                  ))}
                </div>
                {prospect.benchmark.summary && (
                  <p className="text-[10px] text-muted-foreground italic mt-2">{prospect.benchmark.summary}</p>
                )}
              </div>
            )}

            {/* ── Next Best Action ── */}
            {prospect.nextBestAction && (
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                <p className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1.5">
                  👉 Próxima Acção Recomendada:
                </p>
                <p className="text-xs text-foreground font-medium">{prospect.nextBestAction}</p>
              </div>
            )}

            {/* ── Campaign Ideas ── */}
            {prospect.campaignIdeas && prospect.campaignIdeas.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">🚀 Campanhas Prontas:</p>
                <div className="space-y-2">
                  {(prospect.campaignIdeas as any[]).map((idea, idx) => (
                    <div key={idx} className="bg-secondary/40 rounded-md p-2.5 border border-border/40">
                      {typeof idea === 'object' ? (
                        <>
                          <p className="text-xs font-bold text-foreground">{idea.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{idea.description}</p>
                          <p className="text-[10px] text-emerald-500 mt-1">✅ {idea.expectedResult}</p>
                        </>
                      ) : (
                        <p className="text-xs text-foreground">{idea}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Dynamic Script ── */}
            {prospect.dynamicScript && (
              <div className="bg-background/50 rounded-lg p-3 border-l-2 border-blue-500/60 border border-border/50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-blue-500 mb-1.5">
                  📞 Script de Abordagem:
                </p>
                <p className="text-xs text-foreground/90 italic leading-relaxed">"{prospect.dynamicScript}"</p>
              </div>
            )}

            {/* ── Why Now ── */}
            {prospect.whyNow && prospect.whyNow.length > 0 && (
              <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mb-2">🔥 Por Que Agir Agora:</p>
                <ul className="space-y-1">
                  {prospect.whyNow.map((reason, idx) => (
                    <li key={idx} className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <span className="text-amber-500 shrink-0">⚡</span> {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Smart Follow-up ── */}
            {prospect.smartFollowUp && prospect.smartFollowUp.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">🔁 Follow-up Inteligente:</p>
                <div className="space-y-1.5">
                  {prospect.smartFollowUp.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="h-5 w-5 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                      <p className="text-xs text-foreground/80">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Closing Factors ── */}
            {prospect.closingFactors && prospect.closingFactors.length > 0 && (
              <div className="bg-background/50 rounded-lg p-3 border border-border/40">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">🎯 Factores de Fecho:</p>
                <ul className="space-y-1">
                  {prospect.closingFactors.map((f, i) => (
                    <li key={i} className="text-xs text-foreground/80">{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Client Archetype (footer tag) ── */}
            {prospect.clientArchetype && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">🧩 Arquétipo:</span>
                <span className="text-[10px] font-semibold bg-secondary/60 border border-border/50 px-2 py-0.5 rounded-full text-foreground">
                  {prospect.clientArchetype}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Market Insights Section ──────────────────────────────────────────────────
const MarketInsightsPanel = ({ insights }: { insights: MarketInsights }) => {
  const trendIcon = insights.segmentTrend === 'crescente'
    ? <TrendingUp className="h-4 w-4 text-emerald-400" />
    : insights.segmentTrend === 'declinante'
    ? <TrendingDown className="h-4 w-4 text-red-400" />
    : <Minus className="h-4 w-4 text-amber-400" />;

  const maturityColors: Record<string, string> = {
    baixo: 'text-red-400',
    médio: 'text-amber-400',
    alto: 'text-emerald-400',
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-card p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Insights Críticos do Mercado</h3>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-secondary/40 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Empresas Estimadas</p>
          <p className="text-xl font-bold text-primary">{insights.totalEstimatedBusinesses}</p>
        </div>
        <div className="rounded-lg bg-secondary/40 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Maturidade Digital</p>
          <p className={cn('text-base font-bold capitalize', maturityColors[insights.averageDigitalMaturity])}>
            {insights.averageDigitalMaturity}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/40 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Taxa de Conversão Est.</p>
          <p className="text-base font-bold text-emerald-400">{insights.estimatedConversionRate}</p>
        </div>
        <div className="rounded-lg bg-secondary/40 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Tendência</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {trendIcon}
            <p className="text-sm font-bold capitalize">{insights.segmentTrend}</p>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Opportunities */}
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Principais Oportunidades
          </p>
          <ul className="space-y-1.5">
            {insights.topOpportunities.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
                {o}
              </li>
            ))}
          </ul>
        </div>

        {/* Threats */}
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-red-400" />
            Análise de Ameaças
          </p>
          <ul className="space-y-1.5">
            {insights.threatAnalysis.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Approach */}
      <div className="rounded-lg bg-primary/8 border border-primary/20 p-4">
        <p className="text-xs uppercase tracking-wider font-semibold text-primary mb-2 flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          Abordagem Recomendada
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">{insights.recommendedApproach}</p>
      </div>

      {/* Best time */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 text-primary shrink-0" />
        <span><strong className="text-foreground">Melhor horário de contacto:</strong> {insights.bestContactTime}</span>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProspectingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [segment, setSegment] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('5km');
  const [ignorePrevious, setIgnorePrevious] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchedLocation, setSearchedLocation] = useState('');
  
  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryEntry | null>(null);
  const [historySortBy, setHistorySortBy] = useState<'date' | 'potential'>('date');

  // Import flow state
  type ImportState = 'idle' | 'confirm' | 'importing' | 'done';
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importProgress, setImportProgress] = useState(0); 
  const [importTotal, setImportTotal] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const { organizationId, organization } = useOrganizationContext();
  const { canProspect, incrementUsage, remainingProspecting, planType, canAddClient, remainingClients } = usePlanLimits();
  const { isActive, isTrialing, hasAccess, isPaidPlan } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // A plan that exists but is expired/inactive = 0 credits (no access)
  const subscriptionIsValid = isActive || isTrialing || (!isPaidPlan && !hasAccess === false);
  const effectiveCanProspect = subscriptionIsValid ? canProspect : false;
  const effectiveRemaining = subscriptionIsValid ? remainingProspecting : 0;
  const isExpiredPlan = !subscriptionIsValid && planType !== null;

  // Load history on mount
  useEffect(() => {
    if (!organizationId) return;

    const fetchHistory = async () => {
      const { data, error } = await (supabase as any)
        .from('prospecting_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) {
        console.error('Failed to load history', error);
      } else if (data) {
        const parsedHistory = data.map(row => ({
          ...row.data,
          dbId: row.id
        }));
        setHistory(parsedHistory);
      }
    };

    fetchHistory();
  }, [organizationId]);

  // Save history helper
  const saveHistory = useCallback((newEntries: HistoryEntry[]) => {
    if (!organizationId) return;

    setHistory(prev => {
      const prevNames = new Set(prev.map(p => (p.name || '').toLowerCase()));
      const filtered = newEntries.filter(n => !prevNames.has((n.name || '').toLowerCase()));
      
      if (filtered.length > 0) {
        const insertData = filtered.map(n => ({
          organization_id: organizationId,
          name: n.name,
          segment: n.segment,
          location: n.location,
          data: n
        }));
        
        (supabase as any).from('prospecting_history').insert(insertData).then(({ error }: any) => {
          if (error) console.error('Failed to save history to DB:', error);
        });
      }

      return [...filtered, ...prev].slice(0, 100);
    });
  }, [organizationId]);

  const handleConfirmClearHistory = async () => {
    if (!organizationId) return;

    setHistory([]);
    setIsClearHistoryModalOpen(false);

    const { error } = await (supabase as any)
      .from('prospecting_history')
      .delete()
      .eq('organization_id', organizationId);
      
    if (error) {
      console.error('Failed to clear DB history', error);
      toast({ title: 'Erro ao limpar histórico na base de dados', variant: 'destructive' });
    }
  };

  const loadingSteps = [
    { icon: <Map className="h-8 w-8 text-blue-500" />, text: 'A Prospectar...' },
    { icon: <Instagram className="h-8 w-8 text-pink-500" />, text: 'A analisar redes sociais (Instagram, Facebook)...' },
    { icon: <Globe className="h-8 w-8 text-indigo-500" />, text: 'A verificar sites e presença digital...' },
    { icon: <BrainCircuit className="h-8 w-8 text-purple-500" />, text: 'A gerar perfis e insights de mercado...' },
    { icon: <CheckCircle2 className="h-8 w-8 text-emerald-500" />, text: 'Quase pronto! A organizar os resultados...' },
  ];

  const handleSearch = async () => {
    if (!segment.trim() || !location.trim()) {
      toast({ title: 'Preencha o segmento e a localização', variant: 'destructive' });
      return;
    }

    if (!effectiveCanProspect) {
      setShowUpgradeModal(true);
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    setProspects([]);
    setMarketInsights(null);
    setSelectedIds(new Set());

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 6000);

    try {
      const agencyProfile = organization ? {
        name: organization.name,
        currency: organization.currency,
        planType: organization.plan_type,
      } : {};

      const excludedNames = ignorePrevious ? history.map(h => h.name) : [];

      // Also exclude existing clients so AI doesn't re-suggest them
      const { data: existingClients } = await (supabase as any)
        .from('clients')
        .select('company_name')
        .eq('organization_id', organizationId)
        .eq('source', 'ai_prospecting');
      if (existingClients) {
        existingClients.forEach((c: any) => {
          if (!excludedNames.includes(c.company_name)) excludedNames.push(c.company_name);
        });
      }

      const { data, error } = await supabase.functions.invoke('prospect-companies', {
        body: { 
          segment: segment.trim(), 
          location: location.trim(), 
          radius,
          agencyProfile,
          excludedNames,
          sessionId: Date.now().toString()
        },
      });

      if (error) {
        const message = (error as any)?.context
          ? await (error as any).context.json().then((j: any) => j?.error || error.message).catch(() => error.message)
          : error.message;
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      const normalized = (data.prospects || []).map((p: any) => ({
        ...p,
        rating: p.rating ?? 0,
        services: p.services ?? [],
        targetAudience: p.targetAudience ?? [],
        digitalPresence: p.digitalPresence ?? [],
        opportunities: p.opportunities ?? [],
        status: p.status ?? 'Desconhecido',
        conversionPotential: p.conversionPotential ?? 'médio',
        recommended: !!p.recommended,
        recommendedReason: p.recommendedReason,
        compatibilityScore: p.compatibilityScore,
      }));
      setProspects(normalized);
      setMarketInsights(data.marketInsights || null);
      setSearchedLocation(location.trim());

      if (normalized.length > 0) {
        saveHistory(normalized.map((p: any) => ({
          ...p,
          location: location.trim(),
          segment: segment.trim(),
          foundAt: new Date().toISOString(),
        })));
      }

      // Decrement prospecting credit
      await incrementUsage('prospecting');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Erro na prospecção',
        description: String(err),
        variant: 'destructive',
      });
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map((p) => p.id)));
    }
  };

  const handleAddToClients = () => {
    if (selectedIds.size === 0) return;
    setImportState('confirm');
  };

  const handleConfirmImport = async () => {
    if (!canAddClient) {
      setShowUpgradeModal(true);
      return;
    }
    const toImport = prospects.filter((p) => selectedIds.has(p.id));
    setImportTotal(toImport.length);
    setImportProgress(0);
    setImportErrors([]);
    setImportState('importing');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Erro', description: 'Sessão expirada', variant: 'destructive' });
      setImportState('idle');
      return;
    }

    const errors: string[] = [];
    for (let i = 0; i < toImport.length; i++) {
      const p = toImport[i];
      try {
        const baseSlug = slugify(p.name);
        const slug = `${baseSlug}-${Date.now()}-${i}`;
        const aiIntelligence = {
          prospectedAt: new Date().toISOString(),
          segment: segment,
          location: location,
          conversionPotential: p.conversionPotential,
          compatibilityScore: p.compatibilityScore,
          recommended: p.recommended,
          recommendedReason: p.recommendedReason,
          rating: p.rating,
          services: p.services,
          opportunities: p.opportunities,
          digitalPresence: p.digitalPresence,
          targetAudience: p.targetAudience,
          pitchIdeal: p.pitchIdeal,
          dynamicScript: p.dynamicScript,
          gapAnalysis: p.gapAnalysis,
          decisionProfile: p.decisionProfile,
          campaignIdeas: p.campaignIdeas,
          smartFollowUp: p.smartFollowUp,
          nextBestAction: p.nextBestAction,
          benchmark: p.benchmark,
          impactEstimate: p.impactEstimate,
          closingProbability: p.closingProbability,
          opportunityData: p.opportunityData,
        };
        const { error } = await supabase.from('clients').insert({
          company_name: p.name,
          contact_name: p.name,
          phone: p.phone || null,
          address: p.address || null,
          source: 'ai_prospecting',
          notes: `Prospecto importado via Prospecção IA\nSegmento: ${segment}\nPotencial: ${p.conversionPotential}\nPitch: ${p.pitchIdeal}`,
          qualification: p.conversionPotential === 'alto' ? 'hot' : p.conversionPotential === 'médio' ? 'warm' : 'cold',
          current_stage: 'prospeccao' as const,
          user_id: user.id,
          organization_id: organizationId,
          slug,
          ai_intelligence: aiIntelligence,
        });
        if (error) errors.push(`${p.name}: ${error.message}`);
        else {
          // Remove successfully imported prospect from history
          const importedName = p.name.toLowerCase();
          setHistory(prev => prev.filter(h => h.name.toLowerCase() !== importedName));
          await (supabase as any).from('prospecting_history')
            .delete().eq('organization_id', organizationId).eq('name', p.name);
        }
      } catch (err) {
        errors.push(`${p.name}: erro desconhecido`);
      }
      setImportProgress(i + 1);
      await new Promise((r) => setTimeout(r, 400));
    }

    setImportErrors(errors);
    setImportState('done');
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(`prospecting_history_${organizationId}`, JSON.stringify(updated));
      return updated;
    });
    setSelectedHistoryItem(null);
    toast({ title: 'Removido do histórico' });
  };

  const handleImportSingleHistoryItem = async (item: HistoryEntry) => {
    if (!canAddClient) {
      setShowUpgradeModal(true);
      return;
    }
    if (!organizationId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSelectedHistoryItem(null);
    setImportTotal(1);
    setImportProgress(0);
    setImportErrors([]);
    setImportState('importing');

    try {
      const baseSlug = slugify(item.name);
      const slug = `${baseSlug}-${Date.now()}`;
      const aiIntelligence = {
        prospectedAt: item.foundAt || new Date().toISOString(),
        segment: item.segment,
        location: item.location,
        conversionPotential: item.conversionPotential,
        compatibilityScore: item.compatibilityScore,
        recommended: item.recommended,
        recommendedReason: item.recommendedReason,
        rating: item.rating,
        services: item.services,
        opportunities: item.opportunities,
        digitalPresence: item.digitalPresence,
        targetAudience: item.targetAudience,
        pitchIdeal: item.pitchIdeal,
        dynamicScript: item.dynamicScript,
        gapAnalysis: item.gapAnalysis,
        decisionProfile: item.decisionProfile,
        campaignIdeas: item.campaignIdeas,
        smartFollowUp: item.smartFollowUp,
        nextBestAction: item.nextBestAction,
        benchmark: item.benchmark,
        impactEstimate: item.impactEstimate,
        closingProbability: item.closingProbability,
        opportunityData: item.opportunityData,
      };
      const { error } = await supabase.from('clients').insert({
        company_name: item.name,
        contact_name: item.name,
        phone: item.phone || null,
        address: item.address || null,
        source: 'ai_prospecting',
        notes: `Prospecto importado via Histórico de Prospecção IA\nSegmento: ${item.segment}\nPotencial: ${item.conversionPotential}\nPitch: ${item.pitchIdeal}`,
        qualification: item.conversionPotential === 'alto' ? 'hot' : item.conversionPotential === 'médio' ? 'warm' : 'cold',
        current_stage: 'prospeccao' as const,
        user_id: user.id,
        organization_id: organizationId,
        slug,
        ai_intelligence: aiIntelligence,
      });
      if (error) throw error;
      // Remove imported item from history
      setHistory(prev => prev.filter(h => h.id !== item.id));
      await (supabase as any).from('prospecting_history')
        .delete().eq('organization_id', organizationId).eq('name', item.name);
      setImportProgress(1);
      await new Promise(r => setTimeout(r, 600));
      setImportState('done');
    } catch (err: any) {
      setImportErrors([`${item.name}: ${err.message || 'erro desconhecido'}`]);
      setImportState('done');
    }
  };

  const handleImportDone = () => {
    setImportState('idle');
    setSelectedIds(new Set());
    navigate('/app/clients');
  };



  return (
    <div className="flex h-[calc(100dvh-5rem)] md:h-[100dvh] min-h-0 bg-background overflow-hidden">
      
      {/* ─── Sidebar History ─── */}
      <div className={cn(
        "flex-shrink-0 border-r border-border/40 bg-card/50 transition-all duration-300 flex flex-col z-30",
        isHistoryOpen ? "w-80" : "w-0 overflow-hidden border-r-0"
      )}>
        <div className="p-4 border-b border-border/40 flex items-center justify-between sticky top-0 bg-card/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm">Histórico</h3>
            <Badge variant="secondary" className="text-[10px] h-4 px-1">{history.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Select value={historySortBy} onValueChange={(v: 'date' | 'potential') => setHistorySortBy(v)}>
              <SelectTrigger className="h-7 w-[90px] text-[10px] px-2 py-0 border-border/40 bg-card/50 gap-1 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date" className="text-[10px]">Mais recentes</SelectItem>
                <SelectItem value="potential" className="text-[10px]">Por Potencial</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setIsClearHistoryModalOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {history.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">Nenhuma pesquisa anterior</p>
              </div>
            ) : (
              [...history].sort((a, b) => {
                if (historySortBy === 'date') {
                  return new Date(b.foundAt).getTime() - new Date(a.foundAt).getTime();
                } else {
                  const pValues: Record<string, number> = { alto: 3, médio: 2, baixo: 1 };
                  const valA = pValues[(a.conversionPotential || '').toLowerCase() || 'médio'] || 0;
                  const valB = pValues[(b.conversionPotential || '').toLowerCase() || 'médio'] || 0;
                  return valB - valA;
                }
              }).map((entry) => (
                <div 
                  key={entry.id + entry.foundAt} 
                  className="p-2.5 rounded-lg border border-border/40 bg-card/30 hover:border-primary/30 transition-colors group cursor-pointer"
                  onClick={() => setSelectedHistoryItem(entry)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{entry.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{entry.segment} • {entry.location}</p>
                    </div>
                    <div className="shrink-0">
                      <PotentialBadge value={entry.conversionPotential} />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(entry.foundAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* Sidebar Toggle Button */}
        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 z-40 h-12 w-4 bg-card border border-l-0 border-border/40 rounded-r-md flex items-center justify-center hover:bg-accent transition-colors shadow-sm",
            !isHistoryOpen && "translate-x-0"
          )}
        >
          {isHistoryOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        <div className="flex-1 overflow-y-auto" id="prospecting-scroll-container">

          <div className="w-full p-4 md:p-8 space-y-6 pb-24">
            {/* Header section */}
            <div className={cn(
              "p-6 rounded-2xl border backdrop-blur-sm space-y-6 relative overflow-hidden",
              isExpiredPlan
                ? "bg-red-950/20 border-red-800/30"
                : effectiveRemaining === 0 && effectiveRemaining !== null
                ? "bg-amber-950/20 border-amber-800/30"
                : "bg-card/30 border-border/40"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    isExpiredPlan ? "bg-red-500/10" : "bg-primary/10"
                  )}>
                    {isExpiredPlan
                      ? <Lock className="h-5 w-5 text-red-400" />
                      : <Target className="h-5 w-5 text-primary" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Prospecção com IA</h1>
                    <p className="text-sm text-muted-foreground">Encontre os clientes ideais para a sua agência em segundos.</p>
                    
                    {/* Mobile: Credits & Plan */}
                    <div className="flex sm:hidden items-center gap-2 mt-2">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold",
                        isExpiredPlan ? "bg-red-500/10 border-red-500/30 text-red-400" :
                        effectiveRemaining === 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : 
                        "bg-orange-500/10 border-orange-500/20 text-orange-600"
                      )}>
                        {isExpiredPlan ? <Lock className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
                        {isExpiredPlan ? 'Expirado' : effectiveRemaining === null ? 'Ilimitado' : `${effectiveRemaining} Créditos`}
                      </div>
                      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter bg-secondary/50 px-1.5 py-0.5 rounded">
                        {planType === 'trial' ? 'Teste' : planType === 'starter' ? 'Lança' : planType === 'pro' ? 'Arco' : planType === 'agency' ? 'Catapulta' : planType || 'Gratuito'}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Desktop: Credits & Plan */}
                <div className="hidden sm:flex flex-col items-end gap-1 ml-auto text-right">
                  {isExpiredPlan ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
                      <Lock className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-xs font-bold text-red-400">Plano Expirado</span>
                    </div>
                  ) : (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                      effectiveRemaining === 0
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-orange-500/10 border-orange-500/20"
                    )}>
                      <Zap className={cn(
                        "h-3.5 w-3.5",
                        effectiveRemaining === 0 ? "text-amber-400" : "text-orange-500"
                      )} />
                      <span className={cn(
                        "text-xs font-bold",
                        effectiveRemaining === 0 ? "text-amber-400" : "text-orange-600"
                      )}>
                        {effectiveRemaining === null ? 'Ilimitado' : `${effectiveRemaining} Créditos`}
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Plano {
                      planType === 'trial' ? 'Teste' :
                      planType === 'starter' ? 'Lança' :
                      planType === 'pro' ? 'Arco' :
                      planType === 'agency' ? 'Catapulta' :
                      planType || 'Gratuito'
                    }
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-end gap-4 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
                  <div className="space-y-2">
                    <Label htmlFor="segment" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Segmento</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="segment"
                        placeholder="Ex: Salão de Beleza, Restaurante..."
                        value={segment}
                        onChange={(e) => setSegment(e.target.value)}
                        className="pl-10 bg-background/50 h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Localização</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Ex: Maputo, Cidade..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="pl-10 bg-background/50 h-11"
                      />
                    </div>
                  </div>
                </div>

                {(!effectiveCanProspect) ? (
                  <Button
                    className="w-full md:w-auto gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 shadow-lg shadow-amber-500/20 h-11 px-6 shrink-0 text-white font-bold"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    <Crown className="h-4 w-4" />
                    {isExpiredPlan ? 'Renovar Plano' : 'Fazer Upgrade'}
                  </Button>
                ) : (
                  <Button
                    className="w-full md:w-auto gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 border-0 shadow-lg shadow-orange-500/20 h-11 px-8 shrink-0 text-white font-bold"
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        A prospectar...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Iniciar Prospecção
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ignore-prev" 
                  checked={ignorePrevious} 
                  onCheckedChange={(checked) => setIgnorePrevious(!!checked)} 
                />
                <label
                  htmlFor="ignore-prev"
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ignorar empresas já encontradas anteriormente
                </label>
              </div>
            </div>

            {/* Loading state — animated steps */}
            {loading && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center space-y-6">
                <div className="flex items-center justify-center">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">
                      {loadingSteps[loadingStep]?.icon}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-base">
                    {loadingSteps[loadingStep]?.text}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A QIA está a prospectar a internet em tempo real. Pode demorar até 30 segundos — aguarde com calma! ☕
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {loadingSteps.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-2 rounded-full transition-all duration-500',
                        i === loadingStep ? 'w-6 bg-primary' : i < loadingStep ? 'w-2 bg-primary/60' : 'w-2 bg-border'
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {prospects.length > 0 && !loading && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-1 z-10 bg-background/80 backdrop-blur-sm rounded-xl border border-border/40 p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-all"
                      checked={selectedIds.size === prospects.length}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm cursor-pointer">
                      {selectedIds.size === 0
                        ? `${prospects.length} prospects encontrados`
                        : `${selectedIds.size} de ${prospects.length} selecionados`}
                    </Label>
                  </div>
                  <Button
                    className="gap-2 text-sm h-9"
                    disabled={selectedIds.size === 0}
                    onClick={() => {
                      if (!canAddClient) setShowUpgradeModal(true);
                      else handleAddToClients();
                    }}
                    variant={!canAddClient ? "outline" : "default"}
                  >
                    {!canAddClient && <Lock className="h-3 w-3 text-amber-500" />}
                    <UserPlus className="h-4 w-4" />
                    Adicionar à lista de clientes ({selectedIds.size})
                  </Button>
                </div>

                <div className="space-y-3">
                  {prospects.map((prospect) => (
                    <ProspectCard
                      key={prospect.id}
                      prospect={prospect}
                      isSelected={selectedIds.has(prospect.id)}
                      onToggle={toggleSelect}
                    />
                  ))}
                </div>

                {marketInsights && <MarketInsightsPanel insights={marketInsights} />}
              </>
            )}

            {prospects.length === 0 && !loading && (
              <div className="text-center py-20 text-muted-foreground border border-dashed border-border/60 rounded-xl">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Nenhuma prospecção realizada ainda</p>
                <p className="text-sm mt-1">Defina o segmento e localização e clique em Iniciar Prospecção IA</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Confirmation Modal ─── */}
      <Dialog open={importState === 'confirm'} onOpenChange={(o) => !o && setImportState('idle')}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button:last-child]:hidden">
          <button
            onClick={() => setImportState('idle')}
            className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 px-8 pt-10 pb-8 text-white text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Confirmar Importação</h2>
              <p className="text-white/90 text-sm leading-relaxed">
                Vai adicionar <strong>{selectedIds.size}</strong> prospect{selectedIds.size !== 1 ? 's' : ''} à sua lista de clientes.
              </p>
            </div>
          </div>
          <div className="px-8 py-6 space-y-4 bg-card">
            <div className="space-y-2">
              {prospects.filter(p => selectedIds.has(p.id)).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3 w-3 text-blue-500" />
                  </div>
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-muted-foreground text-xs ml-auto shrink-0">{p.type}</span>
                </div>
              ))}
              {selectedIds.size > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">+ {selectedIds.size - 5} mais...</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setImportState('idle')}>Cancelar</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0"
                onClick={handleConfirmImport}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Importar Clientes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Progress Modal ─── */}
      <Dialog open={importState === 'importing'} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button:last-child]:hidden">
          <div className="relative bg-gradient-to-br from-primary via-blue-600 to-slate-900 px-8 pt-10 pb-8 text-white text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <h2 className="text-xl font-bold mb-1">Importando Clientes</h2>
              <p className="text-white/80 text-sm">
                {importProgress} de {importTotal}
              </p>
            </div>
          </div>
          <div className="px-8 py-6 bg-card space-y-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>Progresso</span>
                <span>{importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
                  style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
            {importProgress < importTotal && (
              <div className="flex items-center gap-2 text-sm bg-secondary/40 rounded-lg px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">
                  A importar: <strong>{prospects.filter(p => selectedIds.has(p.id))[importProgress]?.name}</strong>
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">Por favor aguarde. Não feche esta janela.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Success Modal ─── */}
      <Dialog open={importState === 'done'} onOpenChange={(o) => !o && handleImportDone()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button:last-child]:hidden">
          <button
            onClick={handleImportDone}
            className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative bg-gradient-to-br from-emerald-500 via-green-600 to-slate-900 px-8 pt-10 pb-8 text-white text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10">
                <PartyPopper className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">
                {importErrors.length === 0 ? 'Importação Concluída!' : 'Importação com avisos'}
              </h2>
              <p className="text-white/90 text-sm">
                {importTotal - importErrors.length} cliente{importTotal - importErrors.length !== 1 ? 's' : ''} adicionado{importTotal - importErrors.length !== 1 ? 's' : ''} com sucesso!
              </p>
            </div>
          </div>
          <div className="px-8 py-6 space-y-4 bg-card">
            {importErrors.length > 0 && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                <p className="text-xs font-semibold text-destructive">Erros ({importErrors.length}):</p>
                {importErrors.map((e, i) => <p key={i} className="text-xs text-muted-foreground">{e}</p>)}
              </div>
            )}
            <div className="space-y-2">
              {[`${importTotal - importErrors.length} prospect${importTotal - importErrors.length !== 1 ? 's' : ''} adicionado${importTotal - importErrors.length !== 1 ? 's' : ''} ao Pipeline`, 'Disponíveis na fase de Prospecção', 'Prontos para avançar no funil de vendas'].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3 w-3 text-emerald-500" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-lg h-11 font-semibold"
              onClick={handleImportDone}
            >
              Ver Clientes no Pipeline
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ─── Clear History Modal ─── */}
      <Dialog open={isClearHistoryModalOpen} onOpenChange={setIsClearHistoryModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button:last-child]:hidden">
          <button
            onClick={() => setIsClearHistoryModalOpen(false)}
            className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-slate-900 px-8 pt-10 pb-8 text-white text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10">
                <Trash2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Limpar Histórico</h2>
              <p className="text-white/90 text-sm">
                Tem certeza que deseja apagar todo o histórico de buscas?
              </p>
            </div>
          </div>
          <div className="px-8 py-6 space-y-4 bg-card">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-xs text-center text-destructive font-medium">Esta ação não poderá ser desfeita. Todas as empresas prospectadas anteriormente poderão aparecer nas próximas buscas.</p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-border/40 hover:bg-accent/50"
                onClick={() => setIsClearHistoryModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg"
                onClick={handleConfirmClearHistory}
              >
                Limpar Agora
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* ─── History Item Modal ─── */}
      <Dialog open={!!selectedHistoryItem} onOpenChange={(o) => !o && setSelectedHistoryItem(null)}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-border/40 shadow-2xl [&>button:last-child]:hidden bg-card/95 backdrop-blur-xl flex flex-col max-h-[75vh]">
          {selectedHistoryItem && (
            <>
              {/* Header (Fixed) */}
              <div className="p-4 pb-3 shrink-0 border-b border-border/40 bg-card/95 backdrop-blur-xl z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-background/50 flex shrink-0 border border-border/50 items-center justify-center shadow-sm">
                      <img 
                        src={`https://logo.clearbit.com/${(selectedHistoryItem.name || '').replace(/\s+/g, '').toLowerCase()}.com`}
                        alt="Logo"
                        className="w-full h-full object-cover bg-white"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedHistoryItem.name || '')}&background=random&color=fff&bold=true`;
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-foreground leading-tight break-words max-w-[20ch] sm:max-w-none">{selectedHistoryItem.name}</h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{selectedHistoryItem.location} &bull; {selectedHistoryItem.segment}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    {selectedHistoryItem.opportunityData && (
                      <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500/10 to-red-500/10 px-3 py-1.5 rounded-lg border border-orange-500/30">
                        <span className="text-xs font-bold text-orange-500 uppercase">🔥</span>
                        <span className="text-lg font-black text-foreground">{selectedHistoryItem.opportunityData.score}/100</span>
                      </div>
                    )}
                    {selectedHistoryItem.opportunityData && (
                       <div className="text-sm font-semibold text-foreground/80 mt-1">
                         {selectedHistoryItem.opportunityData.classification}
                       </div>
                    )}
                    {!selectedHistoryItem.opportunityData && <PotentialBadge value={selectedHistoryItem.conversionPotential} />}
                  </div>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="overflow-y-auto flex-1 w-full p-4">
                <div className="space-y-6">
                  
                  {/* Revenue & Probability Banner */}
                  {(selectedHistoryItem.impactEstimate || selectedHistoryItem.closingProbability || selectedHistoryItem.opportunityData) && (
                    <div className="bg-gradient-to-br from-emerald-500/10 via-primary/5 to-blue-500/10 p-4 rounded-xl border border-emerald-500/20 space-y-3">
                      {/* Score Breakdown */}
                      {selectedHistoryItem.opportunityData && (
                        <div className="flex flex-wrap gap-3 text-[10px] uppercase font-bold text-muted-foreground pb-3 border-b border-emerald-500/20">
                          <span>💰 Financeiro: <span className="text-emerald-500">{selectedHistoryItem.opportunityData.breakdown.financialPotential}/25</span></span>
                          <span>📊 Digital: <span className="text-blue-500">{selectedHistoryItem.opportunityData.breakdown.digitalMaturity}/20</span></span>
                          <span>⚠️ Dor: <span className="text-orange-500">{selectedHistoryItem.opportunityData.breakdown.need}/20</span></span>
                          <span>🎯 Fit: <span className="text-primary">{selectedHistoryItem.opportunityData.breakdown.fit}/20</span></span>
                          <span>⏱️ Fecho: <span className="text-amber-500">{selectedHistoryItem.opportunityData.breakdown.closingEase}/15</span></span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-4">
                        {selectedHistoryItem.impactEstimate ? (
                          <>
                            <div className="flex-1 min-w-[180px]">
                              <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">💰 Receita Adicional</p>
                              <p className="text-lg font-black text-foreground">{selectedHistoryItem.impactEstimate.additionalRevenue}</p>
                              <p className="text-[10px] text-muted-foreground italic leading-tight">Estimativa de facturação extra por mês</p>
                              <p className="text-xs text-foreground/80 mt-2">{selectedHistoryItem.impactEstimate.newClientsPerMonth}</p>
                            </div>
                            <div className="flex-1 min-w-[150px]">
                              <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">🎟️ Ticket Médio</p>
                              <p className="text-lg font-black text-foreground">{selectedHistoryItem.impactEstimate.averageTicket}</p>
                              <p className="text-[10px] text-muted-foreground italic leading-tight mb-2">Valor médio gasto por cliente</p>
                              <p className="text-xs text-foreground/80 mt-1">Payback: {selectedHistoryItem.impactEstimate.paybackEstimate}</p>
                              <p className="text-[10px] text-muted-foreground italic leading-tight mt-0.5">Tempo para o cliente recuperar o valor que vai pagar à tua agência</p>
                            </div>
                          </>
                        ) : (
                          selectedHistoryItem.estimatedRevenue && (
                            <div className="flex-1 min-w-[200px]">
                              <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">💰 Receita Estimada</p>
                              <p className="text-lg font-black text-foreground">{selectedHistoryItem.estimatedRevenue}</p>
                            </div>
                          )
                        )}
                        {selectedHistoryItem.closingProbability && (
                          <div className="flex-1 min-w-[150px] border-l border-emerald-500/20 pl-4">
                            <p className="text-[10px] uppercase font-bold text-foreground/70 mb-1">🎯 Probabilidade de Fecho</p>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 bg-background/50 rounded-full overflow-hidden border border-border/50">
                                <div className="h-full bg-emerald-500" style={{ width: `${selectedHistoryItem.closingProbability}%` }} />
                              </div>
                              <span className="text-sm font-bold">{selectedHistoryItem.closingProbability}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                      {/* Gap Analysis */}
                      {selectedHistoryItem.gapAnalysis && selectedHistoryItem.gapAnalysis.length > 0 && (
                        <div className="bg-destructive/5 rounded-xl p-5 border border-destructive/20 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
                          <h4 className="text-xs font-bold text-destructive uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4" /> 🚨 O que está a perder:
                          </h4>
                          <ul className="space-y-2">
                            {selectedHistoryItem.gapAnalysis.map((gap, i) => (
                              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                                <span className="text-destructive font-bold mt-0.5">•</span> {gap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Decision Profile */}
                      {selectedHistoryItem.decisionProfile && (
                        <div className="bg-background/50 rounded-xl p-5 border border-border/50">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <BrainCircuit className="h-4 w-4 text-primary" /> 🧠 Perfil de Decisão:
                          </h4>
                          <ul className="space-y-3">
                            {Array.isArray(selectedHistoryItem.decisionProfile) ? (
                              (selectedHistoryItem.decisionProfile as string[]).map((prof, i) => (
                                <li key={i} className="text-sm text-foreground/80 flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {prof}
                                </li>
                              ))
                            ) : (
                              <>
                                <li className="text-xs text-foreground/90 flex flex-col gap-1">
                                  <span className="font-bold uppercase text-[10px] text-muted-foreground tracking-tighter">⚡ Velocidade:</span>
                                  <span className="bg-secondary/30 p-2 rounded border border-border/40">{selectedHistoryItem.decisionProfile.speed}</span>
                                </li>
                                <li className="text-xs text-foreground/90 flex flex-col gap-1">
                                  <span className="font-bold uppercase text-[10px] text-muted-foreground tracking-tighter">🎯 Foco:</span>
                                  <span className="bg-secondary/30 p-2 rounded border border-border/40">{selectedHistoryItem.decisionProfile.focus}</span>
                                </li>
                                <li className="text-xs text-foreground/90 flex flex-col gap-1">
                                  <span className="font-bold uppercase text-[10px] text-muted-foreground tracking-tighter">🧠 Mindset:</span>
                                  <span className="bg-secondary/30 p-2 rounded border border-border/40">{selectedHistoryItem.decisionProfile.mindset}</span>
                                </li>
                                <li className="text-xs text-foreground/90 flex flex-col gap-1">
                                  <span className="font-bold uppercase text-[10px] text-muted-foreground tracking-tighter">🎭 Sensibilidade:</span>
                                  <span className="bg-secondary/30 p-2 rounded border border-border/40">{selectedHistoryItem.decisionProfile.sensitivity}</span>
                                </li>
                                <div className="mt-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                                  <p className="text-[10px] font-bold text-primary uppercase mb-1">💡 Melhor Abordagem:</p>
                                  <p className="text-sm font-medium text-foreground">{selectedHistoryItem.decisionProfile.bestApproach}</p>
                                </div>
                              </>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Benchmark */}
                      {selectedHistoryItem.benchmark && (
                        <div className="bg-background/50 rounded-xl p-5 border border-border/50">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <TrendingDown className="h-4 w-4 text-orange-500" /> 📉 Benchmark Local:
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Presença digital:</span>
                              <Badge variant="outline" className="text-orange-500 border-orange-500/30 bg-orange-500/10">{selectedHistoryItem.benchmark.digitalPresence}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Conteúdo:</span>
                              <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">{selectedHistoryItem.benchmark.content}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Ads:</span>
                              <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10">{selectedHistoryItem.benchmark.ads}</Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {/* Next Best Action */}
                      {selectedHistoryItem.nextBestAction && (
                        <div className="bg-primary/10 rounded-xl p-5 border border-primary/30">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Target className="h-4 w-4" /> 👉 Próxima Melhor Ação:
                          </h4>
                          <p className="text-sm text-foreground font-medium leading-relaxed">
                            {selectedHistoryItem.nextBestAction}
                          </p>
                        </div>
                      )}

                      {/* Dynamic Script */}
                      {(selectedHistoryItem.dynamicScript || selectedHistoryItem.pitchIdeal) && (
                        <div className="bg-background/50 rounded-xl p-5 border border-border/50">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <MessageCircle className="h-4 w-4 text-blue-500" /> 📞 Script de Abordagem:
                          </h4>
                          <p className="text-sm text-foreground/90 italic leading-relaxed border-l-2 border-blue-500/50 pl-3">
                            "{selectedHistoryItem.dynamicScript || selectedHistoryItem.pitchIdeal}"
                          </p>
                        </div>
                      )}

                      {/* Campaign Ideas */}
                      {selectedHistoryItem.campaignIdeas && selectedHistoryItem.campaignIdeas.length > 0 && (
                        <div className="bg-background/50 rounded-xl p-5 border border-border/50">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-amber-500" /> 🚀 Ideias de Campanha:
                          </h4>
                          <div className="space-y-2">
                            {(selectedHistoryItem.campaignIdeas as any[]).map((idea, i) => (
                              <div key={i} className="bg-secondary/20 rounded-md p-3 border border-border/40">
                                {typeof idea === 'object' ? (
                                  <>
                                    <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                      {idea.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 ml-5">{idea.description}</p>
                                    <p className="text-xs text-emerald-500 font-medium mt-1 ml-5">✅ {idea.expectedResult}</p>
                                  </>
                                ) : (
                                  <p className="text-sm text-foreground/80 flex items-start gap-2">
                                    <Sparkles className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                                    <span>{idea}</span>
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Smart Follow Up */}
                      {selectedHistoryItem.smartFollowUp && selectedHistoryItem.smartFollowUp.length > 0 && (
                        <div className="bg-background/50 rounded-xl p-5 border border-border/50">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-emerald-500" /> 🔁 Follow-up Inteligente:
                          </h4>
                          <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500/50 before:to-transparent">
                            {selectedHistoryItem.smartFollowUp.map((step, i) => (
                              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-5 h-5 rounded-full border border-emerald-500 bg-background shadow shrink-0 text-[10px] font-bold text-emerald-500 z-10">
                                  {i + 1}
                                </div>
                                <div className="w-full md:w-1/2 p-2 rounded-md bg-secondary/50 border border-border/50 text-xs text-foreground/80">
                                  {step}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer (Fixed) */}
              <div className="flex flex-row items-center gap-2 p-3 shrink-0 border-t border-border/40 bg-card/95 backdrop-blur-xl z-10 w-full overflow-x-hidden">
                <Button 
                  variant="destructive" 
                  className="flex-1 h-10 px-2 text-[10px] sm:text-sm gap-1.5"
                  onClick={() => handleDeleteHistoryItem(selectedHistoryItem.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Deletar</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-10 px-2 text-[10px] sm:text-sm"
                  onClick={() => setSelectedHistoryItem(null)}
                >
                  Fechar
                </Button>
                <Button 
                  className={cn(
                    "flex-[1.5] h-10 px-2 gap-1.5 text-white shadow-md border-0 text-[10px] sm:text-sm font-bold",
                    !canAddClient 
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-400" 
                      : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                  )}
                  onClick={() => {
                    if (!canAddClient) setShowUpgradeModal(true);
                    else handleImportSingleHistoryItem(selectedHistoryItem);
                  }}
                >
                  {!canAddClient ? <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : <UserPlus className="h-3.5 w-3.5 shrink-0" />}
                  <span className="truncate">Adicionar Cliente</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Upgrade Modal ── */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/50 bg-zinc-900">
          {/* Header gradient */}
          <div className="relative bg-gradient-to-br from-orange-600/30 via-orange-500/10 to-transparent p-6 pb-4 border-b border-border/40">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-500/20 to-transparent pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Crown className="h-6 w-6 text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-white leading-tight">
                  {!canAddClient && remainingClients === 0 ? 'Limite de Clientes' : isExpiredPlan ? 'Plano Expirado' : 'Créditos Esgotados'}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {!canAddClient && remainingClients === 0
                    ? 'Atingiu o número máximo de clientes do seu plano.'
                    : isExpiredPlan
                    ? 'O seu plano expirou. Renove para continuar.'
                    : 'Atingiu o limite de prospecções do seu plano actual.'}
                </p>

                {/* Plan Limitations (Mobile Only) */}
                <div className="flex sm:hidden flex-col gap-2 mt-4 p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Plano Actual</span>
                     <span className="text-xs font-semibold text-white">
                        {planType === 'trial' ? 'Teste' :
                         planType === 'starter' ? 'Lança' :
                         planType === 'pro' ? 'Arco' :
                         planType === 'agency' ? 'Catapulta' :
                         'Gratuito'}
                     </span>
                   </div>
                   <div className="flex items-center justify-between pt-2 border-t border-zinc-700/30">
                     <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Limitação</span>
                     <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isExpiredPlan || (!canAddClient && remainingClients === 0)
                          ? "bg-red-500/15 text-red-400 border border-red-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      )}>
                        {isExpiredPlan ? 'Expirado' : !canAddClient && remainingClients === 0 ? 'Limite Atingido' : '0 créditos'}
                      </span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Current plan indicator (Desktop Only) */}
            <div className="hidden sm:flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  isExpiredPlan ? "bg-red-400" : "bg-amber-400"
                )} />
                <span className="text-sm text-zinc-300">
                  Plano actual: <span className="font-semibold text-white">
                    {planType === 'trial' ? 'Teste' :
                     planType === 'starter' ? 'Lança' :
                     planType === 'pro' ? 'Arco' :
                     planType === 'agency' ? 'Catapulta' :
                     'Gratuito'}
                  </span>
                </span>
              </div>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                isExpiredPlan || (!canAddClient && remainingClients === 0)
                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              )}>
                {isExpiredPlan ? 'Expirado' : !canAddClient && remainingClients === 0 ? 'Limite Atingido' : '0 créditos'}
              </span>
            </div>

            {/* Upgrade options */}
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Planos disponíveis</p>
            <div className="space-y-2">
              {[
                { name: 'Lança', credits: 10, highlight: false },
                { name: 'Arco', credits: 30, highlight: true },
                { name: 'Catapulta', credits: null, highlight: false },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-colors",
                    plan.highlight
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-zinc-800/40 border-zinc-700/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {plan.highlight && <Zap className="h-3.5 w-3.5 text-orange-400" />}
                    <span className={cn(
                      "text-sm font-semibold",
                      plan.highlight ? "text-orange-300" : "text-zinc-300"
                    )}>
                      {plan.name}
                    </span>
                    {plan.highlight && (
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full font-medium">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    plan.highlight ? "text-orange-400" : "text-zinc-400"
                  )}>
                    {plan.credits === null ? '∞ Ilimitado' : `${plan.credits} prospecções/mês`}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                onClick={() => setShowUpgradeModal(false)}
              >
                Fechar
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold border-0 shadow-lg shadow-orange-500/20"
                onClick={() => { setShowUpgradeModal(false); navigate('/app/subscription'); }}
              >
                <Crown className="h-4 w-4" />
                Ver Planos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
