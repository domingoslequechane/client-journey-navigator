import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { FileText, Download, Loader2, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SERVICE_LABELS, ServiceType } from '@/types';
import { getCurrencySymbol } from '@/lib/currencies';

interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
}

interface ClientData {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  services: string[] | null;
  monthly_budget: number | null;
  paid_traffic_budget: number | null;
}

interface GenerateContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData | null;
}

export function GenerateContractModal({ open, onOpenChange, client }: GenerateContractModalProps) {
  const { organization } = useSubscription();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [agencySettings, setAgencySettings] = useState<any>(null);
  const [organizationCurrency, setOrganizationCurrency] = useState('MZN');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && organization?.id) {
      fetchTemplates();
      fetchAgencySettings();
    }
  }, [open, organization?.id]);

  const fetchTemplates = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);

      // Auto-select default template
      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      } else if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchAgencySettings = async () => {
    try {
      // Get organization settings including currency
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name, headquarters, nuit, representative_name, representative_position, currency')
        .eq('id', organization?.id)
        .single();

      if (orgData) {
        setAgencySettings(orgData);
        setOrganizationCurrency(orgData.currency || 'MZN');
      }
    } catch (error) {
      console.error('Error fetching agency settings:', error);
    }
  };

  const generateContract = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template || !client) return;

    setLoading(true);

    try {
      let content = template.content;

      // Client variables
      content = content.replace(/\{\{empresa_cliente\}\}/g, client.company_name || '');
      content = content.replace(/\{\{nome_contato\}\}/g, client.contact_name || '');
      content = content.replace(/\{\{email_cliente\}\}/g, client.email || '');
      content = content.replace(/\{\{telefone_cliente\}\}/g, client.phone || '');
      content = content.replace(/\{\{endereco_cliente\}\}/g, client.address || '');

      // Services
      const servicesText = client.services?.map(s => SERVICE_LABELS[s as ServiceType] || s).join(', ') || '';
      content = content.replace(/\{\{servicos_contratados\}\}/g, servicesText);

      // Values - use organization currency for monthly, USD for traffic
      const currencySymbol = getCurrencySymbol(organizationCurrency);
      const valorMensal = client.monthly_budget ? `${currencySymbol} ${client.monthly_budget.toLocaleString('pt-BR')}` : '';
      const valorTrafego = client.paid_traffic_budget ? `$ ${client.paid_traffic_budget.toLocaleString('pt-BR')}` : '';
      content = content.replace(/\{\{valor_mensal\}\}/g, valorMensal);
      content = content.replace(/\{\{valor_mensal_extenso\}\}/g, valorMensal);
      content = content.replace(/\{\{valor_trafego\}\}/g, valorTrafego);
      content = content.replace(/\{\{valor_trafego_extenso\}\}/g, valorTrafego);

      // Agency variables
      content = content.replace(/\{\{nome_agencia\}\}/g, agencySettings?.name || organization?.name || '');
      content = content.replace(/\{\{sede_agencia\}\}/g, agencySettings?.headquarters || '');
      content = content.replace(/\{\{nuit_agencia\}\}/g, agencySettings?.nuit || '');
      content = content.replace(/\{\{representante_agencia\}\}/g, agencySettings?.representative_name || '');
      content = content.replace(/\{\{cargo_representante\}\}/g, agencySettings?.representative_position || '');

      // Date variables
      const today = new Date();
      const dataAssinatura = format(today, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
      content = content.replace(/\{\{data_assinatura\}\}/g, dataAssinatura);
      content = content.replace(/\{\{data_inicio\}\}/g, dataAssinatura);
      
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      content = content.replace(/\{\{data_termino\}\}/g, format(nextYear, "d 'de' MMMM 'de' yyyy", { locale: ptBR }));

      content = content.replace(/\{\{dia_vencimento\}\}/g, '10');
      content = content.replace(/\{\{cidade_foro\}\}/g, agencySettings?.headquarters?.split(',')[0]?.trim() || 'Maputo');

      // Remove conditional blocks for missing traffic budget
      if (!client.paid_traffic_budget) {
        content = content.replace(/\{\{#if valor_trafego\}\}[\s\S]*?\{\{\/if\}\}/g, '');
      } else {
        content = content.replace(/\{\{#if valor_trafego\}\}/g, '');
        content = content.replace(/\{\{\/if\}\}/g, '');
      }

      setGeneratedContract(content);
    } catch (error) {
      console.error('Error generating contract:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o contrato', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContract);
      setCopied(true);
      toast({ title: 'Copiado!', description: 'Contrato copiado para a área de transferência' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContract], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contrato_${client?.company_name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Download iniciado', description: 'O contrato foi baixado com sucesso' });
  };

  const handleClose = () => {
    setGeneratedContract('');
    setSelectedTemplateId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Contrato Digital
          </DialogTitle>
          <DialogDescription>
            Gere um contrato personalizado para {client?.company_name} usando um dos seus templates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum template de contrato encontrado.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Crie templates em Configurações → Templates de Contrato.
              </p>
            </div>
          ) : (
            <>
              {!generatedContract ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Selecione o Template</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} {template.is_default && '(Padrão)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium">Dados do Cliente</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Empresa:</span> {client?.company_name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contato:</span> {client?.contact_name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span> {client?.email || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telefone:</span> {client?.phone || '-'}
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Serviços:</span>{' '}
                        {client?.services?.map(s => SERVICE_LABELS[s as ServiceType] || s).join(', ') || '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor Mensal:</span>{' '}
                        {client?.monthly_budget ? `${getCurrencySymbol(organizationCurrency)} ${client.monthly_budget.toLocaleString('pt-BR')}` : '-'}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tráfego Pago:</span>{' '}
                        {client?.paid_traffic_budget ? `$ ${client.paid_traffic_budget.toLocaleString('pt-BR')}` : '-'}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={generateContract}
                    disabled={!selectedTemplateId || loading}
                    className="w-full gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Gerar Contrato
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Contrato Gerado</Label>
                    <Textarea
                      value={generatedContract}
                      onChange={e => setGeneratedContract(e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCopy} variant="outline" className="gap-2 flex-1">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                    <Button onClick={handleDownload} className="gap-2 flex-1">
                      <Download className="h-4 w-4" />
                      Baixar TXT
                    </Button>
                  </div>

                  <Button variant="ghost" onClick={() => setGeneratedContract('')} className="w-full">
                    Gerar Novo Contrato
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
