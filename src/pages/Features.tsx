import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { BackToTop } from '@/components/BackToTop';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Shield, 
  Target, 
  Users, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  MessageSquare,
  FileText,
  CreditCard,
  Rocket,
  Layers,
  Search,
  CheckCircle2,
  LineChart,
  Clock
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function Features() {
  const { t } = useTranslation('landing');
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const featureCategories = [
    {
      title: "Gestão Operacional",
      description: "Organize sua agência com o máximo de eficiência e visibilidade total.",
      icon: <Layers className="h-6 w-6" />,
      features: [
        "Painel Centralizado de Clientes",
        "Gestão de Projetos e Tarefas",
        "Prazos e SLAs em Tempo Real",
        "Sistema de Aprovação Simplificado"
      ]
    },
    {
      title: "Inteligência Artificial",
      description: "Nossa IA exclusiva atua como um colaborador sênior da sua equipe.",
      icon: <Sparkles className="h-6 w-6" />,
      features: [
        "Escritor de Conteúdo Estratégico",
        "Geração de Carrosséis Prontos",
        "Análise de Dados e Insights",
        "Geração de Imagens Mágicas"
      ]
    },
    {
      title: "Financeiro e Legal",
      description: "Contratos e pagamentos sem fricção para escalar o faturamento.",
      icon: <CreditCard className="h-6 w-6" />,
      features: [
        "Gerador de Contratos Jurídicos",
        "Assinatura Digital Integrada",
        "Controle de Notas e Recebíveis",
        "Gestão de Comissões de Equipe"
      ]
    },
    {
      title: "Atração e Comercial",
      description: "Feche mais negócios com apresentações que encantam prospectos.",
      icon: <Target className="h-6 w-6" />,
      features: [
        "CRM de Pipeline (Kanban)",
        "Portais Link23 Personalizados",
        "Relatórios de Performance B2B",
        "Acompanhamento de Funil"
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Funcionalidades | Qualify - Sistema Completo para Agências</title>
        <meta name="description" content="Conheça todos os módulos da Qualify: CRM, Inteligência Artificial, Gestão de Tarefas, Faturamento e Portais Link23." />
      </Helmet>

      <LandingHeader t={t} isScrolled={isScrolled} />
      
      <main className="flex-1 w-full bg-background text-foreground font-sans relative overflow-x-hidden pt-36 lg:pt-48 pb-0">
        
        {/* Decorative Orbs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none -translate-x-1/2" />

        {/* HERO SECTION */}
        <section className="container mx-auto px-6 max-w-6xl relative z-10 mb-20 md:mb-32">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold animate-pulse border border-primary/20">
              <Zap className="w-4 h-4" />
              Potencialize sua Agência
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
              Tudo o que uma agência <br /> de elite precisa em <br /> <span className="text-primary italic underline decoration-primary/20 underline-offset-8">um só lugar.</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Esqueça a colcha de retalhos de ferramentas. A Qualify centraliza sua operação, desde o primeiro contato até a entrega final com IA.
            </p>
          </div>
        </section>

        {/* FEATURE CATEGORIES GRID */}
        <section className="container mx-auto px-6 max-w-6xl mb-32 relative z-10">
          <div className="grid md:grid-cols-2 gap-8">
            {featureCategories.map((cat, idx) => (
              <Card key={idx} className="bg-card border-border/40 shadow-2xl hover:border-primary/40 transition-all duration-500 group rounded-3xl overflow-hidden">
                <CardContent className="p-10 md:p-14 space-y-8">
                   <div className="h-16 w-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                      {cat.icon}
                   </div>
                   <div className="space-y-4">
                     <h2 className="text-3xl font-black">{cat.title}</h2>
                     <p className="text-lg text-muted-foreground leading-relaxed">
                       {cat.description}
                     </p>
                   </div>
                   <ul className="space-y-4 pt-4">
                     {cat.features.map((f, i) => (
                       <li key={i} className="flex items-center gap-3 font-semibold text-foreground/80">
                         <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                         {f}
                       </li>
                     ))}
                   </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* DETAILED FEATURES SECTIONS */}
        <section className="bg-muted/30 py-32 border-y border-border/50">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-10">
                <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-xl">
                  <LineChart className="h-6 w-6" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black leading-tight">Painéis Inteligentes de Faturamento.</h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Tenha controle total sobre seu fluxo de caixa. Visualize MRR, Churn e faturas pendentes em um dashboard desenhado para donos de agência.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                   <div className="px-5 py-3 bg-background rounded-2xl border border-border font-bold text-sm shadow-sm flex items-center gap-2">
                     <TrendingUp className="h-4 w-4 text-primary" /> Multi-Moedas
                   </div>
                   <div className="px-5 py-3 bg-background rounded-2xl border border-border font-bold text-sm shadow-sm flex items-center gap-2">
                     <Clock className="h-4 w-4 text-primary" /> Histórico Completo
                   </div>
                   <div className="px-5 py-3 bg-background rounded-2xl border border-border font-bold text-sm shadow-sm flex items-center gap-2">
                     <Shield className="h-4 w-4 text-primary" /> Auditoria Segura
                   </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/20 blur-[100px] rounded-full" />
                <div className="bg-gradient-to-br from-primary to-violet-600 rounded-[3rem] aspect-square shadow-2xl flex items-center justify-center p-8 group overflow-hidden">
                   <div className="bg-white/10 backdrop-blur-xl w-full h-full rounded-[2.2rem] border border-white/20 p-8 flex flex-col justify-between">
                      <div className="flex gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-400" />
                        <div className="h-3 w-3 rounded-full bg-amber-400" />
                        <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 flex-1 mt-10">
                        <div className="bg-white/20 rounded-xl h-24 animate-pulse" />
                        <div className="bg-white/10 rounded-xl h-24" />
                        <div className="bg-white/10 rounded-xl h-40 col-span-2 mt-4 flex items-end p-4">
                           <div className="flex gap-2 items-end w-full">
                             <div className="h-[40%] w-full bg-white/40 rounded-t-lg" />
                             <div className="h-[70%] w-full bg-white/60 rounded-t-lg" />
                             <div className="h-[90%] w-full bg-white rounded-t-lg" />
                             <div className="h-[50%] w-full bg-white/50 rounded-t-lg" />
                           </div>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="py-32 container mx-auto px-6 max-w-5xl text-center">
           <div className="p-12 md:p-24 bg-foreground text-background rounded-3xl relative overflow-hidden shadow-2xl group">
             <div className="absolute top-0 right-0 p-12 text-background/10 transform scale-150 rotate-12 transition-transform duration-700 group-hover:scale-110">
                <Rocket className="h-64 w-64" />
             </div>
             <div className="relative z-10 space-y-10">
               <h2 className="text-4xl md:text-6xl font-black">Pronto para elevar o seu padrão?</h2>
               <p className="text-xl text-background/70 max-w-2xl mx-auto leading-relaxed">
                 A Qualify é a peça que faltava no seu quebra-cabeça de gestão. Junte-se a centenas de agências e comece sua escala hoje.
               </p>
               <div className="flex flex-col sm:flex-row justify-center gap-6 pt-4">
                 <Button asChild size="lg" className="h-16 px-12 text-lg font-bold rounded-xl shadow-2xl hover:bg-primary transition-all">
                   <Link to="/auth?mode=signup">Começar Grátis Agora</Link>
                 </Button>
                 <Button asChild variant="outline" size="lg" className="h-16 px-12 text-lg font-bold rounded-xl bg-transparent border-white/20 hover:bg-white/10 text-white hover:text-white transition-all">
                   <Link to="/contact">Falar com Consultor</Link>
                 </Button>
               </div>
             </div>
           </div>
        </section>

      </main>

      <LandingFooter />
      <BackToTop />
    </div>
  );
}
