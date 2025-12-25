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
import { SERVICE_LABELS, ServiceType, DocumentType, DOCUMENT_TYPE_LABELS } from '@/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

interface DocumentTemplate {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  document_type: string;
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

interface GenerateDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData | null;
  documentType: DocumentType;
}

const DEFAULT_TEMPLATES: Record<DocumentType, string> = {
  contract: '',
  proforma_invoice: `FACTURA PROFORMA

Nº: FP-{{numero_documento}}
Data: {{data_emissao}}

DE:
{{nome_agencia}}
NUIT: {{nuit_agencia}}
{{sede_agencia}}

PARA:
{{empresa_cliente}}
Contacto: {{nome_contato}}
Email: {{email_cliente}}
Telefone: {{telefone_cliente}}
{{endereco_cliente}}

DESCRIÇÃO DOS SERVIÇOS:
{{servicos_contratados}}

VALOR MENSAL: {{valor_mensal}}
{{#if valor_trafego}}
INVESTIMENTO EM TRÁFEGO PAGO: {{valor_trafego}}
{{/if}}

TOTAL: {{valor_mensal}}

NOTA IMPORTANTE:
Este documento não tem valor fiscal e não gera IVA nem IRPC.
Serve apenas como proposta comercial.
Não é comunicado à Autoridade Tributária.
Válido por 30 dias a partir da data de emissão.

_________________________________
{{nome_agencia}}`,
  budget: `ORÇAMENTO

Data: {{data_emissao}}
Validade: 15 dias

CLIENTE:
{{empresa_cliente}}
Contacto: {{nome_contato}}
Email: {{email_cliente}}
Telefone: {{telefone_cliente}}

PRESTADOR:
{{nome_agencia}}
{{sede_agencia}}
NUIT: {{nuit_agencia}}

ESCOPO DE SERVIÇOS:
{{servicos_contratados}}

INVESTIMENTO:
• Valor Mensal: {{valor_mensal}}
{{#if valor_trafego}}
• Investimento em Tráfego Pago: {{valor_trafego}}
{{/if}}

CONDIÇÕES:
• Prazo de execução: A definir após aprovação
• Forma de pagamento: A combinar
• Este documento é meramente informativo e não representa compromisso contratual

_________________________________
{{nome_agencia}}
{{data_emissao}}`,
  commercial_proposal: `PROPOSTA COMERCIAL

Nº: PC-{{numero_documento}}
Data: {{data_emissao}}

CLIENTE:
{{empresa_cliente}}
Contacto: {{nome_contato}}
Email: {{email_cliente}}
Telefone: {{telefone_cliente}}
Endereço: {{endereco_cliente}}

APRESENTADA POR:
{{nome_agencia}}
{{sede_agencia}}
NUIT: {{nuit_agencia}}
Representante: {{representante_agencia}}
{{cargo_representante}}

1. INTRODUÇÃO
Temos o prazer de apresentar nossa proposta comercial para prestação de serviços de marketing digital.

2. ESCOPO DOS SERVIÇOS
{{servicos_contratados}}

3. INVESTIMENTO
• Valor Mensal dos Serviços: {{valor_mensal}}
{{#if valor_trafego}}
• Investimento em Tráfego Pago: {{valor_trafego}}
{{/if}}

4. PRAZO DE EXECUÇÃO
• Início: Imediato após aprovação
• Duração: 12 meses (renovável)

5. ENTREGÁVEIS
• Relatórios mensais de performance
• Calendário editorial semanal
• Criativos para campanhas
• Suporte via WhatsApp/Email

6. CONDIÇÕES DE PAGAMENTO
• Pagamento mensal até o dia 10 de cada mês
• Primeira parcela: Antecipada

7. VALIDADE DA PROPOSTA
Esta proposta é válida por 15 dias a partir da data de emissão.

NOTA: Este documento não tem validade fiscal e serve apenas para apresentação comercial.

Aguardamos seu retorno para dar início a esta parceria de sucesso!

_________________________________
{{nome_agencia}}
{{representante_agencia}}
{{cargo_representante}}`
};

export function GenerateDocumentModal({ open, onOpenChange, client, documentType }: GenerateDocumentModalProps) {
  const { organization } = useSubscription();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [agencySettings, setAgencySettings] = useState<any>(null);
  const [organizationCurrency, setOrganizationCurrency] = useState('MZN');
  const [copied, setCopied] = useState(false);

  const documentLabel = DOCUMENT_TYPE_LABELS[documentType];

  useEffect(() => {
    if (open && organization?.id) {
      fetchTemplates();
      fetchAgencySettings();
    }
  }, [open, organization?.id, documentType]);

  const fetchTemplates = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('document_type', documentType)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);

      const defaultTemplate = data?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      } else if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      } else {
        setSelectedTemplateId('default');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchAgencySettings = async () => {
    try {
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

  const generateDocument = async () => {
    if (!client) return;

    setLoading(true);

    try {
      let content: string;
      
      if (selectedTemplateId === 'default') {
        content = DEFAULT_TEMPLATES[documentType];
      } else {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) {
          content = DEFAULT_TEMPLATES[documentType];
        } else {
          content = template.content;
        }
      }

      // Generate document number
      const docNumber = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      content = content.replace(/\{\{numero_documento\}\}/g, docNumber);

      // Client variables
      content = content.replace(/\{\{empresa_cliente\}\}/g, client.company_name || '');
      content = content.replace(/\{\{nome_contato\}\}/g, client.contact_name || '');
      content = content.replace(/\{\{email_cliente\}\}/g, client.email || '');
      content = content.replace(/\{\{telefone_cliente\}\}/g, client.phone || '');
      content = content.replace(/\{\{endereco_cliente\}\}/g, client.address || '');

      // Services
      const servicesText = client.services?.map(s => SERVICE_LABELS[s as ServiceType] || s).join('\n• ') || '';
      content = content.replace(/\{\{servicos_contratados\}\}/g, servicesText ? `• ${servicesText}` : '');

      // Values
      const currencySymbol = getCurrencySymbol(organizationCurrency);
      const valorMensal = client.monthly_budget ? `${currencySymbol} ${client.monthly_budget.toLocaleString('pt-BR')}` : '';
      const valorTrafego = client.paid_traffic_budget ? `$ ${client.paid_traffic_budget.toLocaleString('pt-BR')}` : '';
      content = content.replace(/\{\{valor_mensal\}\}/g, valorMensal);
      content = content.replace(/\{\{valor_trafego\}\}/g, valorTrafego);

      // Agency variables
      content = content.replace(/\{\{nome_agencia\}\}/g, agencySettings?.name || organization?.name || '');
      content = content.replace(/\{\{sede_agencia\}\}/g, agencySettings?.headquarters || '');
      content = content.replace(/\{\{nuit_agencia\}\}/g, agencySettings?.nuit || '');
      content = content.replace(/\{\{representante_agencia\}\}/g, agencySettings?.representative_name || '');
      content = content.replace(/\{\{cargo_representante\}\}/g, agencySettings?.representative_position || '');

      // Date variables
      const today = new Date();
      const dataEmissao = format(today, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
      content = content.replace(/\{\{data_emissao\}\}/g, dataEmissao);
      content = content.replace(/\{\{data_assinatura\}\}/g, dataEmissao);

      // Remove conditional blocks for missing traffic budget
      if (!client.paid_traffic_budget) {
        content = content.replace(/\{\{#if valor_trafego\}\}[\s\S]*?\{\{\/if\}\}/g, '');
      } else {
        content = content.replace(/\{\{#if valor_trafego\}\}/g, '');
        content = content.replace(/\{\{\/if\}\}/g, '');
      }

      setGeneratedDocument(content);
    } catch (error) {
      console.error('Error generating document:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o documento', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedDocument);
      setCopied(true);
      toast({ title: 'Copiado!', description: `${documentLabel} copiado para a área de transferência` });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      const lines = generatedDocument.split('\n');
      const children: Paragraph[] = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          children.push(new Paragraph({ text: '' }));
        } else if (trimmedLine.match(/^(FACTURA|ORÇAMENTO|PROPOSTA|CONTRATO)/i) || trimmedLine.match(/^\d+\./)) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: trimmedLine, bold: true, size: 28 })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 400, after: 200 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: trimmedLine, size: 24 })],
              alignment: AlignmentType.LEFT,
              spacing: { before: 100, after: 100 },
            })
          );
        }
      });

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      const typePrefix = documentType === 'proforma_invoice' ? 'Proforma' : documentType === 'budget' ? 'Orcamento' : 'Proposta';
      saveAs(blob, `${typePrefix}_${client?.company_name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.docx`);
      toast({ title: 'Download iniciado', description: `${documentLabel} baixado em formato Word` });
    } catch (error) {
      console.error('Error generating DOCX:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o documento Word', variant: 'destructive' });
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let y = margin;
      const lineHeight = 6;

      const lines = generatedDocument.split('\n');

      lines.forEach((line) => {
        const trimmedLine = line.trim();

        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        if (!trimmedLine) {
          y += lineHeight / 2;
        } else if (trimmedLine.match(/^(FACTURA|ORÇAMENTO|PROPOSTA|CONTRATO)/i)) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          const textWidth = doc.getTextWidth(trimmedLine);
          const x = (pageWidth - textWidth) / 2;
          y += lineHeight;
          doc.text(trimmedLine, x, y);
          y += lineHeight * 1.5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          const splitLines = doc.splitTextToSize(trimmedLine, maxWidth);
          splitLines.forEach((splitLine: string) => {
            if (y > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
            doc.text(splitLine, margin, y);
            y += lineHeight;
          });
        }
      });

      const typePrefix = documentType === 'proforma_invoice' ? 'Proforma' : documentType === 'budget' ? 'Orcamento' : 'Proposta';
      doc.save(`${typePrefix}_${client?.company_name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'Download iniciado', description: `${documentLabel} baixado em formato PDF` });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF', variant: 'destructive' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleClose = () => {
    setGeneratedDocument('');
    setSelectedTemplateId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar {documentLabel}
          </DialogTitle>
          <DialogDescription>
            Gere {documentLabel.toLowerCase()} para {client?.company_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!generatedDocument ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Template Padrão</SelectItem>
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

              <Button onClick={generateDocument} disabled={loading} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Gerar {documentLabel}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{documentLabel} Gerado</Label>
                <Textarea
                  value={generatedDocument}
                  onChange={e => setGeneratedDocument(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
                <Button variant="outline" onClick={handleDownloadDocx} disabled={downloadingDocx} className="gap-2">
                  {downloadingDocx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Baixar Word
                </Button>
                <Button onClick={handleDownloadPdf} disabled={downloadingPdf} className="gap-2">
                  {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Baixar PDF
                </Button>
              </div>

              <Button variant="ghost" onClick={() => setGeneratedDocument('')} className="w-full">
                Voltar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}