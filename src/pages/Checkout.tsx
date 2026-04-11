import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CreditCard, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { getPlanColors } from '@/lib/plan-colors';
import { useOrganization } from '@/hooks/useOrganization';
import { PaymentProofUpload } from '@/components/billing/PaymentProofUpload';
import { cn } from '@/lib/utils';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

const plans = [
  { key: 'starter', name: 'Lança', price: 19, period: '/mês', description: 'Para agências em crescimento', image: planLanca },
  { key: 'pro', name: 'Arco', price: 54, period: '/mês', description: 'Para agências estabelecidas', image: planArco },
  { key: 'agency', name: 'Catapulta', price: 99, period: '/mês', description: 'Para grandes agências', image: planCatapulta },
];

type PaymentMethod = 'card' | 'mpesa' | 'emola' | 'bank_transfer';
type CheckoutStep = 'method' | 'instructions' | 'upload' | 'done';

const LOCAL_METHODS: { key: PaymentMethod; label: string; sublabel: string; icon: string; color: string }[] = [
  { key: 'mpesa', label: 'M-Pesa', sublabel: 'Carteira móvel Vodacom', icon: '💚', color: '#ee0000' },
  { key: 'emola', label: 'E-Mola', sublabel: 'Carteira móvel Emtel', icon: '🔵', color: '#003399' },
  { key: 'bank_transfer', label: 'Banco BIM', sublabel: 'Transferência bancária', icon: '🏦', color: '#005BAC' },
];

const PAYMENT_DETAILS: Record<string, { field: string; value: string }[]> = {
  mpesa: [
    { field: 'Número', value: '+258 85 313 5136' },
    { field: 'Titular', value: 'Domingos Francisco Lequechane' },
    { field: 'Rede', value: 'Vodacom M-Pesa 🇲🇿' },
  ],
  emola: [
    { field: 'Número', value: '+258 86 849 9221' },
    { field: 'Titular', value: 'Domingos Francisco Lequechane' },
    { field: 'Rede', value: 'Emtel E-Mola 🇲🇿' },
  ],
  bank_transfer: [
    { field: 'Banco', value: 'BIM - Banco Internacional de Moçambique' },
    { field: 'Conta', value: '7810 9269 5' },
    { field: 'NIB', value: '0001 0000 0078 1092 6955 7' },
    { field: 'Titular', value: 'Domingos Francisco Lequechane' },
  ],
};

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const planKey = searchParams.get('plan');
  const plan = plans.find(p => p.key === planKey);

  const { user, loading: authLoading } = useAuth();
  const { currency, currencySymbol } = useOrganization();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  const isMZN = currency === 'MZN';
  const exchangeRate = isMZN ? 65 : 1;
  const formatPrice = (usd: number) => {
    if (isMZN) return `${currencySymbol} ${(usd * exchangeRate).toLocaleString('pt-PT')}`;
    return `$${usd}`;
  };

  // Fluxo de checkout
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<CheckoutStep>('method');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!planKey || !plan) { navigate('/select-plan'); return; }

    const checkOrg = async () => {
      try {
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, current_organization_id')
          .eq('id', user.id)
          .single();
        const orgId = profile?.current_organization_id || profile?.organization_id;
        if (orgId) setOrganizationId(orgId);
        else { toast.error('Organização não encontrada'); navigate('/select-plan'); }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    checkOrg();
  }, [user, authLoading, navigate, planKey, plan]);

  const handleCardPayment = async () => {
    if (!organizationId || !user || !plan) return;
    setLoadingPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const response = await fetch(
        'https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/create-checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ organizationId, planType: plan.key, userEmail: user.email, userName: user.user_metadata?.full_name }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao criar checkout');
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else throw new Error('URL de checkout não encontrada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar pagamento');
      setLoadingPayment(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleProofSuccess = () => {
    setStep('done');
  };

  if (authLoading || loading) {
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicBackground>
    );
  }

  if (!plan) return null;

  const colors = getPlanColors(plan.key);

  // ─── STEP: DONE ─────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <PublicBackground>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardContent className="pt-10 pb-8 flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-10 w-10 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Comprovativo Enviado!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A nossa equipa irá validar o seu pagamento e activar o plano{' '}
                  <strong>{plan.name}</strong> em breve.
                  <br />
                  <br />
                  Irá receber uma notificação assim que a assinatura for activada.
                  <br />
                  <span className="text-xs text-muted-foreground/70">
                    Tempo estimado: 10–15 min (Seg–Sáb, 08h–17h)
                  </span>
                </p>
              </div>
              <Button
                className="w-full mt-2"
                variant="outline"
                onClick={() => navigate('/select-plan')}
              >
                Voltar à Página de Planos
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicBackground>
    );
  }

  return (
    <PublicBackground>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-4xl">

          {/* Back link */}
          {step === 'method' && (
            <Link to="/select-plan" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Planos
            </Link>
          )}
          {(step === 'instructions' || step === 'upload') && (
            <button
              onClick={() => setStep(step === 'upload' ? 'instructions' : 'method')}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </button>
          )}

          <h1 className="text-3xl font-bold mb-2">Finalizar Assinatura</h1>
          <p className="text-muted-foreground mb-8 text-sm">Plano <strong>{plan.name}</strong> — {formatPrice(plan.price)}/mês</p>

          <div className="grid md:grid-cols-[1fr_2fr] gap-6 items-start">

            {/* Resumo do plano */}
            <Card className="bg-card/50 backdrop-blur-sm border-dashed">
              <CardHeader className="text-center pb-4">
                <img src={plan.image} alt={plan.name} className="w-16 h-16 mx-auto mb-3 object-contain" />
                <CardTitle className="text-xl" style={{ color: colors.primary }}>Plano {plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold" style={{ color: colors.primary }}>{formatPrice(plan.price)}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-2 mt-6">
                  {(['method', 'instructions', 'upload'] as const).map((s, i) => (
                    <div key={s} className="flex items-center gap-1">
                      <div className={cn(
                        'w-2 h-2 rounded-full transition-colors',
                        step === s ? 'bg-primary' : ['method', 'instructions', 'upload'].indexOf(step) > i ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                      )} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Passo {(['method', 'instructions', 'upload'] as const).indexOf(step) + 1} de 3
                </p>
              </CardContent>
            </Card>

            {/* Área principal do checkout */}
            <Card className="shadow-lg">
              <CardContent className="p-6">

                {/* ── STEP 1: ESCOLHER MÉTODO ─────────────────── */}
                {step === 'method' && (
                  <div className="space-y-4">
                    <div className="mb-2">
                      <h2 className="text-lg font-semibold">Método de Pagamento</h2>
                      <p className="text-sm text-muted-foreground">Escolha a forma mais conveniente para si</p>
                    </div>

                    {/* Cartão automático */}
                    <button
                      onClick={() => { setSelectedMethod('card'); }}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-primary/60 hover:bg-primary/5 group',
                        selectedMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border'
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">Cartão Internacional</p>
                        <p className="text-xs text-muted-foreground">Visa, Mastercard — via LemonSqueezy · Renovação automática</p>
                      </div>
                      {selectedMethod === 'card' && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex-1 h-px bg-border" />
                      <span>ou pagamento local</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Métodos locais */}
                    {LOCAL_METHODS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setSelectedMethod(m.key as PaymentMethod)}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:bg-muted/30',
                          selectedMethod === m.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'
                        )}
                      >
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                          {m.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.sublabel} · Activação em 10–15 min</p>
                        </div>
                        {selectedMethod === m.key && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    ))}

                    {/* CTA */}
                    <Button
                      className="w-full h-12 mt-2"
                      disabled={!selectedMethod}
                      onClick={() => {
                        if (selectedMethod === 'card') handleCardPayment();
                        else setStep('instructions');
                      }}
                      style={selectedMethod && selectedMethod !== 'card' ? { backgroundColor: colors.primary } : undefined}
                    >
                      {loadingPayment ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A processar...</>
                      ) : (
                        <>Continuar <ArrowRight className="h-4 w-4 ml-2" /></>
                      )}
                    </Button>
                  </div>
                )}

                {/* ── STEP 2: INSTRUÇÕES DE PAGAMENTO ─────────── */}
                {step === 'instructions' && selectedMethod && selectedMethod !== 'card' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Dados para Transferência via {LOCAL_METHODS.find(m => m.key === selectedMethod)?.label}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Transfira <strong>{formatPrice(plan.price)}</strong> para os dados abaixo e guarde o comprovativo.
                      </p>
                    </div>

                    {/* Dados de pagamento */}
                    <div className="rounded-xl border overflow-hidden">
                      {PAYMENT_DETAILS[selectedMethod]?.map((d, i) => (
                        <div
                          key={d.field}
                          className={cn(
                            'flex items-center justify-between px-5 py-3.5 gap-4',
                            i < PAYMENT_DETAILS[selectedMethod].length - 1 ? 'border-b' : ''
                          )}
                        >
                          <span className="text-sm text-muted-foreground shrink-0">{d.field}</span>
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="font-semibold text-sm text-right">{d.value}</span>
                            <button
                              onClick={() => copyToClipboard(d.value, d.field)}
                              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                            >
                              {copied === d.field ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Valor a transferir */}
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
                      <span className="text-sm font-medium">Valor a Transferir</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold" style={{ color: colors.primary }}>{formatPrice(plan.price)}</span>
                        <button
                          onClick={() => copyToClipboard(isMZN ? String(plan.price * exchangeRate) : String(plan.price), 'amount')}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {copied === 'amount' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-muted/40 p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                      <p>Transferências manuais levam de <strong>10 a 15 minutos</strong> para activação. (Horário laboral: Seg–Sáb, 08h–17h).</p>
                    </div>

                    <Button
                      className="w-full h-12"
                      onClick={() => setStep('upload')}
                      style={{ backgroundColor: colors.primary, color: 'white' }}
                    >
                      Já Efectuei a Transferência <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}

                {/* ── STEP 3: UPLOAD DO COMPROVATIVO ──────────── */}
                {step === 'upload' && selectedMethod && selectedMethod !== 'card' && organizationId && user && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">Enviar Comprovativo</h2>
                      <p className="text-sm text-muted-foreground">
                        Carregue o screenshot ou PDF do comprovativo de pagamento.
                      </p>
                    </div>
                    <PaymentProofUpload
                      planKey={plan.key}
                      planName={plan.name}
                      planPrice={plan.price}
                      planPriceFormatted={formatPrice(plan.price)}
                      organizationId={organizationId}
                      userId={user.id}
                      paymentMethod={selectedMethod as 'mpesa' | 'emola' | 'bank_transfer'}
                      onSuccess={handleProofSuccess}
                      onCancel={() => setStep('instructions')}
                    />
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicBackground>
  );
}
