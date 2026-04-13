import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { BackToTop } from '@/components/BackToTop';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Rocket, 
  Target, 
  Users, 
  ShieldCheck, 
  Zap, 
  Heart,
  TrendingUp,
  Award,
  ArrowRight,
  Code2,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';

export default function About() {
  const { t } = useTranslation('landing');
  const [isScrolled, setIsScrolled] = useState(false);
  
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <LandingHeader t={t} isScrolled={isScrolled} />
      
      <div className="flex-1 w-full bg-background text-foreground font-sans relative overflow-x-hidden pt-36 lg:pt-48 pb-0">
        
        {/* Decorative Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />

        {/* HERO SECTION */}
        <section className="container mx-auto px-6 max-w-6xl relative z-10 mb-20 md:mb-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6 border border-primary/20">
              <Sparkles className="w-4 h-4" />
              Manifesto Qualify
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-8 tracking-tight leading-[1.1]">
              Redefinindo o futuro das <span className="text-primary">Agências</span> Digitais.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10">
              Nós não somos apenas mais uma empresa de software tentando entender o mercado de marketing. 
              Nós somos uma agência em nossa essência, construindo a tecnologia definitiva para escalar as nossas—e agora, as suas—operações.
            </p>
          </div>
        </section>

        {/* TWO COLLUMNS - THE ORIGIN */}
        <section className="container mx-auto px-6 max-w-6xl mb-24 md:mb-40">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-violet-500/20 rounded-3xl blur-2xl" />
              <Card className="relative border-border shadow-2xl rounded-3xl overflow-hidden bg-background">
                <div className="h-2 bg-gradient-to-r from-primary to-violet-500" />
                <CardContent className="p-8 md:p-12">
                  <div className="h-16 w-16 bg-muted border border-border rounded-2xl flex items-center justify-center mb-8 shadow-inner">
                     <Layers className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">A Ruptura do Caos</h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Muitas agências patinam não por falta de leads, mas por vazamentos na operação e gestão caótica. Plataformas complexas, planilhas perdidas, aprovações demoradas e o desgaste criativo do dia a dia impedem o verdadeiro crescimento.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Nossa plataforma nasceu da necessidade de ter um sistema unificado. Uma "Única Fonte da Verdade" desde a atração do prospect, até a gestão de equipe, criação de contratos, faturamento e publicação nas redes sociais com a ajuda implacável da Inteligência Artificial.
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-8 lg:pl-10">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">Por que construímos a Qualify?</h2>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="mt-1 h-10 w-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">01</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Automatização Real</h4>
                    <p className="text-muted-foreground">Queríamos que a IA não fosse apenas um "gerador de texto mágico", mas sim robôs que operassem fluxos processuais diários sem intervenção humana.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 h-10 w-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">02</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Experiência B2B Premium</h4>
                    <p className="text-muted-foreground">Queríamos transmitir profissionalismo instantâneo. Desde portais Link23 maravilhosos até aprovações de contratos com design de alto nível.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 h-10 w-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">03</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Previsibilidade de Caixa</h4>
                    <p className="text-muted-foreground">Substituímos o "achismo" por painéis visuais que indicam a saúde exata da agência, garantindo que o faturamento esteja sempre em controle.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ONIX AGENCE: THE LABORATORY - HIGHLIGHT BANNER */}
        <section className="relative py-32 overflow-hidden bg-primary text-primary-foreground">
           {/* Decoratives */}
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
           <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-150 -translate-y-1/4 translate-x-1/4">
              <Heart className="w-64 h-64 text-primary-foreground" />
           </div>
           
           <div className="container mx-auto px-6 max-w-6xl relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-16">
                 <div className="flex-1 space-y-8">
                    <BadgeVariant>O Nosso Sangue</BadgeVariant>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                      Orgulhosamente o motor tecnológico da <br className="hidden md:block"/>
                      <span className="text-background underline decoration-background/30 underline-offset-8">Onix Agence</span>
                    </h2>
                    <p className="text-xl text-primary-foreground/90 leading-relaxed font-medium">
                      A Qualify é um produto exclusivo e o ecossistema matriz da Onix Agence. Nós enfrentamos o campo de batalha antes de você.
                    </p>
                    <p className="text-lg text-primary-foreground/80 leading-relaxed">
                      Nós dividimos os mesmos problemas que você. Qual a maior vantagem para os assinantes da Qualify? É saber que <strong>nenhuma feature foi criada por achismo</strong>. Se lançamos um módulo de aprovação criativa, é porque nossa equipe de Direção de Arte atestou. Se lançamos um CRM prospectivo, é porque os closers da Onix Agence precisavam faturar mais.
                    </p>
                 </div>
                 <div className="w-full md:w-[400px] bg-background text-foreground rounded-3xl p-8 shadow-2xl relative">
                    <div className="absolute -top-6 -right-6 h-16 w-16 bg-success rounded-full flex items-center justify-center shadow-lg border-4 border-background animate-bounce">
                      <ShieldCheck className="w-8 h-8 text-success-foreground" />
                    </div>
                    <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-8 border-b border-border pb-4">A Garantia do Laboratório</div>
                    <ul className="space-y-6">
                      <li className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"><Briefcase className="w-5 h-5"/></div>
                        <span className="font-semibold">Testado com Clientes Reais</span>
                      </li>
                      <li className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"><Code2 className="w-5 h-5"/></div>
                        <span className="font-semibold">Desenvolvido "In-House"</span>
                      </li>
                      <li className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"><TrendingUp className="w-5 h-5"/></div>
                        <span className="font-semibold">Escalado até o Perfeccionismo</span>
                      </li>
                    </ul>
                 </div>
              </div>
           </div>
        </section>

        {/* VALORES E CULTURA (GRID) */}
        <section className="py-32 container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Nossos Pilares</h2>
            <p className="text-lg text-muted-foreground">
              Os valores que norteiam cada linha de código escrita em nossa plataforma e cada interação com nossos clientes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-card border-border/50 shadow-sm hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-14 w-14 bg-muted border border-border rounded-xl flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-foreground" />
                </div>
                <h4 className="font-bold text-lg">Ação e Velocidade</h4>
                <p className="text-sm text-muted-foreground">Construímos ferramentas ágeis que respondem na velocidade do pensamento humano.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border/50 shadow-sm hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-14 w-14 bg-muted border border-border rounded-xl flex items-center justify-center mx-auto">
                  <Target className="w-6 h-6 text-foreground" />
                </div>
                <h4 className="font-bold text-lg">Foco Excepcional</h4>
                <p className="text-sm text-muted-foreground">Remover distrações é essencial. Nossas interfaces focam puramente em conversão e gestão pragmática.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50 shadow-sm hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-14 w-14 bg-muted border border-border rounded-xl flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6 text-foreground" />
                </div>
                <h4 className="font-bold text-lg">Comunidade Global</h4>
                <p className="text-sm text-muted-foreground">Evoluímos constantemente junto com o feedback de agências de diferentes nichos pelo país todo.</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card border-border/50 shadow-sm hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-14 w-14 bg-muted border border-border rounded-xl flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6 text-foreground" />
                </div>
                <h4 className="font-bold text-lg">Padrão Elite</h4>
                <p className="text-sm text-muted-foreground">Não aceitamos a mediocridade em código ou design. Nosso software deve parecer uma extensão da marca do cliente.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="py-24 border-t border-border/50 bg-muted/20">
          <div className="container mx-auto px-6 max-w-4xl text-center">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Pronto para transformar sua agência?</h2>
            <p className="text-xl text-muted-foreground mb-10">
              Pare de gerenciar ferramentas e comece a escalar negócios. Junte-se a nós nesta jornada tecnológica e acesse a qualify hoje mesmo.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="h-14 px-8 text-base font-bold rounded-xl shadow-xl hover:-translate-y-1 transition-all">
                  Testar Gratuitamente Hoje
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold rounded-xl bg-background hover:bg-muted transition-all">
                  Falar com Consultor
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </div>

      <LandingFooter />
      <BackToTop />
    </div>
  );
}

// Pequeno componente local para manter o codigo limpo
function BadgeVariant({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/20 text-background text-sm font-bold border border-background/20 backdrop-blur-md">
      <Sparkles className="w-4 h-4" />
      {children}
    </div>
  );
}
