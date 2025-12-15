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
  Play
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Qualificação BANT',
    description: 'Sistema completo de qualificação de leads com metodologia Budget, Authority, Need e Timeline.'
  },
  {
    icon: BarChart3,
    title: 'Pipeline Visual',
    description: 'Acompanhe cada cliente através dos 5 níveis da jornada com visualização Kanban intuitiva.'
  },
  {
    icon: CheckCircle2,
    title: 'Checklists por Fase',
    description: 'Nunca mais se perca. Tarefas claras e alcançáveis para cada etapa do processo.'
  },
  {
    icon: Sparkles,
    title: 'Assistente de IA',
    description: 'Um profissional de marketing com 20+ anos de experiência integrado ao seu fluxo de trabalho.'
  }
];

const journeySteps = [
  { name: 'Descoberta', description: 'Primeiro contato e consciência de marca', color: 'bg-info' },
  { name: 'Atração', description: 'Geração de leads e engajamento', color: 'bg-chart-5' },
  { name: 'Consideração', description: 'Qualificação e prova social', color: 'bg-warning' },
  { name: 'Ação', description: 'Conversão e entrega de valor', color: 'bg-primary' },
  { name: 'Apologia', description: 'Fidelização e indicação', color: 'bg-success' }
];

const testimonials = [
  {
    name: 'Ana Lopes',
    company: 'Hotel Praia Dourada',
    text: 'Com o Onix Flow, finalmente conseguimos acompanhar cada cliente de forma clara. Nosso faturamento cresceu 40% em 3 meses.',
    avatar: 'A'
  },
  {
    name: 'Roberto Machava',
    company: 'Farmácia Central',
    text: 'A IA do sistema é incrível! Sempre temos ideias frescas para cada fase do processo. Recomendo a todos.',
    avatar: 'R'
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">O</span>
            </div>
            <span className="font-bold text-xl">Onix Flow</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#journey" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Jornada</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Depoimentos</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/app">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link to="/app">
              <Button size="sm">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-chart-5/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Sistema SaaS para Agências de Marketing</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Transforme Leads em{' '}
              <span className="text-primary">Clientes Apaixonados</span>{' '}
              com a Jornada do Cliente
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              O único sistema que guia sua agência passo a passo pelos 5 níveis da jornada do cliente, 
              com checklists, qualificação BANT e um assistente de IA com 20+ anos de experiência em marketing.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/app">
                <Button size="lg" className="text-lg px-8 gap-2">
                  Acessar Sistema
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 gap-2">
                <Play className="h-5 w-5" />
                Ver Demonstração
              </Button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Setup em 5 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Dados 100% seguros</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span>Suporte dedicado</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Você está perdendo clientes por falta de <span className="text-primary">processo claro</span>?
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              {[
                'Não consegue acompanhar leads de forma organizada',
                'Novos colaboradores se perdem no processo',
                'Não sabe o que fazer em cada fase da jornada'
              ].map((problem, i) => (
                <div key={i} className="bg-card border border-border p-6 rounded-xl">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4 mx-auto">
                    <span className="text-destructive font-bold">✗</span>
                  </div>
                  <p className="text-muted-foreground">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo o que você precisa em um só lugar
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades pensadas para tornar seus processos claros e alcançáveis
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section id="journey" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Os 5 Níveis da Jornada do Cliente
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Da descoberta à apologia - guiamos cada cliente pelo caminho do sucesso
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch gap-4 max-w-5xl mx-auto">
            {journeySteps.map((step, i) => (
              <div key={step.name} className="flex-1 relative">
                <div className={`${step.color} rounded-xl p-6 h-full`}>
                  <div className="text-primary-foreground">
                    <span className="text-4xl font-bold opacity-50">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="font-bold text-lg mt-2">{step.name}</h3>
                    <p className="text-sm opacity-80 mt-1">{step.description}</p>
                  </div>
                </div>
                {i < journeySteps.length - 1 && (
                  <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Resultados Reais de Clientes Reais
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="bg-card border border-border rounded-xl p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
                <p className="text-muted-foreground italic">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Pronto para transformar sua agência?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Comece a usar o Onix Flow hoje e veja seus processos se tornarem claros e escaláveis.
          </p>
          <Link to="/app">
            <Button size="lg" variant="secondary" className="text-lg px-8 gap-2">
              Começar Agora Grátis
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">O</span>
              </div>
              <span className="font-bold text-xl">Onix Flow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Onix Agence. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
