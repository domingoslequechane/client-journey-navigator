import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SnowEffect } from '@/components/effects/SnowEffect';
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
  Download
} from 'lucide-react';
import { AnimatedIllustration } from '@/components/landing/AnimatedIllustration';
import { useEffect, useState, useRef } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { usePWAInstall } from '@/hooks/usePWAInstall';

// Plan images
import planBussola from '@/assets/plans/plan-bussola.png';
import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

// Plan colors and config
const planConfig = {
  free: {
    name: 'Bússola',
    subtitle: 'Essencial',
    price: 0,
    originalPrice: null,
    isFree: true,
    tagline: 'Encontre o caminho certo para começar!',
    image: planBussola,
    color: 'hsl(142, 71%, 45%)',
    bgColor: 'hsl(142, 71%, 45%, 0.1)',
    features: ['3 clientes ativos', 'Funil ilimitado', '90 msgs IA', '1 usuário'],
  },
  starter: {
    name: 'Lança',
    subtitle: 'Crescimento',
    price: 10,
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
    price: 24,
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
    price: 60,
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
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <SnowEffect />
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
            <a href="#problema" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Problema</a>
            <a href="#solucao" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Solução</a>
            <a href="#planos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Planos</a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {canInstall && !isInstalled && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={install}
                title="Instalar app"
                className="hidden sm:inline-flex"
              >
                <Download className="h-5 w-5" />
              </Button>
            )}
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-2 shadow-lg shadow-primary/25">
                <span className="hidden sm:inline">Quero crescer 47%</span>
                <span className="sm:hidden">Começar</span>
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
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6 animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              Cresça{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">+47%</span>
                <span className="absolute -bottom-2 left-0 right-0 h-4 bg-primary/20 -rotate-1" />
              </span>
              {' '}em conversões
            </h1>
            
            {/* Subheadline - Alternativa */}
            <p 
              className="text-xl sm:text-2xl md:text-3xl text-muted-foreground mb-10 animate-fade-in"
              style={{ animationDelay: '0.4s' }}
            >
              Ou continue perdendo clientes no WhatsApp...
            </p>
            
            {/* CTA único */}
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in"
              style={{ animationDelay: '0.6s' }}
            >
              <Link to="/auth">
                <Button size="lg" className="text-lg sm:text-xl px-6 sm:px-10 py-6 sm:py-7 gap-2 sm:gap-3 shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-105">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="hidden sm:inline">Quero crescer 47%</span>
                  <span className="sm:hidden">Começar agora</span>
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </Link>
              
              {canInstall && !isInstalled && (
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={install}
                  className="text-lg px-6 py-6 gap-2 hover:scale-105 transition-all"
                >
                  <Download className="h-5 w-5" />
                  Instalar App
                </Button>
              )}
            </div>
            
            {/* Trust badges simples */}
            <div 
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-10 text-xs sm:text-sm text-muted-foreground animate-fade-in"
              style={{ animationDelay: '0.8s' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Sem cartão</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>Setup em 2 min</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Cancele quando quiser</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
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
                  Você conhece bem{' '}
                  <span className="text-destructive">essa rotina</span>.
                </h2>
                
                <div className="space-y-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
                  <p>
                    Leads perdidos no WhatsApp. Planilhas que ninguém entende. 
                    Equipe sem saber o fazer.
                  </p>
                  
                  <p className="text-foreground font-medium">
                    E você, no meio do caos, <span className="text-destructive">perdendo vendas todos os dias</span>.
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
                  O preço de{' '}
                  <span className="text-destructive">continuar assim</span>.
                </h2>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Custo 1 */}
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-3xl font-bold text-destructive mb-2">Perda de Receita</div>
                <div className="text-sm text-muted-foreground mb-4">leads que nunca fecharam</div>
                <p className="text-muted-foreground text-sm">
                  Leads esquecidos = contratos perdidos.
                </p>
              </div>
              
              {/* Custo 2 */}
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Timer className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-4xl font-bold text-destructive mb-2">120h</div>
                <div className="text-sm text-muted-foreground mb-4">desperdiçadas por mês</div>
                <p className="text-muted-foreground text-sm">
                  Tempo em planilhas, não em vendas.
                </p>
              </div>
              
              {/* Custo 3 */}
              <div className="bg-card border border-border rounded-2xl p-8 text-center hover:border-destructive/50 transition-all duration-300 hover:shadow-lg group">
                <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <UserX className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-4xl font-bold text-destructive mb-2">40%</div>
                <div className="text-sm text-muted-foreground mb-4">dos leads vão para concorrente</div>
                <p className="text-muted-foreground text-sm">
                  Quem responde primeiro, ganha.
                </p>
              </div>
            </div>
            
            <p className="text-center mt-12 text-lg text-foreground font-medium">
              Não é falta de esforço. <span className="text-primary">É falta de sistema.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ESPERANÇA - A Virada (Condensado) */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8">
                  Imagine abrir o computador e{' '}
                  <span className="text-primary">ver tudo no lugar</span>.
                </h2>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-6">
                  Ver cada cliente. Saber o próximo passo. Prever quanto vai faturar.
                </p>
                
                <p className="text-xl text-foreground font-medium">
                  Sem planilhas. Sem WhatsApp. Sem caos.
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
                Isso é o <span className="text-primary">Qualify</span>.
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                O CRM com IA que organiza seus clientes, qualifica leads automaticamente, 
                sugere estratégias e prevê seu faturamento — tudo num só lugar.
              </p>
            </div>
            
            {/* Mockup visual simples */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-16 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-3 w-3 rounded-full bg-destructive/50" />
                <div className="h-3 w-3 rounded-full bg-warning/50" />
                <div className="h-3 w-3 rounded-full bg-primary/50" />
                <span className="text-sm text-muted-foreground ml-2">Qualify — Pipeline</span>
              </div>
              
              <div className="flex md:grid md:grid-cols-7 gap-2 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {['Prospecção', 'Reunião', 'Contratação', 'Produção', 'Tráfego', 'Retenção', 'Fidelização'].map((stage, i) => (
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
            
            {/* 4 benefícios em linha */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <LayoutGrid className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Organiza automaticamente</h3>
                <p className="text-sm text-muted-foreground">Cada cliente no lugar certo</p>
              </div>
              
              <div className="text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Star className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Mostra os melhores leads</h3>
                <p className="text-sm text-muted-foreground">Priorize quem vale a pena</p>
              </div>
              
              <div className="text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">IA que sugere estratégias</h3>
                <p className="text-sm text-muted-foreground">Contexto total do cliente</p>
              </div>
              
              <div className="text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Prevê seu faturamento</h3>
                <p className="text-sm text-muted-foreground">Dashboard em tempo real</p>
              </div>
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
                  <div className="text-5xl md:text-6xl font-bold text-primary">+47%</div>
                  <div className="text-muted-foreground">de conversões em 3 meses</div>
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
                "Em 3 meses, nossa taxa de conversão subiu 47%. O Qualify transformou nossa agência de 
                <strong className="text-primary"> 3 para 15 clientes ativos</strong>. 
                Finalmente consigo ver tudo num só lugar."
              </blockquote>
              
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">MC</span>
                </div>
                <div>
                  <p className="font-semibold text-lg">Mariana Costa</p>
                  <p className="text-muted-foreground">CEO, Costa Digital Marketing</p>
                </div>
              </div>
            </div>
            
            {/* Stats secundários */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">100+</div>
                <div className="text-sm text-muted-foreground">Agências usando</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">-4h</div>
                <div className="text-sm text-muted-foreground">Por dia economizadas</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">1k+</div>
                <div className="text-sm text-muted-foreground">Clientes gerenciados</div>
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
              Comece grátis. <span className="text-primary">Cresça no seu ritmo.</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Sem cartão para começar. Sem compromisso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {(Object.entries(planConfig) as [string, typeof planConfig.pro][]).map(([key, plan]) => (
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
                    alt={`Plano ${plan.name}`}
                    className="w-full h-full object-cover"
                  />
                  {'popular' in plan && plan.popular && (
                    <Badge 
                      className="absolute top-3 right-3 shadow-lg text-white"
                      style={{ backgroundColor: plan.color }}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  )}
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <span style={{ color: plan.color }}>{plan.name}</span>
                  </CardTitle>
                  <CardDescription>{plan.subtitle}</CardDescription>
                  <div className="pt-2">
                    {'isFree' in plan && plan.isFree ? (
                      <>
                        <span className="text-3xl font-bold" style={{ color: plan.color }}>
                          Grátis
                        </span>
                        <p className="text-xs text-muted-foreground">para sempre</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold" style={{ color: plan.color }}>
                          ${plan.price}
                        </span>
                        <span className="text-muted-foreground">/mês</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs italic text-muted-foreground mt-1">
                    {plan.tagline}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: plan.color }} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link to="/auth" className="block">
                    <Button 
                      className="w-full gap-2 text-white"
                      style={{ backgroundColor: plan.color }}
                    >
                      <CreditCard className="h-4 w-4" />
                      {'isFree' in plan && plan.isFree ? 'Começar Grátis' : 'Assinar Agora'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12 space-y-8">
            <p className="text-muted-foreground">
              Cancele a qualquer momento. Sem taxas de cancelamento.
            </p>
            <Link to="/pricing">
              <Button variant="outline" size="lg" className="gap-2">
                <Eye className="h-5 w-5" />
                Comparar Planos em Detalhe
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
              Perguntas Frequentes
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Dúvidas?
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Preciso de cartão de crédito para começar?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Não! O plano Bússola é 100% gratuito para sempre, sem necessidade de cartão.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Posso cancelar minha assinatura a qualquer momento?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sim! Cancele quando quiser nas configurações. Você mantém acesso até o fim do período pago.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  O que são clientes ativos?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Clientes nos estágios operacionais (Produção, Tráfego, Retenção, Fidelização). 
                  Prospectos no funil de vendas são <strong>ilimitados</strong> em todos os planos!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-card border rounded-lg px-6">
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  Meus dados estão seguros?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sim! Criptografia de ponta a ponta, servidores seguros, nunca compartilhamos dados com terceiros.
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
            Quantos clientes você vai perder{' '}
            <span className="block mt-2">enquanto decide?</span>
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto">
            Configure em 2 minutos. Comece grátis. Sem cartão.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="text-lg sm:text-xl px-8 sm:px-12 py-6 sm:py-7 gap-2 sm:gap-3 shadow-xl hover:scale-105 transition-all">
              <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="hidden sm:inline">Começar agora — é grátis</span>
              <span className="sm:hidden">Começar grátis</span>
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </Link>
          
          <p className="mt-10 text-primary-foreground/60 text-sm">
            Junte-se a 100+ agências que pararam de perder vendas.
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
              <a href="#solucao" className="hover:text-foreground transition-colors">Solução</a>
              <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
              <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
              <Link to="/auth" className="hover:text-foreground transition-colors">Login</Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Qualify. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
