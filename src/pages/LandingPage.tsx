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
  Zap
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
    subtitle: 'Crescimento',
    price: 19,
    originalPrice: null,
    tagline: 'Lance sua marca no mundo digital!',
    image: planLanca,
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 60%, 0.1)',
    features: ['15 clientes ativos', 'Funil ilimitado', '500 msgs IA', '5 usuários'],
  },
  pro: {
    name: 'Arco',
    subtitle: 'Profissional',
    price: 39,
    originalPrice: null,
    tagline: 'Alcance resultados com precisão!',
    image: planArco,
    color: 'hsl(270, 91%, 65%)',
    bgColor: 'hsl(270, 91%, 65%, 0.1)',
    features: ['50 clientes ativos', 'Funil ilimitado', '1200 msgs IA', '10 usuários'],
    popular: true,
  },
  agency: {
    name: 'Catapulta',
    subtitle: 'Agência',
    price: 79,
    originalPrice: null,
    tagline: 'Imponha sua agência no mercado!',
    image: planCatapulta,
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'hsl(25, 95%, 53%, 0.1)',
    features: ['Clientes ilimitados', 'Funil ilimitado', 'IA ilimitada', '20 usuários'],
  },
};

// Animation hook for scroll reveal
const useScrollReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
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

      {/* HERO - Gancho Provocador */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main headline - Provocador */}
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
            
            {/* Subheadline - Alternativa */}
            <p 
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 animate-fade-in max-w-3xl mx-auto"
              style={{ animationDelay: '0.4s' }}
            >
              {t('hero.subtitle')}
            </p>
            
            {/* CTA único */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in"
              style={{ animationDelay: '0.6s' }}
            >
              <Link to="/auth">
                <Button size="lg" className="text-lg sm:text-xl px-8 sm:px-12 py-6 sm:py-8 gap-2 sm:gap-3 shadow-2xl shadow-primary/40 hover:shadow-primary/50 transition-all hover:scale-105 group">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                  <span className="hidden sm:inline">{t('hero.cta')}</span>
                  <span className="sm:hidden">{t('hero.ctaMobile')}</span>
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link to="/demo">
                <Button size="lg" variant="outline" className="text-lg sm:text-xl px-6 sm:px-10 py-6 sm:py-8 gap-2 sm:gap-3 hover:bg-primary/5 transition-all">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                  Testar Demo (Sem Cadastro)
                </Button>
              </Link>
            </div>
            
            {/* Trust badges simples */}
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
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 inset-x-0 flex justify-center animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* IDENTIFICAÇÃO - Abertura da Ferida (Condensado) */}
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
                  <p>
                    {t('problem.description1')}
                  </p>
                  
                  <p className="text-foreground font-medium">
                    {t('problem.description2')} <span className="text-destructive">{t('problem.description2Highlight')}</span>
                  </p>
                </div>
              </div>
              
              <AnimatedIllustration 
                section="problema" 
                animationDirection="right"
                className="h-64 md:h-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* AGITAÇÃO - O Custo de Continuar Assim */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <AnimatedIllustration 
                section="custo" 
                animationDirection="left"
                className="h-64 md:h-80 order-2 md:order-1"
              />
              
              <div className="order-1 md:order-2 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  {t('cost.title')}{' '}
                  <span className="text-destructive">{t('cost.titleHighlight')}</span>
                </h2>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Custo 1 */}
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-3xl font-bold text-destructive mb-2">{t('cost.revenueLoss')}</div>
                <div className="text-sm text-muted-foreground mb-4">{t('cost.revenueLossDesc')}</div>
                <p className="text-muted-foreground text-sm">
                  {t('cost.revenueLossText')}
                </p>
              </div>
              
              {/* Custo 2 */}
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Timer className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-4xl font-bold text-destructive mb-2">{t('cost.hoursWasted')}</div>
                <div className="text-sm text-muted-foreground mb-4">{t('cost.hoursWastedDesc')}</div>
                <p className="text-muted-foreground text-sm">
                  {t('cost.hoursWastedText')}
                </p>
              </div>
              
              {/* Custo 3 */}
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <UserX className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-4xl font-bold text-destructive mb-2">{t('cost.clientsLost')}</div>
                <div className="text-sm text-muted-foreground mb-4">{t('cost.clientsLostDesc')}</div>
                <p className="text-muted-foreground text-sm">
                  {t('cost.clientsLostText')}
                </p>
              </div>
            </div>
            
            <p className="text-center mt-12 text-lg text-foreground font-medium">
              {t('cost.conclusion')} <span className="text-primary">{t('cost.conclusionHighlight')}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ESPERANÇA - A Virada (Condensado) */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
                  {t('hope.title')}{' '}
                  <span className="text-primary">{t('hope.titleHighlight')}</span>
                </h2>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-6">
                  {t('hope.description')}
                </p>
                
                <p className="text-xl text-foreground font-medium">
                  {t('hope.tagline')}
                </p>
              </div>
              
              <AnimatedIllustration 
                section="esperanca" 
                animationDirection="right"
                className="h-64 md:h-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SOLUÇÃO - O Medicamento */}
      <section id="solucao" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                {t('solution.title')} <span className="text-primary">{t('solution.titleHighlight')}</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('solution.description')}
              </p>
            </div>
            
            {/* Mockup visual simples */}
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

      {/* RECURSOS - Grade de Recursos Expandida */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                {t('features.title')}
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('features.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Gestão de Clientes */}
              <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('features.clients.title')}</CardTitle>
                  <CardDescription>{t('features.clients.description')}</CardDescription>
                </CardHeader>
              </Card>

              {/* Finanças */}
              <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('features.finance.title')}</CardTitle>
                  <CardDescription>{t('features.finance.description')}</CardDescription>
                </CardHeader>
              </Card>

              {/* Link 23 */}
              <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Share2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('features.link23.title')}</CardTitle>
                  <CardDescription>{t('features.link23.description')}</CardDescription>
                </CardHeader>
              </Card>

              {/* Social Media */}
              <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('features.social.title')}</CardTitle>
                  <CardDescription>{t('features.social.description')}</CardDescription>
                </CardHeader>
              </Card>

              {/* QIA - Destaque */}
              <Card className="border-primary/30 bg-primary/5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group lg:col-span-2">
                <CardHeader className="flex-row gap-6 items-start">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{t('features.qia.title')}</CardTitle>
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-none">IA Estratégica</Badge>
                    </div>
                    <CardDescription className="text-base">{t('features.qia.description')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>

              {/* Studio AI - Destaque */}
              <Card className="border-primary/30 bg-primary/5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group lg:col-span-2">
                <CardHeader className="flex-row gap-6 items-start">
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{t('features.studio.title')}</CardTitle>
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-none">Design com IA</Badge>
                    </div>
                    <CardDescription className="text-base">{t('features.studio.description')}</CardDescription>
                  </div>
                </CardHeader>
              </Card>

              {/* Documentos */}
              <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileCheck className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('features.docs.title')}</CardTitle>
                  <CardDescription>{t('features.docs.description')}</CardDescription>
                </CardHeader>
              </Card>

              {/* Academia */}
              <Card className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('features.academy.title')}</CardTitle>
                  <CardDescription>{t('features.academy.description')}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL - Depoimento Único e Forte */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Stat gigante */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-4 bg-primary/10 border border-primary/20 rounded-2xl px-8 py-6">
                <TrendingUp className="h-12 w-12 text-primary" />
                <div className="text-left">
                  <div className="text-5xl md:text-6xl font-bold text-primary">{t('social.statValue')}</div>
                  <div className="text-muted-foreground">{t('social.statLabel')}</div>
                </div>
              </div>
            </div>
            
            {/* Depoimento principal */}
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12 relative">
              <div className="absolute -top-4 left-8 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-warning text-warning" />
                ))}
              </div>
              
              <blockquote className="text-xl md:text-2xl text-foreground mb-8 leading-relaxed">
                "{t('social.testimonial')}
                <strong className="text-primary">{t('social.testimonialHighlight')}</strong>
                {t('social.testimonialEnd')}"
              </blockquote>
              
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">MC</span>
                </div>
                <div>
                  <p className="font-semibold text-lg">{t('social.author')}</p>
                  <p className="text-muted-foreground">{t('social.authorRole')}</p>
                </div>
              </div>
            </div>
            
            {/* Stats secundários */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{t('social.stat1Value')}</div>
                <div className="text-sm text-muted-foreground">{t('social.stat1Label')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{t('social.stat2Value')}</div>
                <div className="text-sm text-muted-foreground">{t('social.stat2Label')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">{t('social.stat3Value')}</div>
                <div className="text-sm text-muted-foreground">{t('social.stat3Label')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OFERTA - Planos */}
      <section id="planos" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              {t('pricing.title')} <span className="text-primary">{t('pricing.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {(Object.entries(planConfig) as [string, typeof planConfig.pro][]).map(([key, plan]) => {
              const planKey = key as 'starter' | 'pro' | 'agency';
              return (
              <Card 
                key={key}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                  'popular' in plan && plan.popular ? 'ring-2' : ''
                }`}
                style={{
                  ...('popular' in plan && plan.popular ? { borderColor: plan.color } : {}),
                }}
              >
                {/* Plan Image */}
                <div 
                  className="relative h-48 overflow-hidden"
                  style={{ backgroundColor: plan.bgColor }}
                >
                  <img 
                    src={plan.image} 
                    alt={t(`plans.${planKey}.name`)}
                    className="w-full h-full object-cover"
                  />
                  {'popular' in plan && plan.popular && (
                    <Badge 
                      className="absolute top-3 right-3 shadow-lg text-white"
                      style={{ backgroundColor: plan.color }}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t('pricing.mostPopular')}
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <span style={{ color: plan.color }}>{t(`plans.${planKey}.name`)}</span>
                  </CardTitle>
                  <CardDescription>{t(`plans.${planKey}.subtitle`)}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold" style={{ color: plan.color }}>
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">{t('pricing.perMonth')}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] px-2 py-0">
                        14 DIAS GRÁTIS
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs italic text-muted-foreground mt-2">
                    {t(`plans.${planKey}.tagline`)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {(() => {
                      const features = t(`plans.${planKey}.features`, { returnObjects: true });
                      const featureList = Array.isArray(features) ? features : plan.features;
                      return featureList.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: plan.color }} />
                          <span>{feature}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                  
                  <Link to="/auth" className="block">
                    <Button 
                      className="w-full gap-2 text-white shadow-lg"
                      style={{ backgroundColor: plan.color }}
                    >
                      <Zap className="h-4 w-4" />
                      {t('pricing.startFree')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )})}
          </div>

          <div className="text-center mt-12 space-y-8">
            <p className="text-muted-foreground mb-6">
              {t('pricing.cancelAnytime')}
            </p>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="gap-2">
                <Eye className="h-5 w-5" />
                {t('pricing.comparePlans')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ - Reduzido */}
      <section id="faq" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 gap-2">
              <HelpCircle className="h-4 w-4" />
              {t('faq.badge')}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              {t('faq.title')}
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {t('faq.q1')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a1')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {t('faq.q2')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a2')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {t('faq.q3')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <span dangerouslySetInnerHTML={{ __html: t('faq.a3') }} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {t('faq.q4')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a4')}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA FINAL - Urgência Emocional */}
      <section className="py-20 md:py-32 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            {t('cta.title')}{' '}
            <span className="block mt-2">{t('cta.titleSecond')}</span>
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto">
            {t('cta.subtitle')}
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg sm:text-xl px-8 sm:px-12 py-6 sm:py-8 gap-2 sm:gap-3 shadow-2xl hover:scale-105 transition-all group">
              <Rocket className="h-5 w-5 sm:h-6 sm:w-6 group-hover:animate-bounce" />
              <span className="hidden sm:inline">{t('cta.button')}</span>
              <span className="sm:hidden">{t('cta.buttonMobile')}</span>
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </Link>
          
          <p className="mt-10 text-primary-foreground/60 text-sm">
            {t('cta.footer')}
          </p>
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
            
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
              <a href="#solucao" className="hover:text-foreground transition-colors">{t('footer.solution')}</a>
              <a href="#planos" className="hover:text-foreground transition-colors">{t('footer.plans')}</a>
              <a href="#faq" className="hover:text-foreground transition-colors">{t('footer.faq')}</a>
              <Link to="/auth" className="hover:text-foreground transition-colors">{t('footer.login')}</Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
