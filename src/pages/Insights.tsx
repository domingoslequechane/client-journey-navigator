import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Search,
  Sparkles,
  Zap,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

interface Insight {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  created_at: string;
}

export default function Insights() {
  const { t } = useTranslation('landing');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const fetchInsights = async () => {
      const { data, error } = await supabase
        .from('insights')
        .select('id, title, slug, excerpt, cover_image, created_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching insights:', error);
      } else {
        setInsights(data || []);
      }
      setIsLoading(false);
    };

    fetchInsights();
  }, []);

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Helmet>
        <title>Insights & Estratégias | Qualify - O Futuro do CRM para Agências</title>
        <meta name="description" content="Explore as últimas tendências em marketing, gestão de agências e inteligência artificial. Conteúdo exclusivo para escalar seu negócio." />
        <meta name="keywords" content="blog, marketing, insights, agências, crm, inteligência artificial, b2b" />
      </Helmet>

      <LandingHeader t={t} isScrolled={isScrolled} />

      <main className="pt-36 lg:pt-48 pb-20">
        {/* Hero Section */}
        <section className="container px-4 mb-16">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="outline" className="py-1 px-4 border-primary/20 bg-primary/5 text-primary rounded-full animate-bounce">
              <Sparkles className="h-3 w-3 mr-2" />
              Conteúdo Exclusivo
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
              Insights que <span className="text-primary italic">Transformam</span> <br className="hidden md:block" /> o seu Negócio
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Descubra estratégias validadas, estudos de caso e o futuro do marketing impulsionado por IA. Tudo o que você precisa para dominar o mercado.
            </p>
          </div>
        </section>

        {/* Featured Card (Optional first item) */}
        {insights.length > 0 && !isLoading && (
           <section className="container px-4 mb-20">
             <div className="max-w-6xl mx-auto">
               <div className="relative group cursor-pointer overflow-hidden rounded-[2.5rem] border border-border/50 bg-card shadow-2xl hover:shadow-primary/5 transition-all duration-700">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="aspect-[16/10] lg:aspect-auto overflow-hidden">
                      <img 
                        src={insights[0].cover_image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80'} 
                        alt={insights[0].title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-8 md:p-12 flex flex-col justify-center space-y-6">
                      <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-primary">
                        <span className="flex items-center gap-1.5"><Zap className="h-4 w-4" /> Destaque</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 8 min de leitura</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-extrabold leading-tight group-hover:text-primary transition-colors">
                        {insights[0].title}
                      </h2>
                      <p className="text-lg text-muted-foreground leading-relaxed line-clamp-3">
                        {insights[0].excerpt}
                      </p>
                      <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            QA
                          </div>
                          <div>
                            <p className="text-sm font-bold">Equipe Qualify</p>
                            <p className="text-xs text-muted-foreground">Estrategistas de Crescimento</p>
                          </div>
                        </div>
                        <Button asChild className="rounded-full px-8 py-6 text-base font-bold gap-2 group/btn shadow-xl shadow-primary/20">
                          <Link to={`/insights/${insights[0].slug}`}>
                            Ler agora <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
               </div>
             </div>
           </section>
        )}

        {/* Insights Grid */}
        <section className="container px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12 border-b border-border/50 pb-6">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-primary" />
                Explorar Feed
              </h3>
              <div className="relative hidden md:block w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="O que você quer aprender?" 
                  className="w-full bg-card border border-border/50 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="aspect-[4/3] bg-muted rounded-3xl" />
                    <div className="h-6 bg-muted rounded-full w-3/4" />
                    <div className="h-4 bg-muted rounded-full w-1/2" />
                  </div>
                ))}
              </div>
            ) : insights.length > 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {insights.slice(1).map((insight) => (
                  <article key={insight.id} className="group relative flex flex-col bg-card rounded-3xl border border-border/40 overflow-hidden hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
                    <Link to={`/insights/${insight.slug}`} className="absolute inset-0 z-10" />
                    <div className="aspect-[4/3] overflow-hidden">
                      <img 
                        src={insight.cover_image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80'} 
                        alt={insight.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                    <div className="p-8 space-y-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(insight.created_at), 'dd MMM, yyyy', { locale: ptBR })}</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>5 min read</span>
                      </div>
                      <h4 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {insight.excerpt}
                      </p>
                      <div className="pt-4 mt-auto flex items-center text-sm font-bold text-primary gap-1 group-hover:gap-2 transition-all">
                        Continuar lendo <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : insights.length === 0 && !isLoading ? (
              <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
                <p className="text-muted-foreground font-medium">Nenhum insight publicado ainda. Volte em breve!</p>
              </div>
            ) : null}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container px-4 mt-32">
          <div className="max-w-6xl mx-auto bg-primary rounded-3xl p-8 md:p-16 relative overflow-hidden text-primary-foreground text-center shadow-[0_20px_50px_rgba(var(--primary),0.3)]">
            <div className="absolute top-0 right-0 p-8 text-white/10">
              <Sparkles className="h-32 w-32" />
            </div>
            <div className="relative z-10 space-y-8 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black">Pronto para colocar <br /> esses insights em prática?</h2>
              <p className="text-primary-foreground/80 text-lg md:text-xl">
                Junte-se a mais de 500 agências que já estão escalando suas operações com a Qualify. Comece seu teste grátis de 7 dias hoje mesmo.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full px-10 py-7 text-lg font-bold shadow-2xl">
                  <Link to="/auth?mode=signup">Começar Agora</Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="border-2 border-white/40 hover:bg-white/10 text-white hover:text-white rounded-full px-10 py-7 text-lg font-bold backdrop-blur-sm">
                  <Link to="/contact">Falar com Consultor</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
