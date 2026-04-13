import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit2, 
  Trash2, 
  Sparkles, 
  Globe, 
  FileText,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { InsightEditor } from '@/components/admin/InsightEditor';

interface Insight {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  status: 'draft' | 'published';
  cover_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  published_at: string | null;
  created_at: string;
}

export default function AdminInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  
  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('insights')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInsights(data || []);
    } catch (error: any) {
      console.error('Error fetching insights:', error);
      toast.error('Erro ao carregar insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [statusFilter, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este insight?')) return;

    try {
      const { error } = await supabase.from('insights').delete().eq('id', id);
      if (error) throw error;
      toast.success('Insight excluído com sucesso');
      fetchInsights();
    } catch (error: any) {
      toast.error('Erro ao excluir insight');
    }
  };

  const handleToggleStatus = async (insight: Insight) => {
    const newStatus = insight.status === 'published' ? 'draft' : 'published';
    const published_at = newStatus === 'published' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('insights')
        .update({ status: newStatus, published_at })
        .eq('id', insight.id);

      if (error) throw error;
      toast.success(`Insight ${newStatus === 'published' ? 'publicado' : 'movido para rascunho'}`);
      fetchInsights();
    } catch (error: any) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciador de Insights</h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Crie e gerencie conteúdos estratégicos para SEO e aquisição de usuários.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5" onClick={() => { setEditingInsight(null); setIsEditorOpen(true); }}>
            <Sparkles className="h-4 w-4 text-primary" />
            Sugestões IA
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => { setEditingInsight(null); setIsEditorOpen(true); }}>
            <Plus className="h-4 w-4" />
            Novo Insight
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-border/50 shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30 pb-4 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Todos os Insights
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    placeholder="Pesquisar..." 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9 bg-background focus-visible:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 p-2">
                    <DropdownMenuItem onClick={() => setStatusFilter('all')} className={cn(statusFilter === 'all' && "bg-primary/10 text-primary")}>
                      Todos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('published')} className={cn(statusFilter === 'published' && "bg-green-500/10 text-green-600 font-medium")}>
                      Publicados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('draft')} className={cn(statusFilter === 'draft' && "bg-yellow-500/10 text-yellow-600 font-medium")}>
                      Rascunhos
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">Carregando seus insights...</p>
              </div>
            ) : insights.length > 0 ? (
              <div className="divide-y divide-border/40">
                {insights.map((insight) => (
                  <div key={insight.id} className="group p-5 hover:bg-accent/30 transition-all">
                    <div className="flex gap-5">
                      <div className="h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-muted border border-border shadow-sm cursor-pointer" onClick={() => { setEditingInsight(insight); setIsEditorOpen(true); }}>
                        {insight.cover_image ? (
                          <img src={insight.cover_image} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-500" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary/5">
                            <ImageIcon className="h-8 w-8 text-primary/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 
                              className="font-bold text-lg truncate group-hover:text-primary transition-colors cursor-pointer"
                              onClick={() => { setEditingInsight(insight); setIsEditorOpen(true); }}
                            >
                              {insight.title}
                            </h3>
                            <Badge 
                              variant={insight.status === 'published' ? 'default' : 'outline'}
                              className={cn(
                                "text-[10px] uppercase tracking-wider font-bold py-0.5 px-2",
                                insight.status === 'published' ? "bg-green-500/10 text-green-600 border-green-200/50 hover:bg-green-500/10" : "bg-yellow-500/10 text-yellow-600 border-yellow-200/50 hover:bg-yellow-500/10"
                              )}
                            >
                              {insight.status === 'published' ? 'Publicado' : 'Rascunho'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 max-w-2xl italic">
                            {insight.excerpt || 'Sem resumo definido...'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground/80 mt-2">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(insight.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            5 min de leitura
                          </span>
                          {insight.status === 'published' && (
                            <span className="flex items-center gap-1.5 text-primary">
                              <Globe className="h-3.5 w-3.5" />
                              Visível online
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 border border-border bg-background rounded-lg p-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            asChild
                          >
                            <a href={`/insights/${insight.slug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => { setEditingInsight(insight); setIsEditorOpen(true); }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2">
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleToggleStatus(insight)}>
                                {insight.status === 'published' ? (
                                  <><Clock className="h-4 w-4" /> Mover para rascunho</>
                                ) : (
                                  <><CheckCircle2 className="h-4 w-4" /> Publicar agora</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => handleDelete(insight.id)}>
                                <Trash2 className="h-4 w-4" /> Excluir permanentemente
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center space-y-4">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-background shadow-inner">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-bold">Início da sua jornada de conteúdo</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Você ainda não criou nenhum conteúdo. Use o botão acima para começar seu primeiro Insight com ajuda de IA.
                </p>
                <Button className="mt-4 gap-2 shadow-xl shadow-primary/20" onClick={() => { setEditingInsight(null); setIsEditorOpen(true); }}>
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Insight
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">Assistente de IA</CardTitle>
              <CardDescription className="text-base">
                Use IA para gerar conteúdo de alta qualidade em segundos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div 
                className="p-5 bg-background border border-border/50 rounded-xl space-y-4 shadow-sm group hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => { setEditingInsight(null); setIsEditorOpen(true); }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                      <Sparkles className="h-4 w-4 text-purple-600 group-hover:text-white" />
                    </div>
                    <span className="font-bold">Gerar do Zero</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Defina um tema e público-alvo, e nós criamos o rascunho completo.
                </p>
              </div>

              <div 
                className="p-5 bg-background border border-border/50 rounded-xl space-y-4 shadow-sm group hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => { setEditingInsight(null); setIsEditorOpen(true); }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                      <ExternalLink className="h-4 w-4 text-blue-600 group-hover:text-white" />
                    </div>
                    <span className="font-bold">Link de Inspiração</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cole uma URL e usaremos o contexto para criar algo original.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-lg font-bold">Estatísticas (24h)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">Leituras hoje</span>
                </div>
                <span className="text-2xl font-bold tracking-tighter">1,280</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-muted-foreground">Cliques CTA</span>
                </div>
                <span className="text-2xl font-bold tracking-tighter">42</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[65%] rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
              </div>
              <p className="text-[11px] text-muted-foreground text-center font-medium">
                Sua taxa de conversão aumentou <span className="text-green-600 font-bold">+12%</span> esta semana!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <InsightEditor 
        open={isEditorOpen} 
        onOpenChange={setIsEditorOpen} 
        insight={editingInsight}
        onSuccess={fetchInsights}
      />
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
