import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLinkPage } from '@/hooks/useLinkPage';
import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Link2, Palette, BarChart3, Settings, Globe, ExternalLink, Loader2, Plus, Eye, EyeOff } from 'lucide-react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { toast } from '@/hooks/use-toast';
import { LinksTab } from '@/components/linktree/LinksTab';
import { DesignTab } from '@/components/linktree/DesignTab';
import { InsightsTab } from '@/components/linktree/InsightsTab';
import { SettingsTab } from '@/components/linktree/SettingsTab';
import { LinkTreePreview } from '@/components/linktree/LinkTreePreview';
import { EditorToolbar } from '@/components/linktree/EditorToolbar';
import type { LinkPage } from '@/types/linktree';

export default function LinkTreeEditor() {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { organizationId } = useOrganizationCurrency();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'links');
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    reorderBlocks,
    togglePublish,
    isCreating,
    isUpdating,
  } = useLinkPage(clientId || null, organizationId);

  // Create page if it doesn't exist
  const handleCreatePage = async () => {
    if (!client) return;
    await createLinkPage({
      name: client.company_name,
      clientName: client.company_name,
    });
  };

  // Handle save
  const handleSave = useCallback(() => {
    toast({ title: 'Alterações salvas!', description: 'Suas mudanças foram sincronizadas.' });
    setHasUnsavedChanges(false);
  }, []);

  // Track changes
  const handleChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Undo/Redo (placeholder - can be enhanced)
  const handleUndo = useCallback(() => {
    toast({ title: 'Desfazer', description: 'Ação desfeita' });
  }, []);

  const handleRedo = useCallback(() => {
    toast({ title: 'Refazer', description: 'Ação refeita' });
  }, []);

  if (loadingClient || isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-4">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  // Show create page prompt if no page exists
  if (!linkPage) {
    return (
      <AnimatedContainer animation="fade-in" className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-6 p-4">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Link2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{client.company_name}</h2>
          <p className="text-muted-foreground max-w-md">
            Crie uma página de links personalizada para este cliente. Similar ao Linktree, mas integrado ao Qualify.
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

  const publicUrl = `${window.location.origin}/l/${linkPage.slug}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{linkPage.name}</h1>
            <p className="text-xs text-muted-foreground">@{linkPage.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Editor' : 'Preview'}
            </Button>
          )}
          <Button
            variant={linkPage.is_published ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={togglePublish}
          >
            <Globe className="h-4 w-4" />
            {linkPage.is_published ? 'Publicado ✓' : 'Publicar'}
          </Button>
          {linkPage.is_published && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(publicUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar
        isPublished={linkPage.is_published}
        isSaving={isUpdating}
        hasUnsavedChanges={hasUnsavedChanges}
        canUndo={false}
        canRedo={false}
        onSave={handleSave}
        onPublish={togglePublish}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

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
            <div className="border-b px-4 shrink-0 bg-muted/30">
              <TabsList className="h-12 bg-transparent p-0 gap-4">
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

            <div className="flex-1 overflow-auto">
              <TabsContent value="links" className="h-full m-0">
                <LinksTab
                  linkPage={linkPage}
                  addBlock={addBlock}
                  updateBlock={updateBlock}
                  deleteBlock={deleteBlock}
                  reorderBlocks={reorderBlocks}
                  updateLinkPage={updateLinkPage}
                  onImageChange={handleChange}
                />
              </TabsContent>
              <TabsContent value="design" className="h-full m-0">
                <DesignTab linkPage={linkPage} updateLinkPage={updateLinkPage} />
              </TabsContent>
              <TabsContent value="insights" className="h-full m-0">
                <InsightsTab linkPage={linkPage} />
              </TabsContent>
              <TabsContent value="settings" className="h-full m-0">
                <SettingsTab linkPage={linkPage} updateLinkPage={updateLinkPage} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Preview Panel - Full Height Centered */}
        <div
          className={`${
            isMobile
              ? showPreview
                ? 'flex-1'
                : 'hidden'
              : 'w-[450px] border-l'
          } flex items-center justify-center bg-muted/20 overflow-auto`}
        >
          <div className="flex items-center justify-center min-h-full py-8">
            <LinkTreePreview linkPage={linkPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
