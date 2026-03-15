import { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLinkPage } from '@/hooks/useLinkPage';
import { useOrganization } from '@/hooks/useOrganization';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Link2, Palette, BarChart3, Settings, Globe, ExternalLink, Loader2, Plus, Eye, EyeOff, Save, Undo2, Redo2, Check, GlobeLock, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { toast } from '@/hooks/use-toast';
import { LinksTab } from '@/components/linktree/LinksTab';
import { DesignTab } from '@/components/linktree/DesignTab';
import { InsightsTab } from '@/components/linktree/InsightsTab';
import { SettingsTab } from '@/components/linktree/SettingsTab';
import { LinkTreePreview } from '@/components/linktree/LinkTreePreview';
import { useHeader } from '@/contexts/HeaderContext';
import type { LinkPage } from '@/types/linktree';
import { cn } from '@/lib/utils';

// History state for undo/redo
interface HistoryState {
  linkPage: LinkPage | null;
  timestamp: number;
}

export default function LinkTreeEditor() {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { organizationId, loading: orgLoading } = useOrganization();
  const { setCustomTitle, setCustomIcon, setBackAction } = useHeader();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'links');
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState<'fit' | 'full'>('fit');
  
  // Local state for instant preview updates
  const [localLinkPage, setLocalLinkPage] = useState<LinkPage | null>(null);
  const deferredLinkPage = useDeferredValue(localLinkPage);
  
  // Undo/Redo state
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const lastSavedState = useRef<string | null>(null);

  // Fetch organization slug for public URL
  const { data: organization } = useQuery({
    queryKey: ['organization-slug', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch client data
  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['client-for-linktree', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, contact_name')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const {
    linkPage,
    isLoading,
    createLinkPage,
    updateLinkPage,
    addBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    reorderBlocks,
    togglePublish,
    isCreating,
    isUpdating,
  } = useLinkPage(clientId || null, organizationId);

  // Sync local state with remote state
  useEffect(() => {
    if (linkPage) {
      setLocalLinkPage(linkPage);
    }
  }, [linkPage]);

  // Initialize history when linkPage loads
  useEffect(() => {
    if (linkPage && history.length === 0) {
      const initialState = { linkPage: JSON.parse(JSON.stringify(linkPage)), timestamp: Date.now() };
      setHistory([initialState]);
      setHistoryIndex(0);
      lastSavedState.current = JSON.stringify(linkPage);
    }
  }, [linkPage, history.length]);

  // Track changes for unsaved state
  useEffect(() => {
    if (localLinkPage && lastSavedState.current) {
      const currentState = JSON.stringify(localLinkPage);
      setHasUnsavedChanges(currentState !== lastSavedState.current);
    }
  }, [localLinkPage]);

  // Update header title
  useEffect(() => {
    // Only set if we have the client name, otherwise it might flicker from 'Link23'
    if (client?.company_name) {
      setCustomTitle(client.company_name);
    } else {
      setCustomTitle('Link23');
    }
    
    setCustomIcon(Link2);
    setBackAction(() => () => navigate(-1));
    
    return () => {
      setCustomTitle(null);
      setCustomIcon(null);
      setBackAction(null);
    };
  }, [client?.company_name, setCustomTitle, setCustomIcon, setBackAction, navigate]);

  // Add to history on changes
  const addToHistory = useCallback((newState: LinkPage) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ linkPage: JSON.parse(JSON.stringify(newState)), timestamp: Date.now() });
      // Limit history to 50 items
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Create page if it doesn't exist
  const handleCreatePage = async () => {
    if (!client) return;
    await createLinkPage({
      name: client.company_name,
      clientName: client.company_name,
    });
  };

  // Handle local updates (instant preview)
  const handleLocalUpdate = useCallback((updates: Partial<LinkPage>) => {
    setLocalLinkPage(prev => {
      if (!prev) return prev;
      const newState = { ...prev, ...updates };
      addToHistory(newState);
      return newState;
    });
    setHasUnsavedChanges(true);
  }, [addToHistory]);

  // Handle save - persist to database
  const handleSave = useCallback(async () => {
    if (!localLinkPage) return;
    
    try {
      await updateLinkPage({
        name: localLinkPage.name,
        bio: localLinkPage.bio,
        logo_url: localLinkPage.logo_url,
        theme: localLinkPage.theme,
      });
      lastSavedState.current = JSON.stringify(localLinkPage);
      setHasUnsavedChanges(false);
      toast({ title: 'Salvo!', description: 'Alterações salvas com sucesso.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    }
  }, [localLinkPage, updateLinkPage]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      const prevState = history[historyIndex - 1];
      if (prevState?.linkPage) {
        setLocalLinkPage(prevState.linkPage);
      }
    }
  }, [historyIndex, history]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      const nextState = history[historyIndex + 1];
      if (nextState?.linkPage) {
        setLocalLinkPage(nextState.linkPage);
      }
    }
  }, [historyIndex, history]);

  // Handle publish
  const handlePublish = useCallback(async () => {
    // If there are unsaved changes, save first
    if (hasUnsavedChanges) {
      await handleSave();
    }
    await togglePublish();
  }, [togglePublish, hasUnsavedChanges, handleSave]);

  // Track changes
  const handleChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Smart publish button state
  const publishButtonState = useMemo(() => {
    if (!localLinkPage?.is_published) {
      return { text: 'Publicar', variant: 'default' as const, icon: GlobeLock };
    }
    if (hasUnsavedChanges) {
      return { text: 'Atualizar', variant: 'warning' as const, icon: RefreshCw };
    }
    return { text: 'Publicado', variant: 'success' as const, icon: Globe };
  }, [localLinkPage?.is_published, hasUnsavedChanges]);

  if (loadingClient || orgLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <p className="text-muted-foreground">Organização não encontrada</p>
        <Button onClick={() => navigate('/app/dashboard')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  // Show create page prompt if no page exists
  if (!linkPage || !localLinkPage) {
    return (
      <AnimatedContainer animation="fade-in" className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-6 p-4">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Link2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{client.company_name}</h2>
          <p className="text-muted-foreground max-w-md">
            Crie uma página de links personalizada para este cliente com o Link23.
          </p>
        </div>
        <Button onClick={handleCreatePage} disabled={isCreating} size="lg" className="gap-2">
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar Página de Links
        </Button>
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </AnimatedContainer>
    );
  }

  const publicUrl = `/${organization?.slug || 'agencia'}/@${localLinkPage.slug}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Editor Toolbar - Optimized for single line on mobile */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-background shrink-0 min-h-[52px]">
        {/* Undo/Redo - Left side */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={!canUndo}
            className="h-8 w-8"
            title="Desfazer"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={!canRedo}
            className="h-8 w-8"
            title="Refazer"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          
          <div className="w-[1px] h-4 bg-border mx-1 hidden sm:block" />
          
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-1">
            {isUpdating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : hasUnsavedChanges ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase font-bold text-amber-600 hidden sm:inline">Alterações</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 focus-visible:outline-none">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-[10px] uppercase font-bold text-green-600 hidden sm:inline">Salvo</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions - Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Preview Toggle for Mobile */}
          {isMobile && (
            <Button
              variant={showPreview ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {/* Save Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isUpdating || !hasUnsavedChanges}
            className="h-8 px-2 sm:px-3 text-xs sm:text-sm font-bold gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salvar</span>
          </Button>

          {/* Publish Button */}
          <Button
            variant={publishButtonState.variant === 'success' ? 'secondary' : publishButtonState.variant === 'warning' ? 'outline' : 'default'}
            size="sm"
            onClick={handlePublish}
            disabled={isUpdating}
            className={cn(
              'h-8 px-2 sm:px-3 text-xs sm:text-sm font-bold gap-1.5',
              publishButtonState.variant === 'success' && 'bg-green-600 hover:bg-green-700 text-white border-none',
              publishButtonState.variant === 'warning' && 'border-amber-500 text-amber-600 bg-amber-50/50'
            )}
          >
            <publishButtonState.icon className="h-3.5 w-3.5" />
            <span className="">{publishButtonState.text}</span>
          </Button>

          {/* Public Link */}
          {localLinkPage.slug && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open(publicUrl, '_blank')}
              title="Abrir página pública"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div
          className={`flex-1 overflow-hidden ${
            isMobile && showPreview ? 'hidden' : 'block'
          }`}
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col h-full"
          >
            <div className="border-b px-2 sm:px-4 shrink-0 bg-muted/30 overflow-x-auto scrollbar-none">
              <TabsList className="h-12 bg-transparent p-0 gap-2 sm:gap-4 flex-nowrap min-w-max">
                <TabsTrigger
                  value="links"
                  className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Links</span>
                </TabsTrigger>
                <TabsTrigger
                  value="design"
                  className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Design</span>
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Insights</span>
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Configurações</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="links" className="h-full m-0">
                <LinksTab
                  linkPage={localLinkPage}
                  addBlock={addBlock}
                  updateBlock={updateBlock}
                  deleteBlock={deleteBlock}
                  duplicateBlock={duplicateBlock}
                  reorderBlocks={reorderBlocks}
                  updateLinkPage={async (updates) => {
                    handleLocalUpdate(updates);
                  }}
                  onImageChange={handleChange}
                />
              </TabsContent>
              <TabsContent value="design" className="h-full m-0">
                <DesignTab 
                  linkPage={localLinkPage} 
                  updateLinkPage={async (updates) => {
                    handleLocalUpdate(updates);
                  }} 
                  onChange={handleChange} 
                />
              </TabsContent>
              <TabsContent value="insights" className="h-full m-0">
                <InsightsTab linkPage={localLinkPage} />
              </TabsContent>
              <TabsContent value="settings" className="h-full m-0">
                <SettingsTab 
                  linkPage={localLinkPage} 
                  updateLinkPage={async (updates) => {
                    handleLocalUpdate(updates);
                  }}
                  organizationId={organizationId}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Preview Panel - Only show on lg+ (desktop) or when toggled */}
        <div
          className={`${
            isMobile
              ? showPreview
                ? 'flex-1'
                : 'hidden'
              : 'w-[320px] lg:w-[380px] xl:w-[420px] border-l'
          } flex flex-col bg-muted/20 overflow-hidden min-w-0`}
        >
          {/* Toggle Fit/100% */}
          <div className="flex justify-center gap-1 p-2 border-b bg-muted/10 shrink-0">
            <Button
              variant={previewMode === 'fit' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('fit')}
              className="gap-1 h-7 text-xs"
            >
              <Minimize2 className="h-3 w-3" />
              Ajustar
            </Button>
            <Button
              variant={previewMode === 'full' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('full')}
              className="gap-1 h-7 text-xs"
            >
              <Maximize2 className="h-3 w-3" />
              100%
            </Button>
          </div>

          {/* Preview Container */}
          <div className={`flex-1 min-w-0 ${
            previewMode === 'fit' 
              ? 'flex items-center justify-center p-2 lg:p-4 overflow-hidden' 
              : 'overflow-auto p-4'
          }`}>
            <div className={`min-w-0 ${previewMode === 'fit' ? 'transform scale-[0.75] sm:scale-[0.8] lg:scale-[0.85] xl:scale-90 origin-center' : ''}`}>
              <LinkTreePreview linkPage={deferredLinkPage} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

