import { Link } from 'react-router-dom';
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
  Clock,
  TrendingUp,
  Star,
  CreditCard,
  HelpCircle,
  Bot,
  LayoutGrid,
  AlertTriangle,
  Timer,
  UserX,
  Eye,
  CalendarCheck,
  Wallet,
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
  Briefcase
} from 'lucide-react';
import { AnimatedIllustration } from '@/components/landing/AnimatedIllustration';
import { useEffect, useState, useRef } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSelector } from '@/components/ui/language-selector';
import { usePWAInstall } from '@/hooks/usePWAInstall';

// Plan images
import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

// Plan colors and config
const planConfig = {
  starter: {
    name: 'Lança',
    subtitle: 'Freelancers / Pequenas Agências',
    price: 19,
    originalPrice: null,
    tagline: 'O essencial para começar a crescer.',
    image: planLanca,
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 60%, 0.1)',
    profitMargin: 'Alta (~$11/user)',
    features: ['5 Marcas (Clientes)', 'Redes Sociais Ilimitadas', '5 Créditos Studio AI / dia', 'Módulos: Finanças, Editorial, Link23'],
  },
  pro: {
    name: 'Arco',
    subtitle: 'Agências em Crescimento',
    price: 39,
    originalPrice: null,
    tagline: 'Ferramentas para escalar seus resultados.',
    image: planArco,
    color: 'hsl(270, 91%, 65%)',
    bgColor: 'hsl(270, 91%, 65%, 0.1)',
    profitMargin: 'Média (~$14/user)',
    features: ['15 Marcas (Clientes)', '15 Créditos Studio AI / dia', 'Tudo do Lança + Inbox/Analytics', 'Suporte Prioritário'],
    popular: true,
  },
  agency: {
    name: 'Catapulta',
    subtitle: 'Grandes Agências / White Label',
    price: 79,
    originalPrice: null,
    tagline: 'Poder total para dominar o mercado.',
    image: planCatapulta,
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'hsl(25, 95%, 53%, 0.1)',
    profitMargin: 'Estável (~$26/user)',
    features: ['50 Marcas (Clientes)', '30 Créditos Studio AI / dia', 'Tudo do Arco + Suporte VIP', 'Acesso Antecipado a Recursos'],
  },
};

export default function LandingPage() {
  const { t } = useTranslation('landing');
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { canInstall, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
      
      {/* Parallax Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-background to-background" />
        
        <div 
          className="absolute top-[5%] left-[5%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-primary/8 rounded-full blur-[120px]"
          style={{ animation: 'glow 8s ease-in-out infinite' }}
        />
        <div 
          className="absolute top-[50%] right-[5%] w-[25vw] h-[25vw] max-w-[350px] max-h-[350px] bg-primary/6 rounded-full blur-[100px]"
          style={{ animation: 'glow 10s ease-in-out infinite', animationDelay: '2s' }}
        />
        <div 
          className="absolute bottom-[10%] left-[15%] w-[20vw] h-[20vw] max-w-[300px] max-h-[300px] bg-primary/8 rounded-full blur-[80px]"
          style={{ animation: 'glow 12s ease-in-out infinite', animationDelay: '4s' }}
        />
        
        <div 
          className="absolute top-[15%] right-[15%] w-20 h-20 border border-primary/10 rounded-xl rotate-45 transition-transform duration-100"
          style={{ transform: `translateY(${scrollY * 0.1}px) rotate(45deg)` }}
        />
        <div 
          className="absolute top-[45%] left-[8%] w-14 h-14 border border-primary/10 rounded-full transition-transform duration-100"
          style={{ transform: `translateY(${scrollY * -0.08}px)` }}
        />
        <div 
          className="absolute top-[70%] right-[12%] w-24 h-24 border border-primary/8 rounded-2xl rotate-12 transition-transform duration-100"
          style={{ transform: `translateY(${scrollY * 0.12}px) rotate(12deg)` }}
        />
        
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-gradient-to-r from-background/95 via-primary/5 to-background/95 backdrop-blur-md border-b border-border shadow-lg' 
          : 'bg-transparent'
      }`}>
        <div className={`absolute inset-0 transition-opacity duration-500 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 animate-pulse" style={{ animationDuration: '4s' }} />
        </div>
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-xl">Q</span>
            </div>
            <span className="font-bold text-2xl tracking-tight">Qualify</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#problema" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('header.problem')}</a>
            <a href="#solucao" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('header.solution')}</a>
            <a href="#planos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('header.plans')}</a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('header.faq')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            {canInstall && !isInstalled && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={install}
                title={t('header.installApp')}
                className="hidden sm:inline-flex"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">{t('header.login')}</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-2 shadow-lg shadow-primary/25">
                <span className="hidden sm:inline">{t('header.cta')}</span>
                <span className="sm:hidden">{t('header.ctaMobile')}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              {t('hero.title')}{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">{t('hero.titleHighlight')}</span>
                <span className="absolute -bottom-2 left-0 right-0 h-4 bg-primary/20 -rotate-1" />
              </span>
              {' '}{t('hero.titleEnd')}
            </h1>
            
            <p 
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 animate-fade-in max-w-3xl mx-auto leading-relaxed"
              style={{ animationDelay: '0.4s' }}
            >
              {t('hero.subtitle')}
            </p>
            
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in"
              style={{ animationDelay: '0.6s' }}
            >
              <Link to="/auth">
                <Button size="lg" className="text-lg sm:text-xl px-8 sm:px-12 py-6 sm:py-8 gap-2 sm:gap-3 shadow-2xl shadow-primary/40 hover:shadow-primary/50 transition-all hover:scale-105 group">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="hidden sm:inline">{t('hero.cta')}</span>
                  <span className="sm:hidden">{t('hero.ctaMobile')}</span>
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link to="/demo">
                <Button size="lg" variant="outline" className="text-lg sm:text-xl px-6 sm:px-10 py-6 sm:py-8 gap-2 sm:gap-3 hover:bg-primary/5 transition-all">
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
                  Ver Demonstração
                </Button>
              </Link>
            </div>
            
            <div 
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-10 text-xs sm:text-sm text-muted-foreground animate-fade-in"
              style={{ animationDelay: '0.8s' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>{t('hero.trustNoCard')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>{t('hero.trustSetup')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>{t('hero.trustCancel')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section id="problema" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
                  {t('problem.title')}{' '}
                  <span className="text-destructive">{t('problem.titleHighlight')}</span>
                </h2>
                
                <div className="space-y-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
                  <p>{t('problem.description1')}</p>
                  <p className="text-foreground font-medium">
                    {t('problem.description2')} <span className="text-destructive">{t('problem.description2Highlight')}</span>
                  </p>
                </div>
              </div>
              <AnimatedIllustration section="problema" animationDirection="right" className="h-64 md:h-80" />
            </div>
          </div>
        </div>
      </section>

      {/* CUSTO */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <AnimatedIllustration section="custo" animationDirection="left" className="h-64 md:h-80 order-2 md:order-1" />
              <div className="order-1 md:order-2 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  {t('cost.title')}{' '}
                  <span className="text-destructive">{t('cost.titleHighlight')}</span>
                </h2>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-2xl font-bold text-destructive mb-2">{t('cost.revenueLoss')}</div>
                <p className="text-muted-foreground text-sm">{t('cost.revenueLossText')}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Briefcase className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-2xl font-bold text-destructive mb-2">{t('cost.hoursWasted')}</div>
                <p className="text-muted-foreground text-sm">{t('cost.hoursWastedText')}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <LineChart className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-2xl font-bold text-destructive mb-2">{t('cost.clientsLost')}</div>
                <p className="text-muted-foreground text-sm">{t('cost.clientsLostText')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section id="solucao" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                {t('solution.title')} <span className="text-primary">{t('solution.titleHighlight')}</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t('solution.description')}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-16 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-3 w-3 rounded-full bg-destructive/50" />
                <div className="h-3 w-3 rounded-full bg-warning/50" />
                <div className="h-3 w-3 rounded-full bg-primary/50" />
                <span className="text-sm text-muted-foreground ml-2">{t('solution.mockupTitle')}</span>
              </div>
              <div className="flex md:grid md:grid-cols-7 gap-2 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  t('solution.stages.prospecting'),
                  t('solution.stages.meeting'),
                  t('solution.stages.contracting'),
                  t('solution.stages.production'),
                  t('solution.stages.traffic'),
                  t('solution.stages.retention'),
                  t('solution.stages.loyalty')
                ].map((stage, i) => (
                  <div key={stage} className="text-center min-w-[70px] flex-shrink-0 md:min-w-0">
                    <div className="bg-muted rounded-lg p-2 md:p-3 mb-2 h-20 md:h-32 flex flex-col justify-between">
                      <div className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">{stage}</div>
                      <div className="space-y-1">
                        {[...Array(Math.max(1, 3 - i))].map((_, j) => (
                          <div key={j} className="h-2 md:h-4 bg-primary/20 rounded animate-pulse" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Tabela de Planos e Limitações
            </h2>
            <p className="text-xl text-muted-foreground">
              Escolha o plano ideal para a escala da sua operação. 14 dias grátis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {(Object.entries(planConfig) as [string, typeof planConfig.pro][]).map(([key, plan]) => {
              const planKey = key as 'starter' | 'pro' | 'agency';
              return (
              <Card 
                key={key}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  'popular' in plan && plan.popular ? 'ring-2' : ''
                }`}
                style={{
                  ...('popular' in plan && plan.popular ? { borderColor: plan.color } : {}),
                }}
              >
                <div className="relative h-48 overflow-hidden" style={{ backgroundColor: plan.bgColor }}>
                  <img src={plan.image} alt={plan.name} className="w-full h-full object-cover" />
                  {'popular' in plan && plan.popular && (
                    <Badge className="absolute top-3 right-3 shadow-lg text-white" style={{ backgroundColor: plan.color }}>
                      <Star className="h-3 w-3 mr-1" />
                      MAIS POPULAR
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <span style={{ color: plan.color }}>{plan.name}</span>
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">{plan.subtitle}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold" style={{ color: plan.color }}>${plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      Margem de Lucro
                    </div>
                    <div className="text-sm font-bold text-foreground">{plan.profitMargin}</div>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: plan.color }} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to="/auth" className="block">
                    <Button className="w-full gap-2 text-white shadow-lg" style={{ backgroundColor: plan.color }}>
                      <Zap className="h-4 w-4" />
                      Assinar Agora
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )})}
          </div>

          <div className="text-center mt-12">
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="gap-2">
                <Eye className="h-5 w-5" />
                Ver Comparação Completa
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 gap-2">
              <HelpCircle className="h-4 w-4" />
              Dúvidas Comuns
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('faq.title')}</h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">{t('faq.q1')}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{t('faq.a1')}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">{t('faq.q2')}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{t('faq.a2')}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-32 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            {t('cta.title')}<span className="block mt-2">{t('cta.titleSecond')}</span>
          </h2>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg sm:text-xl px-8 sm:px-12 py-6 sm:py-8 gap-2 sm:gap-3 shadow-2xl hover:scale-105 transition-all group">
              <Rocket className="h-5 w-5 sm:h-6 sm:w-6 group-hover:animate-bounce" />
              <span>{t('cta.button')}</span>
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">Q</span>
              </div>
              <span className="font-bold text-xl">Qualify</span>
            </div>
            <p className="text-sm text-muted-foreground">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}