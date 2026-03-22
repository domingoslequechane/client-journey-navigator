import { Link } from 'react-router-dom';
import { LandingHeader } from '@/components/landing/LandingHeader';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Rocket,
  Shield,
  Eye,
  Layout,
  CalendarCheck,
  Wallet,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  Receipt,
  GraduationCap,
  Link2,
  Palette,
  BarChart3,
  Share2,
  FileCheck,
  Calendar,
  MessageSquare,
  LayoutDashboard,
  Zap,
  Target,
  Users,
  LineChart,
  Briefcase,
  Bot,
  AlertTriangle,
  Timer,
  Plus,
  UserX
} from 'lucide-react';
import { AnimatedIllustration } from '@/components/landing/AnimatedIllustration';
import { useEffect, useState, useRef } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { usePWAInstall } from '@/hooks/usePWAInstall';

// Images
import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

// Plan Config mapping exactly as previously established
const planConfig = {
  starter: {
    name: 'Lança',
    subtitle: 'Para a Pequena Agência',
    price: 19,
    originalPrice: null,
    tagline: 'Profissionalize sua prospecção e fechamento.',
    image: planLanca,
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--primary) / 0.1)',
    features: ['5 clientes ativos', 'Contratos e faturas', '500 msgs IA', 'Academia de Marketing completa'],
  },
  pro: {
    name: 'Arco',
    subtitle: 'Para a Agência em Crescimento',
    price: 54,
    originalPrice: null,
    tagline: 'Automação total para quem não quer parar.',
    image: planArco,
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--primary) / 0.1)',
    features: ['15 clientes ativos', 'Todos os documentos', '1200 msgs IA', 'Academia de Marketing + IA'],
    popular: true,
  },
  agency: {
    name: 'Catapulta',
    subtitle: 'Para a Agência Consolidada',
    price: 99,
    originalPrice: null,
    tagline: 'Poder total para dominar o mercado.',
    image: planCatapulta,
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--primary) / 0.1)',
    features: ['30 clientes ativos', 'Docs ilimitados', 'IA ilimitada', 'Suporte prioritário'],
  },
};


export default function LandingPage() {
  const { t } = useTranslation('landing');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { canInstall, isInstalled, install } = usePWAInstall();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setIsScrolled(scrollTop > 20);
    setShowScrollTop(scrollTop > 500);
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="h-screen w-full bg-background text-foreground font-sans relative overflow-x-hidden overflow-y-auto custom-scrollbar scroll-smooth"
      onScroll={handleScroll}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <LandingHeader t={t} isScrolled={isScrolled} />

      <main className="relative z-10 pt-20 lg:pt-32">
        
        {/* HERO SECTION */}
        <section className="container mx-auto px-6 mb-24 md:mb-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Left Column: Text & CTA */}
            <div className="flex-1 max-w-2xl">
              <Badge variant="outline" className="mb-6 py-1.5 px-4 rounded-xl border-primary/30 bg-primary/5 text-primary">
                <Sparkles className="h-4 w-4 mr-2 inline" />
                A nova era das agências digitais
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                <span className="text-foreground">{t('hero.title')}</span>
                <span className="text-primary">{t('hero.titleHighlight')}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 font-medium leading-relaxed">
                {t('hero.subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full sm:w-auto rounded-xl px-8 text-base shadow-lg hover:shadow-primary/25 hover:-translate-y-1 transition-all">
                    {t('hero.cta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <div className="text-sm text-muted-foreground flex flex-col gap-1 px-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t('hero.trustNoCard') || 'Setup em 2 minutos'}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t('hero.trustCancel') || 'Cancele quando quiser'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Dashboard Mockup */}
            <div className="flex-1 relative w-full w-max-xl perspective-1000">
              <div className="relative transform rotate-y-[-10deg] rotate-x-[5deg] transition-transform duration-700">
                {/* Main Mockup Card */}
                <div className="bg-background border-2 border-border/80 rounded-2xl shadow-2xl overflow-hidden aspect-[4/3] flex flex-col backdrop-blur-sm">
                  {/* Mockup Header */}
                  <div className="h-10 bg-muted/50 border-b border-border/80 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive/60" />
                      <div className="w-3 h-3 rounded-full bg-warning/60" />
                      <div className="w-3 h-3 rounded-full bg-success/60" />
                    </div>
                  </div>
                  {/* Mockup Body Content (Simulated Kanban & Stats) */}
                  <div className="p-6 flex-1 bg-gradient-to-br from-background to-muted/50 flex gap-4">
                     {/* Sidebar fake */}
                     <div className="w-16 h-full flex flex-col gap-4 border-r border-border/80 pr-4">
                       <div className="h-8 w-8 rounded-lg bg-primary/20" />
                       <div className="h-8 w-8 rounded-lg bg-muted-foreground/20" />
                       <div className="h-8 w-8 rounded-lg bg-muted-foreground/20" />
                       <div className="h-8 w-8 rounded-lg bg-muted-foreground/20" />
                     </div>
                     {/* Kanban Fake */}
                     <div className="flex-1 flex gap-4 overflow-hidden">
                       <div className="w-1/3 flex flex-col gap-3">
                         <div className="h-4 w-20 bg-muted-foreground/30 rounded" />
                         <div className="h-24 bg-card rounded-xl border border-border shadow-sm" />
                         <div className="h-24 bg-card rounded-xl border border-border shadow-sm" />
                       </div>
                       <div className="w-1/3 flex flex-col gap-3">
                         <div className="h-4 w-16 bg-muted-foreground/30 rounded" />
                         <div className="h-24 bg-card rounded-xl border-2 border-primary/40 ring-4 ring-primary/5 shadow-md relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rounded-bl-lg" />
                         </div>
                       </div>
                       <div className="w-1/3 flex flex-col gap-3 opacity-60">
                         <div className="h-4 w-24 bg-muted-foreground/30 rounded" />
                         <div className="h-24 bg-card rounded-xl border border-border shadow-sm" />
                       </div>
                     </div>
                  </div>
                </div>

                {/* Floating Element 1 - Stats */}
                <div className="absolute -bottom-6 -left-6 bg-card border border-border/50 rounded-xl p-4 shadow-xl flex items-center gap-4 animate-float">
                  <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Contratos Ganhos</p>
                    <p className="text-xl font-bold">+12,5K</p>
                  </div>
                </div>

                {/* Floating Element 2 - AI Tag */}
                <div className="absolute -top-6 -right-6 bg-card border border-border/50 rounded-xl p-3 shadow-xl flex items-center gap-3 animate-float" style={{ animationDelay: '1s' }}>
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="pr-2">
                    <p className="text-sm font-bold">Qualify AI</p>
                    <p className="text-[10px] text-muted-foreground">Assistente Online</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUSTED BY / MARQUEE */}
        <section className="py-10 border-y border-border/50 bg-muted/20 overflow-hidden">
          <div className="container mx-auto px-6 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">A escolha das agências que dominam o mercado</p>
            <div className="flex items-center justify-center flex-wrap gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="text-xl md:text-2xl font-bold font-mono">AgencyPro</div>
              <div className="text-xl md:text-2xl font-bold flex items-center gap-2"><Rocket className="h-6 w-6"/> ScaleUp</div>
              <div className="text-xl md:text-2xl font-bold italic">DigitalForce</div>
              <div className="text-xl md:text-2xl font-extrabold uppercase">Growth<span className="text-primary">.co</span></div>
              <div className="text-xl md:text-2xl font-medium tracking-widest">NEXUS</div>
            </div>
          </div>
        </section>

        {/* O PROBLEMA (THE COSTS) */}
        <section id="problema" className="py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t('cost.title')} <span className="text-destructive font-extrabold">{t('cost.titleHighlight')}</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Muitas agências patinam não por falta de leads, mas por vazamentos na operação e gestão caótica.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <Card className="bg-card border border-border/60 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-b from-background to-destructive/5 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 blur-3xl rounded-full -mr-10 -mt-10" />
                <CardHeader className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform border border-destructive/20">
                    <AlertTriangle className="h-7 w-7 text-destructive" />
                  </div>
                  <CardTitle className="text-xl mb-2">{t('cost.revenueLoss')}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground leading-relaxed">
                    {t('cost.revenueLossText')}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 2 */}
              <Card className="bg-card border border-border/60 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-b from-background to-warning/5 group md:translate-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 blur-3xl rounded-full -mr-10 -mt-10" />
                <CardHeader className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-warning/10 flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform border border-warning/20">
                    <Timer className="h-7 w-7 text-warning" />
                  </div>
                  <CardTitle className="text-xl mb-2">{t('cost.hoursWasted')}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground leading-relaxed">
                    {t('cost.hoursWastedText')}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 3 */}
              <Card className="bg-card border border-border/60 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-b from-background to-destructive/5 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 blur-3xl rounded-full -mr-10 -mt-10" />
                <CardHeader className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform border border-destructive/20">
                    <UserX className="h-7 w-7 text-destructive" />
                  </div>
                  <CardTitle className="text-xl mb-2">{t('cost.clientsLost')}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground leading-relaxed">
                    {t('cost.clientsLostText')}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
            
            <div className="mt-16 text-center p-8 bg-muted/40 rounded-2xl border border-border/50 max-w-2xl mx-auto">
              <p className="text-lg font-medium text-foreground">
                {t('cost.conclusion')} <span className="text-primary font-bold">{t('cost.conclusionHighlight')}</span>
              </p>
            </div>
          </div>
        </section>

        {/* ESTATÍSTICAS / PROVA SOCIAL (Novo) */}
        <section className="py-16 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="container mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-primary-foreground/20">
              <div className="px-4">
                <div className="text-4xl md:text-5xl font-extrabold mb-2">3+</div>
                <div className="text-sm font-medium opacity-90">Anos de Experiência (Time)</div>
              </div>
              <div className="px-4">
                <div className="text-4xl md:text-5xl font-extrabold mb-2">10h</div>
                <div className="text-sm font-medium opacity-90">Economizadas / Semana</div>
              </div>
              <div className="px-4">
                <div className="text-4xl md:text-5xl font-extrabold mb-2">85%</div>
                <div className="text-sm font-medium opacity-90">Taxa de Conversão da Ferramenta</div>
              </div>
            </div>
          </div>
        </section>

        {/* FUNCIONALIDADES / A SOLUÇÃO (Zig-Zag Layout) */}
        <section id="funcionalidades" className="py-24">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Entregamos a você o nosso melhor serviço
              </h2>
              <p className="text-lg text-muted-foreground">
                Tudo o que uma agência ou consultor precisa para atrair, fechar e reter clientes, unificado em uma interface perfeita.
              </p>
            </div>

            <div className="flex flex-col gap-24">
              {/* Feature 1: Máquina Comercial (CRM) */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 order-2 md:order-1 relative">
                  <div className="bg-card w-full aspect-video rounded-3xl border-2 border-border shadow-2xl overflow-hidden flex flex-col bg-gradient-to-tr from-background to-muted/50 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/20" />
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
                      <div className="flex gap-4">
                        <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Pipeline</div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-50">Leads</div>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-destructive/40" />
                        <div className="w-2 h-2 rounded-full bg-warning/40" />
                        <div className="w-2 h-2 rounded-full bg-success/40" />
                      </div>
                    </div>
                    <div className="flex-1 p-4 flex gap-4 overflow-hidden">
                      {/* Column 1 */}
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center justify-between px-2">
                           <span className="text-[9px] font-bold text-muted-foreground uppercase">Prospecção</span>
                           <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">2</span>
                        </div>
                        <div className="bg-background shadow-sm rounded-xl border border-border p-3 space-y-2 hover:border-primary/30 transition-colors">
                          <div className="w-full h-2 bg-muted-foreground/20 rounded" />
                          <div className="w-3/4 h-2 bg-muted-foreground/10 rounded" />
                          <div className="flex justify-between items-center pt-1">
                            <div className="w-6 h-6 rounded-full bg-primary/20" />
                            <div className="text-[9px] font-bold text-success">$ 5.200</div>
                          </div>
                        </div>
                      </div>
                      {/* Column 2 */}
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center justify-between px-2">
                           <span className="text-[9px] font-bold text-muted-foreground uppercase">Fechamento</span>
                           <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">1</span>
                        </div>
                        <div className="bg-background shadow-md rounded-xl border-2 border-primary/30 p-3 space-y-2 relative">
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
                          <div className="w-full h-2 bg-primary/20 rounded" />
                          <div className="w-1/2 h-2 bg-primary/10 rounded" />
                          <div className="flex justify-between items-center pt-1">
                            <div className="flex -space-x-2">
                              <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background" />
                              <div className="w-6 h-6 rounded-full bg-muted-foreground/20 border-2 border-background" />
                            </div>
                            <div className="text-[9px] font-bold text-primary">$ 12.000</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Decorative */}
                  <div className="absolute -z-10 -bottom-6 -left-6 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
                </div>
                <div className="flex-1 order-1 md:order-2">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{t('features.clients.title')}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t('features.clients.description')}
                  </p>
                </div>
              </div>

              {/* Feature 2: Cérebro Estratégico (QIA) */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{t('features.qia.title')}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t('features.qia.description')}
                  </p>
                </div>
                <div className="flex-1 relative">
                   <div className="bg-card w-full aspect-video rounded-3xl border-2 border-primary/20 shadow-[0_0_50px_-12px_hsla(var(--primary),0.2)] overflow-hidden flex p-6 items-center justify-center bg-gradient-to-bl from-primary/5 to-background">
                     <div className="w-[85%] bg-background border border-border shadow-xl rounded-2xl p-5">
                       <div className="flex items-start gap-4 mb-5">
                         <div className="w-10 h-10 rounded-xl bg-primary/20 flex-shrink-0 flex items-center justify-center shadow-inner"><Bot className="w-6 h-6 text-primary" /></div>
                         <div className="bg-muted p-4 rounded-2xl rounded-tl-sm text-sm font-medium border border-border/50 shadow-sm text-foreground">Qual seu próximo passo estratégico?</div>
                       </div>
                       <div className="flex items-start gap-4 flex-row-reverse">
                         <div className="w-10 h-10 rounded-xl bg-muted-foreground/20 flex-shrink-0 shadow-inner" />
                         <div className="bg-primary shadow-lg shadow-primary/25 text-primary-foreground p-4 rounded-2xl rounded-tr-sm text-sm font-semibold">Gere uma resposta de persuasão para o Lead A.</div>
                       </div>
                     </div>
                   </div>
                </div>
              </div>

              {/* Feature 3: Automação Burocrática (Docs) */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 order-2 md:order-1 relative">
                  <div className="bg-card w-full aspect-video rounded-3xl border-2 border-border shadow-2xl overflow-hidden flex flex-col items-center justify-center bg-gradient-to-tr from-muted/50 to-background relative p-8">
                    <div className="w-full max-w-[240px] bg-background rounded-xl border border-border shadow-2xl p-6 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="w-32 h-3 bg-foreground/10 rounded mb-1" />
                          <div className="w-20 h-2 bg-muted-foreground/10 rounded" />
                        </div>
                      </div>
                      <div className="space-y-3 mb-8">
                        <div className="w-full h-2 bg-muted-foreground/5 rounded" />
                        <div className="w-full h-2 bg-muted-foreground/5 rounded" />
                        <div className="w-4/5 h-2 bg-muted-foreground/5 rounded" />
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4">
                         <div className="flex flex-col gap-1">
                           <div className="text-[8px] font-bold text-muted-foreground uppercase">Status</div>
                           <div className="flex items-center gap-1 text-[10px] font-bold text-success uppercase"><CheckCircle2 className="w-3 h-3" /> Assinado</div>
                         </div>
                         <div className="w-8 h-8 rounded-full border-2 border-primary/40 bg-primary/5 flex items-center justify-center italic text-[10px] font-serif text-primary">JD</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 order-1 md:order-2">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{t('features.docs.title')}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t('features.docs.description')}
                  </p>
                </div>
              </div>

              {/* Feature 4: Studio Criativo & Hub Social */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1">
                  <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-6">
                    <Palette className="h-6 w-6 text-violet-500" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{t('features.link23.title')}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t('features.link23.description')}
                  </p>
                </div>
                <div className="flex-1 relative">
                  <div className="bg-card w-full aspect-video rounded-3xl border-2 border-border shadow-2xl overflow-hidden flex flex-col bg-gradient-to-br from-background to-muted/50">
                    <div className="flex justify-between items-center px-5 py-3 border-b border-border/50 bg-background/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center"><Calendar className="w-4 h-4 text-violet-500" /></div>
                        <div className="text-xs font-bold text-foreground">Social Hub</div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 gap-2 text-[10px] bg-background hover:bg-violet-500 hover:text-white transition-all"><Plus className="w-3 h-3" /> Novo Agendamento</Button>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4 flex-1 overflow-hidden">
                       <div className="bg-background rounded-2xl border border-border p-3 flex flex-col gap-3 shadow-sm group hover:border-violet-300 transition-colors">
                         <div className="w-full aspect-video bg-violet-500/5 rounded-xl border border-violet-500/10 flex items-center justify-center relative overflow-hidden">
                            <Sparkles className="w-6 h-6 text-violet-500/20" />
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-violet-500 text-white text-[8px] font-bold rounded-full">Agendado: 14:30</div>
                         </div>
                         <div className="space-y-2">
                           <div className="w-full h-2 bg-foreground/10 rounded" />
                           <div className="w-2/3 h-2 bg-muted-foreground/10 rounded" />
                         </div>
                       </div>
                       <div className="bg-background rounded-2xl border border-border p-3 flex flex-col gap-3 shadow-sm opacity-60">
                         <div className="w-full aspect-video bg-muted/20 rounded-xl border border-border/50 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-muted-foreground/20" />
                         </div>
                         <div className="space-y-2">
                           <div className="w-full h-2 bg-muted-foreground/10 rounded" />
                           <div className="w-1/2 h-2 bg-muted-foreground/10 rounded" />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 5: Presença Digital & Link 23 */}
              <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 order-2 md:order-1 relative">
                  <div className="bg-card w-full aspect-video rounded-3xl border-2 border-border shadow-2xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-background to-muted/50">
                    <div className="w-[180px] h-[310px] border-[8px] border-border/80 rounded-[2.5rem] bg-background flex flex-col items-center p-4 shadow-2xl relative overflow-hidden group hover:border-orange-500/40 transition-colors duration-500">
                      <div className="absolute top-2 w-16 h-1 rounded-full bg-border" />
                      <div className="w-full flex justify-between px-2 pt-2 pb-4 opacity-40">
                        <div className="text-[7px] font-bold tracking-tighter">9:41</div>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full border border-current opacity-50" />
                          <div className="w-2 h-2 rounded-sm bg-current" />
                        </div>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-primary mb-3 shadow-lg ring-4 ring-background flex items-center justify-center overflow-hidden">
                        <div className="text-[10px] font-black text-white tracking-widest leading-none text-center">QUALIFY<br/>AGENCY</div>
                      </div>
                      <div className="w-3/4 h-3 bg-foreground/10 rounded-full mb-1" />
                      <div className="w-1/2 h-1.5 bg-muted-foreground/10 rounded-full mb-6" />
                      
                      <div className="w-full space-y-2 px-2">
                        <div className="w-full h-9 bg-primary/10 rounded-xl border border-primary/20 shadow-sm flex items-center px-3 gap-2 group/btn hover:bg-primary/20 transition-colors">
                          <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Share2 className="w-3 h-3 text-primary" />
                          </div>
                          <div className="w-16 h-1 bg-primary/40 rounded" />
                        </div>
                        <div className="w-full h-9 bg-background rounded-xl border border-border shadow-sm flex items-center px-3 gap-2">
                          <div className="w-5 h-5 rounded-lg bg-muted flex items-center justify-center">
                            <Bot className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="w-20 h-1 bg-muted-foreground/10 rounded" />
                        </div>
                        <div className="w-full h-9 bg-background rounded-xl border border-border shadow-sm flex items-center px-3 gap-2">
                          <div className="w-5 h-5 rounded-lg bg-muted flex items-center justify-center">
                            <Layout className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="w-24 h-1 bg-muted-foreground/10 rounded" />
                        </div>
                      </div>

                      <div className="mt-6 flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><div className="w-4 h-4 rounded bg-muted-foreground/20" /></div>
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><div className="w-4 h-4 rounded bg-muted-foreground/20" /></div>
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><div className="w-4 h-4 rounded bg-muted-foreground/20" /></div>
                      </div>

                      <div className="absolute top-1/2 -right-8 bg-success text-success-foreground p-2 rounded-lg text-[8px] font-bold shadow-lg transform rotate-6 animate-bounce">
                         +32% Cliques
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-1 order-1 md:order-2">
                  <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
                    <Share2 className="h-6 w-6 text-orange-500" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{t('features.presence.title')}</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {t('features.presence.description')}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* PRICING SECTION - Dark Contrast layout */}
        <section id="planos" className="py-24 bg-card border-y border-border/50 text-card-foreground">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Preços Simples e Flexíveis
              </h2>
              <p className="text-lg text-muted-foreground">
                Teste o nosso plano premium por 7 dias. Depois, escolha a capacidade ideal para sua operação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {(Object.entries(planConfig) as [string, typeof planConfig.pro][]).map(([key, plan]) => {
                const planKey = key as 'starter' | 'pro' | 'agency';
                const isPopular = 'popular' in plan && plan.popular;
                
                return (
                  <Card 
                    key={key}
                    className={`relative overflow-hidden flex flex-col transition-all duration-300 border-border/50 bg-background/50 backdrop-blur-sm ${
                      isPopular 
                        ? 'ring-2 ring-primary/40 shadow-[0_0_50px_-12px_hsla(var(--primary),0.3)] scale-100 md:scale-105 z-10' 
                        : 'shadow-sm hover:shadow-lg'
                    }`}
                    style={isPopular ? { borderColor: plan.color } : {}}
                  >
                    {isPopular && (
                      <div className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest text-center py-1.5 shadow-sm">
                        Plano Recomendado
                      </div>
                    )}
                    <CardHeader className="text-center pb-8 border-b border-border/50 bg-muted/20 space-y-2">
                      <CardTitle className="text-3xl font-extrabold" style={{ color: plan.color }}>
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-sm font-semibold opacity-80">
                        {plan.subtitle}
                      </CardDescription>
                      <div className="flex items-baseline justify-center gap-1 pt-2">
                        <span className="text-5xl font-black">${plan.price}</span>
                        <span className="text-muted-foreground font-bold">/mês</span>
                      </div>
                      
                      {/* FREE TRIAL BADGE */}
                      <div className="flex justify-center pt-1">
                        <span className="bg-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg transform hover:scale-105 transition-transform uppercase tracking-tighter">
                          7 Dias Grátis
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-4 italic font-medium px-4">
                        {plan.tagline}
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1 p-8 flex flex-col">
                      <ul className="space-y-4 mb-10 flex-1">
                        {plan.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-start gap-3 text-sm group">
                            <div className="mt-0.5 rounded-full p-0.5 bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                            </div>
                            <span className="text-foreground/80 font-semibold">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link to="/auth" className="block w-full mt-auto">
                        <Button 
                          className="w-full h-14 text-base font-extrabold rounded-2xl shadow-xl hover:-translate-y-1 transition-all gap-2"
                          style={{ 
                            backgroundColor: plan.color,
                            boxShadow: `0 10px 20px -5px ${plan.bgColor}`
                          }}
                        >
                          <Zap className="w-5 h-5 fill-current" />
                          Começar Agora
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
              </div>

              {/* NEW: Price bottom info */}
              <div className="mt-28 text-center space-y-12 pb-12">
                <p className="text-muted-foreground font-medium text-lg">
                  {t('pricing.cancelAnytime')}
                </p>
                <Link to="/pricing">
                  <Button 
                    variant="outline" 
                    className="h-14 px-10 border-border bg-background shadow-md rounded-2xl gap-3 hover:bg-muted font-bold transition-all hover:shadow-xl group"
                  >
                    <Eye className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    {t('pricing.comparePlans')}
                  </Button>
                </Link>
              </div>
            </div>
          </section>

        {/* BOTTOM CTA */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <div className="bg-primary text-primary-foreground rounded-[2.5rem] p-10 md:p-16 text-center max-w-5xl mx-auto shadow-2xl relative overflow-hidden">
              {/* Decorative shapes */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl blend-overlay" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/10 rounded-full blur-3xl blend-overlay" />
              
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
                  Pronto para escalar seu Negócio Digital?
                </h2>
                <p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto">
                  Junte-se a consultores e agências que automatizam o operacional e multiplicam suas receitas sem precisar trabalhar 14 horas por dia.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                  <Link to="/auth" className="w-full">
                    <Button size="lg" variant="secondary" className="w-full h-14 text-lg font-bold rounded-xl shadow-xl hover:-translate-y-1 transition-transform">
                      Criar conta gratuitamente
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
                <p className="mt-6 text-sm opacity-80 font-medium">
                  {t('hero.trustNoCard') || 'Setup em 2 minutos'}
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-muted text-muted-foreground py-12 border-t border-border mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-primary/20 text-primary rounded flex items-center justify-center font-bold text-xs ring-1 ring-primary/50">
                Q
              </div>
              <span className="font-semibold text-foreground">Qualify</span>
            </div>
            
            <div className="flex gap-8 text-sm font-medium">
              <a href="#" className="hover:text-foreground transition-colors">Termos & Condições</a>
              <a href="#" className="hover:text-foreground transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Contato</a>
            </div>
            
            <p className="text-sm">
              &copy; {new Date().getFullYear()} Qualify Marketing. Direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* FLOATING BACK TO TOP BUTTON */}
      <Button
        variant="secondary"
        size="icon"
        className={`fixed bottom-8 right-8 z-[110] rounded-full w-12 h-12 shadow-2xl transition-all duration-300 transform border border-border/50 bg-background/80 backdrop-blur-md ${
          showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
        } hover:bg-primary hover:text-primary-foreground group`}
        onClick={scrollToTop}
        aria-label="Voltar ao topo"
      >
        <ArrowRight className="h-6 w-6 -rotate-90 group-hover:-translate-y-1 transition-transform" />
      </Button>
    </div>
  );
}