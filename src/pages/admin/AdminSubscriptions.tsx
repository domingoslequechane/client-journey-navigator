import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CreditCard, TrendingUp, AlertCircle, Clock, History, Receipt,
  DollarSign, Eye, ThumbsUp, ThumbsDown, ExternalLink, XCircle,
  X, Smartphone, Loader2, Plus, Bell, CheckCircle2, Ban
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubscriptionWithOrg {
  id: string;
  organization_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  organization: { name: string; plan_type: string | null; trial_ends_at: string } | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
  description: string | null;
}

interface ManualPaymentRequest {
  id: string;
  organization_id: string;
  user_id: string;
  plan_type: string;
  amount_usd: number;
  payment_method: string;
  proof_url: string;
  proof_filename: string | null;
  reference_code: string | null;
  contact_phone: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  organization: { name: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  starter: 'Lança',
  pro: 'Arco',
  agency: 'Catapulta',
};

const METHOD_LABELS: Record<string, string> = {
  mpesa: '💚 M-Pesa',
  emola: '🔵 E-Mola',
  bank_transfer: '🏦 BIM',
  bim: '🏦 BIM',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function getComputedStatus(sub: SubscriptionWithOrg) {
  const endDate = sub.current_period_end 
    ? new Date(sub.current_period_end).getTime() 
    : (sub.organization?.trial_ends_at ? new Date(sub.organization.trial_ends_at).getTime() : 0);
  
  const isPast = endDate > 0 && endDate < Date.now();

  if (sub.status === 'past_due' || sub.status === 'paused') return isPast ? 'expired' : 'suspended';
  if (sub.status === 'cancelled' || sub.status === 'expired') return 'canceling';
  
  return 'active';
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    active: { className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Activa' },
    suspended: { className: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Desativada' },
    canceling: { className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Cancelada (Termina em Breve)' },
    expired: { className: 'bg-stone-500/10 text-stone-400 border-stone-500/20', label: 'Expirada' },
  };
  const v = map[status] ?? map.expired;
  return <Badge className={`border ${v.className} text-xs`}>{v.label}</Badge>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, { label: string; className: string }> = {
    paid: { label: 'Pago', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    confirmed: { label: 'Confirmado', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    success: { label: 'Sucesso', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    pending: { label: 'Pendente', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    failed: { label: 'Falhou', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    refused: { label: 'Recusado', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    rejected: { label: 'Rejeitado', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    refunded: { label: 'Reembolsado', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  };
  const entry = map[s] ?? { label: status, className: 'bg-stone-500/10 text-stone-400 border-stone-500/20' };
  return <Badge className={`border ${entry.className} text-xs`}>{entry.label}</Badge>;
}

// ─── Review Dialog ─────────────────────────────────────────────────────────────

interface ReviewDialogProps {
  request: ManualPaymentRequest;
  onClose: () => void;
  onDone: () => void;
}

function ReviewDialog({ request, onClose, onDone }: ReviewDialogProps) {
  const [days, setDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    setSaving(true);
    setAction('approve');
    try {
      const newEnd = new Date(Date.now() + parseInt(days) * 86400000).toISOString();

      const { error: subError } = await supabase.from('subscriptions').upsert({
        organization_id: request.organization_id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: newEnd,
        lemonsqueezy_subscription_id: `manual_${request.payment_method}_${request.id.substring(0, 8)}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });
      if (subError) throw subError;

      await supabase
        .from('organizations')
        .update({ plan_type: request.plan_type as 'starter' | 'pro' | 'agency' })
        .eq('id', request.organization_id);

      await supabase.from('payment_history').insert({
        organization_id: request.organization_id,
        amount: request.amount_usd,
        currency: 'USD',
        status: 'paid',
        payment_date: new Date().toISOString(),
        description: `Pagamento Manual via ${METHOD_LABELS[request.payment_method] ?? request.payment_method} — Plano ${PLAN_LABELS[request.plan_type] ?? request.plan_type} (${days} dias)`,
      });

      await supabase
        .from('manual_payment_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), admin_notes: notes || null })
        .eq('id', request.id);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', request.organization_id)
        .single();

      if (orgData?.owner_id) {
        const { data: adminUser } = await supabase.auth.getUser();
        await supabase.from('notifications').insert({
          title: '✅ Pagamento Confirmado!',
          message: `O seu pagamento foi validado e o plano ${PLAN_LABELS[request.plan_type] ?? request.plan_type} está agora activo por ${days} dias.`,
          type: 'user_specific',
          target_user_id: orgData.owner_id,
          created_by: adminUser.user?.id ?? orgData.owner_id,
        });
      }

      toast.success(`Plano ${PLAN_LABELS[request.plan_type]} activado com sucesso por ${days} dias!`);
      onDone();
    } catch (err: any) {
      console.error('Approve error:', err);
      toast.error(err.message ?? 'Erro ao aprovar pagamento');
    } finally {
      setSaving(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast.error('Por favor indique o motivo da rejeição nas notas.');
      return;
    }
    setSaving(true);
    setAction('reject');
    try {
      await supabase
        .from('manual_payment_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), admin_notes: notes })
        .eq('id', request.id);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', request.organization_id)
        .single();

      if (orgData?.owner_id) {
        const { data: adminUser } = await supabase.auth.getUser();
        await supabase.from('notifications').insert({
          title: '❌ Comprovativo Rejeitado',
          message: `O seu comprovativo foi rejeitado. Motivo: ${notes}. Por favor contacte o suporte.`,
          type: 'user_specific',
          target_user_id: orgData.owner_id,
          created_by: adminUser.user?.id ?? orgData.owner_id,
        });
      }

      toast.success('Pedido rejeitado e utilizador notificado.');
      onDone();
    } catch (err: any) {
      console.error('Reject error:', err);
      toast.error(err.message ?? 'Erro ao rejeitar pagamento');
    } finally {
      setSaving(false);
      setAction(null);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0F0F0F', border: '1px solid #292524', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(99,102,241,0.1)', borderRadius: '10px' }}>
              <Smartphone className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Rever Pagamento Manual</h2>
              <p style={{ color: '#78716c', fontSize: '13px', margin: 0 }}>Analise o comprovativo e aprove ou rejeite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#78716c', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#78716c')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Info pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', color: '#e7e5e4', fontSize: '13px', border: '1px solid #292524' }}>
              🏢 {request.organization?.name ?? '—'}
            </span>
            <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', color: '#e7e5e4', fontSize: '13px', border: '1px solid #292524' }}>
              📦 Plano: <strong>{PLAN_LABELS[request.plan_type] ?? request.plan_type}</strong>
            </span>
            <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', color: '#e7e5e4', fontSize: '13px', border: '1px solid #292524' }}>
              {METHOD_LABELS[request.payment_method] ?? request.payment_method}
            </span>
            <span style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: '100px', color: '#34d399', fontSize: '13px', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 700 }}>
              ${request.amount_usd}
            </span>
          </div>

          {/* Proof image */}
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #292524', background: '#1c1917', position: 'relative', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {request.proof_url ? (
              <>
                <img
                  src={request.proof_url}
                  alt="Comprovativo de pagamento"
                  style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <a
                  href={request.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir Original
                </a>
              </>
            ) : (
              <span style={{ color: '#57534e', fontSize: '14px' }}>Comprovativo não disponível</span>
            )}
          </div>

          {/* Metadata grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#1c1917', borderRadius: '10px', padding: '12px', border: '1px solid #292524' }}>
              <p style={{ color: '#78716c', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ficheiro</p>
              <p style={{ color: '#e7e5e4', fontSize: '13px', margin: 0, wordBreak: 'break-all' }}>{request.proof_filename ?? '—'}</p>
            </div>
            <div style={{ background: '#1c1917', borderRadius: '10px', padding: '12px', border: '1px solid #292524' }}>
              <p style={{ color: '#78716c', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referência</p>
              <p style={{ color: '#e7e5e4', fontSize: '13px', margin: 0, fontFamily: 'monospace' }}>{request.reference_code ?? 'Não fornecido'}</p>
            </div>
            <div style={{ background: '#1c1917', borderRadius: '10px', padding: '12px', border: '1px solid #292524' }}>
              <p style={{ color: '#78716c', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contacto (Telefone)</p>
              <p style={{ color: '#e7e5e4', fontSize: '13px', margin: 0, fontFamily: 'monospace' }}>{request.contact_phone ?? 'Não fornecido'}</p>
            </div>
            <div style={{ background: '#1c1917', borderRadius: '10px', padding: '12px', border: '1px solid #292524' }}>
              <p style={{ color: '#78716c', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data do Pedido</p>
              <p style={{ color: '#e7e5e4', fontSize: '13px', margin: 0 }}>
                {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </p>
            </div>
            <div style={{ background: '#1c1917', borderRadius: '10px', padding: '12px', border: '1px solid #292524' }}>
              <p style={{ color: '#78716c', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Actual</p>
              <p style={{ color: request.status === 'pending' ? '#fbbf24' : request.status === 'approved' ? '#34d399' : '#f87171', fontSize: '13px', margin: 0, fontWeight: 600, textTransform: 'capitalize' }}>
                {request.status === 'pending' ? '⏳ Pendente' : request.status === 'approved' ? '✅ Aprovado' : '❌ Rejeitado'}
              </p>
            </div>
          </div>

          {/* Controls row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ color: '#a8a29e', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Dias de Acesso (ao aprovar)
              </label>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                style={{ width: '100%', background: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', color: '#e7e5e4', padding: '8px 12px', fontSize: '14px', outline: 'none' }}
              >
                <option value="30">30 dias</option>
                <option value="60">60 dias</option>
                <option value="90">90 dias</option>
                <option value="180">180 dias</option>
                <option value="365">365 dias (1 ano)</option>
              </select>
            </div>
            <div>
              <label style={{ color: '#a8a29e', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                Notas / Motivo (obrigatório ao rejeitar)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: valor incorrecto, ref inválida..."
                style={{ width: '100%', background: '#1c1917', border: '1px solid #44403c', borderRadius: '8px', color: '#e7e5e4', padding: '8px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #44403c', background: 'transparent', color: '#a8a29e', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              Cancelar
            </button>
            <button
              onClick={handleReject}
              disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {saving && action === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Rejeitar
            </button>
            <button
              onClick={handleApprove}
              disabled={saving}
              style={{ flex: 1.5, padding: '10px', borderRadius: '8px', border: 'none', background: saving && action === 'approve' ? 'hsl(var(--primary)/0.8)' : 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 0 20px hsl(var(--primary)/0.25)' }}
            >
              {saving && action === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Aprovar Pagamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Manual Activation Slide-over ─────────────────────────────────────────────

interface ManualActivationProps {
  onClose: () => void;
  onDone: () => void;
}

function ManualActivationPanel({ onClose, onDone }: ManualActivationProps) {
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [orgId, setOrgId] = useState('');
  const [plan, setPlan] = useState('starter');
  const [days, setDays] = useState(30);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('organizations').select('id, name').order('name').then(({ data }) => setOrgs(data ?? []));
  }, []);

  const handleSave = async () => {
    if (!orgId) return toast.error('Seleccione uma agência');
    setSaving(true);
    try {
      const newEnd = new Date(Date.now() + days * 86400000).toISOString();
      const defaultAmount = plan === 'starter' ? 19 : plan === 'pro' ? 54 : 99;
      const finalAmount = amount ? parseFloat(amount) : defaultAmount;

      const { error } = await supabase.from('subscriptions').upsert({
        organization_id: orgId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: newEnd,
        lemonsqueezy_subscription_id: 'manual_activation',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });
      if (error) throw error;

      await supabase.from('organizations').update({ plan_type: plan as 'starter' | 'pro' | 'agency' }).eq('id', orgId);
      await supabase.from('payment_history').insert({
        organization_id: orgId,
        amount: finalAmount,
        currency: 'USD',
        status: 'paid',
        payment_date: new Date().toISOString(),
        description: `Activação Manual — Plano ${PLAN_LABELS[plan]} (${days} dias)`,
      });

      toast.success('Assinatura activada com sucesso!');
      onDone();
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao activar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: '460px', background: '#0a0a0a', borderLeft: '1px solid #292524', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '28px 28px 24px', borderBottom: '1px solid #1c1917', background: 'linear-gradient(135deg, hsl(var(--primary)/0.08) 0%, transparent 60%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', background: 'hsl(var(--primary)/0.1)', borderRadius: '12px', border: '1px solid hsl(var(--primary)/0.2)' }}>
                <Plus className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div>
                <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Activação Manual</h2>
                <p style={{ color: '#78716c', fontSize: '13px', margin: 0 }}>Activar assinatura directamente</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#78716c', cursor: 'pointer' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Agency */}
          <div>
            <label style={{ color: '#a8a29e', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>Agência</label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              style={{ width: '100%', background: '#1c1917', border: '1px solid #44403c', borderRadius: '10px', color: orgId ? '#e7e5e4' : '#78716c', padding: '12px 14px', fontSize: '15px', outline: 'none' }}
            >
              <option value="">Escolha a agência...</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {/* Plan + Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ color: '#a8a29e', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>Plano</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                style={{ width: '100%', background: '#1c1917', border: '1px solid #44403c', borderRadius: '10px', color: '#e7e5e4', padding: '12px 14px', fontSize: '15px', outline: 'none' }}
              >
                <option value="starter">Lança ($19)</option>
                <option value="pro">Arco ($54)</option>
                <option value="agency">Catapulta ($99)</option>
              </select>
            </div>
            <div>
              <label style={{ color: '#a8a29e', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>Valor ($) — Opcional</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Padrão: $${plan === 'starter' ? 19 : plan === 'pro' ? 54 : 99}`}
                style={{ width: '100%', background: '#1c1917', border: '1px solid #44403c', borderRadius: '10px', color: '#e7e5e4', padding: '12px 14px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Duration */}
          <div style={{ background: 'hsl(var(--primary)/0.04)', borderRadius: '14px', padding: '20px', border: '1px solid hsl(var(--primary)/0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <label style={{ color: 'hsl(var(--primary))', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock className="h-3.5 w-3.5" /> Período de Acesso
              </label>
              <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '20px', fontWeight: 700 }}>{days} dias</span>
            </div>
            <input
              type="range"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'hsl(var(--primary))' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#57534e', fontSize: '11px', marginTop: '6px', fontFamily: 'monospace' }}>
              <span>1 DIA</span>
              <span>1 MÊS</span>
              <span>6 MESES</span>
              <span>1 ANO</span>
            </div>
          </div>

          <p style={{ color: '#57534e', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
            Ao activar, a agência terá acesso imediato. O registo será criado como pagamento manual confirmado por administrador.
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 28px 28px', borderTop: '1px solid #1c1917', background: 'rgba(0,0,0,0.3)' }}>
          <button
            onClick={handleSave}
            disabled={saving || !orgId}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: orgId ? 'hsl(var(--primary))' : '#1c1917', color: orgId ? 'hsl(var(--primary-foreground))' : '#44403c', cursor: orgId && !saving ? 'pointer' : 'not-allowed', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: orgId ? '0 0 24px hsl(var(--primary)/0.2)' : 'none', transition: 'all 0.2s' }}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {saving ? 'A processar...' : 'Activar Assinatura'}
          </button>
          <button
            onClick={onClose}
            style={{ width: '100%', marginTop: '12px', padding: '10px', border: 'none', background: 'transparent', color: '#57534e', cursor: 'pointer', fontSize: '13px' }}
          >
            Cancelar e voltar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSubscriptions() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'trialing' | 'expired' | 'transfers'>('all');
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithOrg[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  const [pendingPayments, setPendingPayments] = useState<ManualPaymentRequest[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  const [historyOrg, setHistoryOrg] = useState<{ id: string; name: string } | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const PAGE_SIZE = 6;

  const [reviewRequest, setReviewRequest] = useState<ManualPaymentRequest | null>(null);
  const [showManualPanel, setShowManualPanel] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubs(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, organization_id, status, current_period_start, current_period_end, created_at, organization:organizations(name, plan_type, trial_ends_at)')
      .order('created_at', { ascending: false });
    if (error) console.error('Subscriptions error:', error);
    setSubscriptions(data ?? []);
    setLoadingSubs(false);
  }, []);

  const loadTransfers = useCallback(async () => {
    setLoadingTransfers(true);
    const { data, error } = await supabase
      .from('manual_payment_requests')
      .select('*, organization:organizations(name)')
      .order('created_at', { ascending: false });
    if (error) console.error('Transfers error:', error);
    setPendingPayments(data ?? []);
    setLoadingTransfers(false);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Read tab from URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'pending') setActiveTab('transfers');
    else if (tab && ['all', 'active', 'trialing', 'expired'].includes(tab)) setActiveTab(tab as any);

    loadSubscriptions();
    loadTransfers();

    // Realtime for transfers
    const channel = supabase
      .channel('admin_subs_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_payment_requests' }, loadTransfers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, loadSubscriptions)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadSubscriptions, loadTransfers]);

  // ── Payment History ────────────────────────────────────────────────────────

  const openHistory = async (org: { id: string; name: string }) => {
    setHistoryOrg(org);
    setHistoryPage(1);
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('organization_id', org.id)
      .order('payment_date', { ascending: false });
    if (error) console.error('History error:', error);
    setPayments(data ?? []);
    setLoadingHistory(false);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const filterByStatus = (status: string) => subscriptions.filter((s) => getComputedStatus(s) === status);
  const expiringCount = subscriptions.filter((s) => {
    const end = s.current_period_end ? new Date(s.current_period_end) : null;
    return end && getComputedStatus(s) === 'active' && differenceInDays(end, new Date()) <= 7;
  }).length;
  const pendingCount = pendingPayments.filter((p) => p.status === 'pending').length;

  const getExpiry = (sub: SubscriptionWithOrg) => {
    const endDate = sub.current_period_end
      ? new Date(sub.current_period_end)
      : sub.organization?.trial_ends_at
        ? new Date(sub.organization.trial_ends_at)
        : null;
    if (!endDate) return { label: '—', urgent: false };
    const daysLeft = differenceInDays(endDate, new Date());
    return {
      label: format(endDate, 'dd/MM/yyyy', { locale: ptBR }),
      urgent: getComputedStatus(sub) === 'active' && daysLeft >= 0 && daysLeft <= 7,
      daysLeft,
    };
  };

  // ── Filtered subscriptions ─────────────────────────────────────────────────

  const filteredSubs = (() => {
    if (activeTab === 'active') return [...filterByStatus('active'), ...filterByStatus('canceling')];
    if (activeTab === 'suspended') return filterByStatus('suspended');
    if (activeTab === 'expired') return filterByStatus('expired');
    return subscriptions;
  })();

  // ── Tab data ───────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'all', label: `Todas (${subscriptions.length})` },
    { id: 'active', label: `Activas (${filterByStatus('active').length + filterByStatus('canceling').length})` },
    { id: 'suspended', label: `Desativadas (${filterByStatus('suspended').length})` },
    { id: 'expired', label: `Expiradas (${filterByStatus('expired').length})` },
    { id: 'transfers', label: 'Transferências', badge: pendingCount },
  ] as const;

  // ── Payment history pagination ─────────────────────────────────────────────

  const totalHistoryPages = Math.ceil(payments.length / PAGE_SIZE);
  const paginatedPayments = payments.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Assinaturas</h1>
          <p className="text-muted-foreground text-sm">Gerir assinaturas e pedidos de pagamento manual</p>
        </div>
        <Button
          onClick={() => setShowManualPanel(true)}
          className="shrink-0 gap-2 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Activação Manual
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: subscriptions.length, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Activas', value: filterByStatus('active').length + filterByStatus('canceling').length, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Desativadas', value: filterByStatus('suspended').length, icon: Ban, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { label: 'Transferências Pendentes', value: pendingCount, icon: Smartphone, color: pendingCount > 0 ? 'text-amber-400' : 'text-muted-foreground', bg: pendingCount > 0 ? 'bg-amber-500/10' : 'bg-muted/30' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${s.bg} shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                {loadingSubs ? <div className="h-7 w-12 bg-muted rounded animate-pulse" /> : <p className="text-2xl font-bold">{s.value}</p>}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main card with custom tabs */}
      <Card>
        <CardContent className="p-6">
          {/* Tab bar — scrollable on mobile */}
          <div className="overflow-x-auto -mx-1 px-1 mb-5">
            <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-max min-w-full">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    position: 'relative',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    background: activeTab === tab.id ? 'hsl(var(--background))' : 'transparent',
                    color: activeTab === tab.id ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    cursor: 'pointer',
                    boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.id === 'transfers' && <Smartphone className="h-3.5 w-3.5" />}
                  {tab.label}
                  {'badge' in tab && tab.badge > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', borderRadius: '100px', fontSize: '11px', fontWeight: 700, padding: '1px 6px', minWidth: '18px', textAlign: 'center', lineHeight: '16px' }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {activeTab !== 'transfers' ? (
            /* Subscriptions - table on desktop, cards on mobile */
            loadingSubs ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted/30 rounded animate-pulse" />)}
              </div>
            ) : filteredSubs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Nenhuma assinatura encontrada</p>
              </div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="md:hidden space-y-3">
                  {filteredSubs.map((sub) => {
                    const expiry = getExpiry(sub);
                    const computedStatus = getComputedStatus(sub);
                    return (
                      <div
                        key={sub.id}
                        className={`rounded-xl border p-4 cursor-pointer transition-colors hover:bg-muted/40 ${
                          expiry.urgent ? 'border-red-500/30 bg-red-500/5' : 'border-border'
                        }`}
                        onClick={() => openHistory({ id: sub.organization_id, name: sub.organization?.name ?? 'Agência' })}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{sub.organization?.name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {sub.organization?.plan_type
                                ? (PLAN_LABELS[sub.organization.plan_type] ?? (sub.organization.plan_type.charAt(0).toUpperCase() + sub.organization.plan_type.slice(1)))
                                : 'Plano desconhecido'}
                            </p>
                          </div>
                          <StatusBadge status={computedStatus} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <p className="text-[10px] uppercase font-medium mb-0.5 opacity-60">Início</p>
                            <p>{sub.current_period_start ? format(new Date(sub.current_period_start), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-medium mb-0.5 opacity-60">Expiração</p>
                            {expiry.urgent ? (
                              <p className="text-red-400 font-medium">{expiry.label} ({expiry.daysLeft}d)</p>
                            ) : (
                              <p>{expiry.label}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organização</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Expiração</TableHead>
                        <TableHead>Criada em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map((sub) => {
                        const expiry = getExpiry(sub);
                        return (
                          <TableRow
                            key={sub.id}
                            className={`cursor-pointer hover:bg-muted/40 transition-colors ${expiry.urgent ? 'bg-red-500/5' : ''}`}
                            onClick={() => openHistory({ id: sub.organization_id, name: sub.organization?.name ?? 'Agência' })}
                          >
                            <TableCell className="font-medium">{sub.organization?.name ?? '—'}</TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {sub.organization?.plan_type ? (PLAN_LABELS[sub.organization.plan_type] ?? (sub.organization.plan_type.charAt(0).toUpperCase() + sub.organization.plan_type.slice(1))) : '—'}
                              </span>
                            </TableCell>
                            <TableCell><StatusBadge status={getComputedStatus(sub)} /></TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {sub.current_period_start ? format(new Date(sub.current_period_start), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                            </TableCell>
                            <TableCell>
                              {expiry.urgent ? (
                                <span className="flex items-center gap-1.5 text-red-400 font-medium text-sm">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  {expiry.label} ({expiry.daysLeft}d)
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">{expiry.label}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(sub.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )
          ) : (
            /* Transfers - mobile cards + desktop table */
            loadingTransfers ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted/30 rounded animate-pulse" />)}
              </div>
            ) : pendingPayments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum pedido de pagamento</p>
                <p className="text-sm mt-1">Os pedidos de pagamento manual aparecem aqui quando os clientes submetem comprovativos.</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {pendingPayments.map((req) => (
                    <div key={req.id} className="rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{req.organization?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{PLAN_LABELS[req.plan_type] ?? req.plan_type} &bull; {METHOD_LABELS[req.payment_method] ?? req.payment_method}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {req.status === 'pending' && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 border text-xs whitespace-nowrap">Pendente</Badge>}
                          {req.status === 'approved' && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border text-xs">Aprovado</Badge>}
                          {req.status === 'rejected' && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 border text-xs">Rejeitado</Badge>}
                          <span className="font-bold text-emerald-400 text-sm">${req.amount_usd}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{format(new Date(req.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</p>
                        <button
                          type="button"
                          onClick={() => setReviewRequest(req)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: req.status === 'pending' ? 'rgba(99,102,241,0.4)' : 'rgba(100,100,100,0.3)',
                            background: req.status === 'pending' ? 'rgba(99,102,241,0.08)' : 'transparent',
                            color: req.status === 'pending' ? '#818cf8' : '#78716c',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {req.status === 'pending' ? 'Rever' : 'Ver Detalhes'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agência</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acção</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayments.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{req.organization?.name ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{PLAN_LABELS[req.plan_type] ?? req.plan_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{METHOD_LABELS[req.payment_method] ?? req.payment_method}</TableCell>
                          <TableCell className="font-semibold text-emerald-400">${req.amount_usd}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(req.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {req.status === 'pending' && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 border text-xs">Pendente</Badge>}
                            {req.status === 'approved' && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border text-xs">Aprovado</Badge>}
                            {req.status === 'rejected' && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 border text-xs">Rejeitado</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={() => setReviewRequest(req)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: req.status === 'pending' ? 'rgba(99,102,241,0.4)' : 'rgba(100,100,100,0.3)',
                                background: req.status === 'pending' ? 'rgba(99,102,241,0.08)' : 'transparent',
                                color: req.status === 'pending' ? '#818cf8' : '#78716c',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {req.status === 'pending' ? 'Rever' : 'Ver Detalhes'}
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )
          )}
        </CardContent>
      </Card>

      {/* ─── Payment History Dialog ─────────────────────────────────────── */}
      <Dialog open={!!historyOrg} onOpenChange={(open) => !open && setHistoryOrg(null)}>
        <DialogContent className="max-w-2xl bg-[#0F0F0F] border-stone-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5 text-primary" />
              Histórico de Pagamentos
            </DialogTitle>
            <DialogDescription className="text-stone-400">
              Transações da agência <span className="font-semibold text-stone-200">{historyOrg?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {loadingHistory ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-stone-900 rounded animate-pulse" />)}</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-stone-500">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Nenhum histórico de pagamentos para esta agência.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-stone-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-stone-900/50 border-stone-800 hover:bg-stone-900/50">
                        <TableHead className="text-stone-400">Data</TableHead>
                        <TableHead className="text-stone-400">Descrição</TableHead>
                        <TableHead className="text-stone-400">Valor</TableHead>
                        <TableHead className="text-right text-stone-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map((p) => (
                        <TableRow key={p.id} className="border-stone-800 hover:bg-stone-900/20">
                          <TableCell className="text-sm whitespace-nowrap text-stone-300">
                            {format(new Date(p.payment_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2 text-stone-200">
                              <Receipt className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                              {p.description ?? 'Assinatura mensal Qualify'}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-stone-100">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5 text-stone-500" />
                              {p.amount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} {p.currency}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <PaymentStatusBadge status={p.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-stone-500">Página {historyPage} de {totalHistoryPages} ({payments.length} transações)</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={historyPage === 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} className="h-8 border-stone-800 text-stone-400">Anterior</Button>
                      <Button variant="outline" size="sm" disabled={historyPage === totalHistoryPages} onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))} className="h-8 border-stone-800 text-stone-400">Próximo</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Review Dialog ──────────────────────────────────────────────── */}
      {reviewRequest && (
        <ReviewDialog
          request={reviewRequest}
          onClose={() => setReviewRequest(null)}
          onDone={() => {
            setReviewRequest(null);
            loadTransfers();
            loadSubscriptions();
          }}
        />
      )}

      {/* ─── Manual Activation Panel ────────────────────────────────────── */}
      {showManualPanel && (
        <ManualActivationPanel
          onClose={() => setShowManualPanel(false)}
          onDone={() => {
            setShowManualPanel(false);
            loadSubscriptions();
          }}
        />
      )}
    </div>
  );
}
