import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Replace, Loader2, Trash2 } from 'lucide-react';

interface ContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contractUrl: string | null;
  contractName: string | null;
  onContractUpdated: () => void;
}

export function ContractModal({ 
  open, 
  onOpenChange, 
  clientId, 
  contractUrl, 
  contractName,
  onContractUpdated 
}: ContractModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O tamanho máximo é 20MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${clientId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('contracts')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year validity

      // Update client with contract info
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          contract_url: filePath,
          contract_name: file.name
        })
        .eq('id', clientId);

      if (updateError) throw updateError;

      toast({ title: 'Sucesso!', description: 'Contrato carregado com sucesso' });
      onContractUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar o contrato', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async () => {
    if (!contractUrl) return;

    try {
      const { data, error } = await supabase.storage
        .from('contracts')
        .download(contractUrl);

      if (error) throw error;

      // Create download link with original file name
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = contractName || 'contrato';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: 'Erro', description: 'Não foi possível baixar o contrato', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!contractUrl) return;

    setIsDeleting(true);
    try {
      // Delete from storage
      await supabase.storage
        .from('contracts')
        .remove([contractUrl]);

      // Update client
      const { error } = await supabase
        .from('clients')
        .update({
          contract_url: null,
          contract_name: null
        })
        .eq('id', clientId);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Contrato removido' });
      onContractUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover o contrato', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasContract = !!contractUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {hasContract ? 'Contrato do Cliente' : 'Adicionar Contrato'}
          </DialogTitle>
          <DialogDescription>
            {hasContract 
              ? 'Visualize, baixe ou altere o contrato deste cliente'
              : 'Faça upload do contrato assinado do cliente'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {hasContract ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{contractName}</p>
                  <p className="text-sm text-muted-foreground">Contrato atual</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-1 gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Replace className="h-4 w-4" />
                  )}
                  Alterar
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (máx 20MB)</p>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <DialogFooter>
          {hasContract && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remover
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
