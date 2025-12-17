import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Sparkles, 
  Target,
  Rocket,
  Heart,
  ChevronRight,
  Play,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  MessageSquare,
  FileText,
  Star,
  ArrowUpRight,
  Check,
  X,
  Bot,
  Layers,
  PieChart
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

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

// Animated counter component
const AnimatedCounter = ({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useScrollReveal();

  useEffect(() => {
    if (!isVisible) return;
    
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// Floating particles background
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-primary/10 animate-pulse"
        style={{
          width: Math.random() * 100 + 20,
          height: Math.random() * 100 + 20,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 10 + 5}s`,
        }}
      />
    ))}
  </div>
);

const features = [
  {
    icon: Layers,
    title: 'Pipeline Kanban Visual',
    description: 'Visualize toda sua operação em um quadro intuitivo. Arraste e solte clientes entre os 7 estágios da jornada.',
    highlight: '7 estágios'
  },
  {
    icon: Target,
    title: 'Qualificação BANT Automática',
    description: 'Score inteligente de Budget, Authority, Need e Timeline. Saiba exatamente quais leads priorizar.',
    highlight: '4 métricas'
  },
  {
    icon: Bot,
    title: 'IA com 20+ Anos de Marketing',
    description: 'Assistente que conhece seu cliente, sua agência e sugere estratégias personalizadas em tempo real.',
    highlight: 'Contexto total'
  },
  {
    icon: FileText,
    title: 'Contratos & Checklists',
    description: 'Templates de contratos e checklists por fase. Nunca mais esqueça uma etapa do processo.',
    highlight: 'Templates prontos'
  },
  {
    icon: Users,
    title: 'Multi-Usuário com Funções',
    description: 'Convide sua equipe com papéis específicos: Vendas, Operações, Campanhas e Admin.',
    highlight: '4 perfis'
  },
  {
    icon: PieChart,
    title: 'Dashboard de Métricas',
    description: 'KPIs em tempo real: leads, conversões, receita recorrente e projeção de faturamento.',
    highlight: 'Tempo real'
  }
];

const journeySteps = [
  { name: 'Prospecção', icon: '🎯', description: 'Captura e qualificação inicial' },
  { name: 'Reunião', icon: '📅', description: 'Apresentação e diagnóstico' },
  { name: 'Contratação', icon: '📝', description: 'Proposta e fechamento' },
  { name: 'Produção', icon: '⚡', description: 'Setup e entregáveis' },
  { name: 'Tráfego', icon: '📈', description: 'Campanhas ativas' },
  { name: 'Retenção', icon: '🔄', description: 'Resultados e renovação' },
  { name: 'Fidelização', icon: '💎', description: 'Indicações e upsell' },
];

const painPoints = [
  { pain: 'Planilhas desorganizadas', solution: 'Pipeline visual intuitivo' },
  { pain: 'Leads perdidos no WhatsApp', solution: 'Histórico centralizado por cliente' },
  { pain: 'Equipe sem saber o que fazer', solution: 'Checklists automáticos por fase' },
  { pain: 'Sem visão do faturamento', solution: 'Dashboard com projeções em tempo real' },
  { pain: 'Processos na cabeça do dono', solution: 'Sistema replicável e escalável' },
];

const testimonials = [
  {
    name: 'Mariana Costa',
    role: 'CEO',
    company: 'Costa Digital Marketing',
    text: 'Em 3 meses, nossa taxa de conversão subiu 47%. O Qualify transformou nossa agência de 3 para 15 clientes ativos.',
    metric: '+47%',
    metricLabel: 'conversão',
    avatar: 'MC'
  },
  {
    name: 'Ricardo Fernandes',
    role: 'Diretor de Operações',
    company: 'RF Social Media',
    text: 'Antes, eu passava 4 horas por dia organizando processos. Agora, o Qualify faz isso em segundos. Meu foco voltou para estratégia.',
    metric: '-4h',
    metricLabel: 'por dia',
    avatar: 'RF'
  },
  {
    name: 'Ana Paula Santos',
    role: 'Fundadora',
    company: 'APS Marketing',
    text: 'A IA do sistema é absurda. É como ter um diretor de marketing sênior disponível 24/7 para cada cliente.',
    metric: '24/7',
    metricLabel: 'IA ativa',
    avatar: 'AS'
  }
];

const stats = [
  { value: 500, suffix: '+', label: 'Agências Ativas' },
  { value: 12000, suffix: '+', label: 'Clientes Gerenciados' },
  { value: 47, suffix: '%', label: 'Aumento Médio em Conversões' },
  { value: 4, suffix: 'h', label: 'Economizadas por Dia' },
];

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-lg' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-xl">Q</span>
            </div>
            <span className="font-bold text-2xl tracking-tight">Qualify</span>
          </div>
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#problema" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Problema</a>
            <a href="#funcionalidades" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#jornada" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Jornada</a>
            <a href="#depoimentos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-2 shadow-lg shadow-primary/25">
                Testar Grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <FloatingParticles />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-chart-5/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <Sparkles className="h-4 w-4" />
              <span>O Sistema #1 para Agências de Marketing</span>
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">NOVO</span>
            </div>
            
            {/* Main headline */}
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in"
              style={{ animationDelay: '0.4s' }}
            >
              Transforme o{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary via-chart-5 to-primary">
                  Caos
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-primary/20 -rotate-1" />
              </span>
              {' '}em{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-success to-chart-5">
                  Clareza
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-success/20 rotate-1" />
              </span>
            </h1>
            
            {/* Subheadline */}
            <p 
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in"
              style={{ animationDelay: '0.6s' }}
            >
              O <strong className="text-foreground">único sistema</strong> que guia sua agência pelos 
              <strong className="text-foreground"> 7 níveis da jornada do cliente</strong> — com pipeline visual, 
              qualificação BANT e uma IA que conhece <em>profundamente</em> cada cliente.
            </p>
            
            {/* CTA Buttons */}
            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in"
              style={{ animationDelay: '0.8s' }}
            >
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-6 gap-3 shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-105">
                  <Rocket className="h-5 w-5" />
                  Começar 14 Dias Grátis
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 gap-3 hover:scale-105 transition-all">
                <Play className="h-5 w-5" />
                Ver Demo de 2 min
              </Button>
            </div>
            
            {/* Trust badges */}
            <div 
              className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm text-muted-foreground animate-fade-in"
              style={{ animationDelay: '1s' }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Setup em 5 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Cancele quando quiser</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-success" />
                <span>Dados 100% seguros</span>
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

      {/* Stats Section */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-2">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-muted-foreground text-sm md:text-base">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problema" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">O Problema</span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Sua agência está presa no{' '}
                <span className="text-destructive">modo sobrevivência</span>?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Se você se identifica com algum destes problemas, o Qualify foi feito para você.
              </p>
            </div>
            
            <div className="space-y-4">
              {painPoints.map((item, i) => (
                <div 
                  key={i}
                  className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <X className="h-6 w-6 text-destructive" />
                      </div>
                      <span className="text-lg text-muted-foreground line-through decoration-destructive/50">{item.pain}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Check className="h-6 w-6 text-success" />
                      </div>
                      <span className="text-lg font-medium text-foreground">{item.solution}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">Funcionalidades</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Tudo que sua agência precisa{' '}
              <span className="text-primary">em um só lugar</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Desenvolvido por quem vive o dia a dia de agências de marketing digital.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div 
                key={feature.title}
                className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-chart-5/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {feature.highlight}
                  </span>
                </div>
                <h3 className="font-bold text-xl mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section id="jornada" className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">A Jornada</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Os <span className="text-primary">7 Estágios</span> que transformam leads em fãs
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Cada cliente passa por uma jornada. O Qualify garante que nenhum se perca no caminho.
            </p>
          </div>
          
          <div className="relative max-w-6xl mx-auto">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-chart-5 to-success -translate-y-1/2 rounded-full" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {journeySteps.map((step, i) => (
                <div 
                  key={step.name}
                  className="group relative"
                >
                  <div className="bg-card border border-border rounded-2xl p-4 text-center hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 relative z-10">
                    <div className="text-4xl mb-3 group-hover:scale-125 transition-transform">{step.icon}</div>
                    <div className="text-xs font-bold text-primary/60 mb-1">0{i + 1}</div>
                    <h3 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">{step.name}</h3>
                    <p className="text-xs text-muted-foreground leading-tight">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="depoimentos" className="py-20 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">Depoimentos</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Agências reais,{' '}
              <span className="text-primary">resultados reais</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <div 
                key={testimonial.name}
                className="bg-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-xl relative group"
              >
                {/* Metric badge */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-br from-primary to-chart-5 text-primary-foreground rounded-2xl px-4 py-2 shadow-lg">
                  <div className="text-2xl font-bold">{testimonial.metric}</div>
                  <div className="text-xs opacity-80">{testimonial.metricLabel}</div>
                </div>
                
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-warning text-warning" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed italic">"{testimonial.text}"</p>
                
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-primary/10 via-card to-chart-5/10 border border-primary/20 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-chart-5/10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <span className="inline-block bg-success/20 text-success text-sm font-semibold px-4 py-1 rounded-full mb-6">
                  🎉 Oferta de Lançamento
                </span>
                
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                  Apenas <span className="text-primary">$10/mês</span>
                </h2>
                
                <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
                  Acesso completo a todas as funcionalidades. Sem surpresas. Cancele quando quiser.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-5 w-5 text-success" />
                    <span>14 dias grátis</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-5 w-5 text-success" />
                    <span>Usuários ilimitados</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-5 w-5 text-success" />
                    <span>Suporte prioritário</span>
                  </div>
                </div>
                
                <Link to="/auth">
                  <Button size="lg" className="text-lg px-10 py-6 gap-3 shadow-xl shadow-primary/30">
                    Começar Agora
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary via-primary to-chart-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Pronto para escalar sua agência?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Junte-se a mais de 500 agências que já transformaram sua operação com o Qualify.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg px-10 py-6 gap-3 shadow-xl hover:scale-105 transition-all">
                <Rocket className="h-5 w-5" />
                Criar Conta Grátis
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          
          <p className="mt-8 text-primary-foreground/60 text-sm">
            Sem cartão de crédito • Setup em 5 minutos • Suporte em português
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">Q</span>
              </div>
              <span className="font-bold text-xl">Qualify</span>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#funcionalidades" className="hover:text-foreground transition-colors">Funcionalidades</a>
              <a href="#depoimentos" className="hover:text-foreground transition-colors">Depoimentos</a>
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