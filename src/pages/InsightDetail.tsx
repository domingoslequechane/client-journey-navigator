import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Share2, 
  Bookmark,
  ChevronRight,
  User,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

interface Insight {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  created_at: string;
  published_at: string | null;
}

export default function InsightDetail() {
  const { t } = useTranslation('landing');
  const { slug } = useParams();
  const [insight, setInsight] = useState<Insight | null>(null);
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
    const fetchInsight = async () => {
      const { data, error } = await (supabase as any)
        .from('insights')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) {
        console.error('Error fetching insight:', error);
      } else {
        setInsight(data as Insight);
      }
      setIsLoading(false);
    };

    fetchInsight();
  }, [slug]);

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copiado para a área de transferência!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground font-medium">Carregando insight...</p>
        </div>
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <LandingHeader t={t} isScrolled={isScrolled} />
        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="text-9xl font-black text-primary/10">404</div>
          <h1 className="text-3xl font-bold">Insight não encontrado</h1>
          <p className="text-muted-foreground">O conteúdo que você procura não existe ou foi removido.</p>
          <Button asChild rounded-full px-8>
            <Link to="/insights">Voltar para a listagem</Link>
          </Button>
        </div>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Helmet>
        <title>{insight.seo_title || `${insight.title} | Insights Qualify`}</title>
        <meta name="description" content={insight.seo_description || insight.excerpt || ''} />
        {insight.seo_keywords && (
          <meta name="keywords" content={insight.seo_keywords.join(', ')} />
        )}
        <meta property="og:title" content={insight.seo_title || insight.title} />
        <meta property="og:description" content={insight.seo_description || insight.excerpt || ''} />
        <meta property="og:image" content={insight.cover_image || ''} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <LandingHeader t={t} isScrolled={isScrolled} />

      <article className="pt-36 lg:pt-48 pb-20">
        {/* Header Section */}
        <header className="container px-4 mb-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <Link to="/insights" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Voltar para Insights
            </Link>
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-bold uppercase tracking-widest text-[10px]">
                  Estratégia
                </Badge>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                   <Clock className="h-3.5 w-3.5" />
                   5 min de leitura
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                {insight.title}
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed italic border-l-4 border-primary pl-6 py-2">
                {insight.excerpt}
              </p>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6 border-t border-border/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-inner">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold">Equipe Qualify</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Publicado em {format(new Date(insight.published_at || insight.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10" onClick={copyUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                    <Linkedin className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <div className="h-6 w-px bg-border mx-2" />
                  <Button variant="outline" className="rounded-full gap-2 border-primary/20 text-primary hover:bg-primary/5 font-bold">
                    <Bookmark className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <section className="container px-4 mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="aspect-[21/10] overflow-hidden rounded-3xl border border-border shadow-2xl relative">
              <img 
                src={insight.cover_image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80'} 
                alt={insight.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Content Body */}
        <section className="container px-4">
          <div className="max-w-3xl mx-auto mb-20">
            <div className="prose prose-lg dark:prose-invert prose-p:leading-relaxed prose-headings:font-black prose-headings:tracking-tight prose-a:text-primary prose-img:rounded-3xl prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-4 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic">
              <div dangerouslySetInnerHTML={{ __html: insight.content || '' }} />
            </div>

            {/* Tags Area */}
            {insight.seo_keywords && insight.seo_keywords.length > 0 && (
              <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-2">
                {insight.seo_keywords.map(tag => (
                  <Badge key={tag} variant="secondary" className="px-3 py-1 font-medium bg-muted/50 hover:bg-muted text-muted-foreground">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Floating Action CTA (Conversion Magnet) */}
        <section className="container px-4 mb-20">
           <div className="max-w-4xl mx-auto">
             <div className="p-8 md:p-12 bg-card border border-primary/30 rounded-3xl shadow-2xl relative overflow-hidden group">
               <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-primary/10 blur-[100px] group-hover:bg-primary/20 transition-all duration-700" />
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                 <div className="space-y-4 max-w-xl">
                   <h3 className="text-2xl md:text-3xl font-black">Este conteúdo ajudou seu negócio?</h3>
                   <p className="text-muted-foreground text-lg">
                     A Qualify é a ferramenta que transforma essas estratégias em realidade operacional. Gerencie sua agência com inteligência.
                   </p>
                 </div>
                 <Button asChild size="lg" className="rounded-full px-10 h-16 text-lg font-bold gap-2 shadow-xl shadow-primary/30 group/btn">
                    <Link to="/auth?mode=signup">
                      Testar Grátis <ArrowLeft className="h-5 w-5 rotate-180 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                 </Button>
               </div>
             </div>
           </div>
        </section>

        {/* Related / Next Article */}
        <section className="container px-4">
          <div className="max-w-6xl mx-auto pt-20 border-t border-border">
            <h4 className="text-2xl font-black mb-12">Continue evoluindo</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="group p-8 bg-muted/30 rounded-3xl border border-border/50 hover:border-primary/30 transition-all cursor-pointer">
                 <p className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                   <Plus className="h-4 w-4" /> Próxima leitura
                 </p>
                 <h5 className="text-xl font-bold group-hover:text-primary transition-colors">Como escalar seu faturamento sem aumentar o time técnico</h5>
                 <div className="mt-6 flex items-center text-sm font-bold gap-2">
                   Ler agora <ChevronRight className="h-4 w-4" />
                 </div>
               </div>
               <div className="group p-8 bg-muted/30 rounded-3xl border border-border/50 hover:border-primary/30 transition-all cursor-pointer">
                 <p className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                   <Plus className="h-4 w-4" /> Recomendado
                 </p>
                 <h5 className="text-xl font-bold group-hover:text-primary transition-colors">O guia definitivo do CRM para agências digitais em 2026</h5>
                 <div className="mt-6 flex items-center text-sm font-bold gap-2">
                   Ler agora <ChevronRight className="h-4 w-4" />
                 </div>
               </div>
            </div>
          </div>
        </section>
      </article>

      <LandingFooter />
    </div>
  );
}
