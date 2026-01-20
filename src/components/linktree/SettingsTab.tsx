import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QrCode, Globe, Calendar, Link2, Copy, Download, Share2, ExternalLink, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { LinkPage } from '@/types/linktree';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SettingsTabProps {
  linkPage: LinkPage;
  updateLinkPage: (updates: Partial<LinkPage>) => Promise<unknown>;
}

export function SettingsTab({ linkPage, updateLinkPage }: SettingsTabProps) {
  const [customDomain, setCustomDomain] = useState(linkPage.custom_domain || '');
  const [copied, setCopied] = useState(false);
  
  const publicUrl = `${window.location.origin}/agencia/@${linkPage.slug}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}&color=8b5cf6`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({ title: 'Link copiado!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleSaveDomain = async () => {
    await updateLinkPage({ custom_domain: customDomain });
    toast({ title: 'Domínio salvo!' });
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${linkPage.slug}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: linkPage.name,
          url: publicUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* QR Code */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="h-5 w-5" />
            <h3 className="font-semibold">QR Code</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Compartilhe sua página com um QR Code personalizável
          </p>
          
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-xs text-muted-foreground mb-4 text-center break-all max-w-xs">
              {publicUrl}
            </p>
            <div className="flex gap-2 w-full max-w-xs">
              <Button variant="outline" className="flex-1 gap-2" onClick={handleDownloadQR}>
                <Download className="h-4 w-4" /> Baixar
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={handleCopyUrl}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copiar
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Custom Domain */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5" />
            <h3 className="font-semibold">Domínio Personalizado</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Conecte seu próprio domínio à sua página
          </p>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">URL Pública</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={publicUrl} readOnly className="bg-muted/50" />
                <Button variant="ghost" size="icon" onClick={() => window.open(publicUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Seu domínio</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="meusite.com.br"
                />
                <Button onClick={handleSaveDomain}>Salvar</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Em breve: Configure um CNAME apontando para qualify.lovable.app
              </p>
            </div>
          </div>
        </Card>

        {/* Page Info */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5" />
            <h3 className="font-semibold">Informações da Página</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Criado em</span>
              <span className="text-sm">
                {format(new Date(linkPage.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Última edição</span>
              <span className="text-sm">
                {format(new Date(linkPage.updated_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-sm ${linkPage.is_published ? 'text-green-500' : 'text-muted-foreground'}`}>
                {linkPage.is_published ? 'Publicado' : 'Rascunho'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Total de blocos</span>
              <span className="text-sm">{linkPage.blocks?.length || 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
