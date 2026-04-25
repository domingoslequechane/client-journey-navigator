import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Download, 
  Loader2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Receipt,
  FileText,
  Eye,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PrintableInvoice } from '../invoice-editor/PrintableInvoice';
import { DEFAULT_SECTIONS, LayoutModel } from '../invoice-editor/section-types';
import { generateInvoicePDF as generateHtmlPDF } from '@/lib/invoice-pdf-service';
import { SERVICE_LABELS, ServiceType } from '@/types';

interface ServiceInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    companyName: string;
    contactName: string;
    email?: string;
    phone?: string;
    address?: string;
    services?: ServiceType[];
    monthlyBudget?: number;
  };
}

interface InvoiceService {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  services: InvoiceService[];
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  status: string;
  created_at: string;
}

interface AgencyInfo {
  name: string;
  nuit?: string;
  headquarters?: string;
  phone?: string;
  currency: string;
  paymentProviderName?: string;
  paymentAccountNumber?: string;
  paymentRecipientName?: string;
}

interface TemplateSettings {
  template_style: 'modern' | 'classic' | 'minimal' | 'onix';
  primary_color: string;
  show_watermark: boolean;
  custom_layout?: any[];
  paper_size?: string;
  footer_text?: string;
}

export function ServiceInvoiceModal({ open, onOpenChange, client }: ServiceInvoiceModalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo | null>(null);
  const [templateSettings, setTemplateSettings] = useState<TemplateSettings | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(null);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  
  // Form state
  const [formServices, setFormServices] = useState<InvoiceService[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);
  const [taxPercentage, setTaxPercentage] = useState(16);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, client.id, currentPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('current_organization_id, organization_id')
        .eq('id', user.id)
        .single();

      const orgId = profile?.current_organization_id || profile?.organization_id;
      if (!orgId) return;

      setOrganizationId(orgId);

      // Fetch agency info
      const { data: org } = await supabase
        .from('organizations')
        .select('name, nuit, headquarters, phone, currency, payment_provider_name, payment_account_number, payment_recipient_name')
        .eq('id', orgId)
        .single();

      if (org) {
        setAgencyInfo({
          name: org.name,
          nuit: org.nuit || undefined,
          headquarters: org.headquarters || undefined,
          phone: org.phone || undefined,
          currency: org.currency || 'MZN',
          paymentProviderName: org.payment_provider_name || undefined,
          paymentAccountNumber: org.payment_account_number || undefined,
          paymentRecipientName: org.payment_recipient_name || undefined,
        });
      }

      // Fetch template settings
      const { data: templateData } = await supabase
        .from('invoice_template_settings')
        .select('template_style, primary_color, show_watermark, custom_layout, paper_size, footer_text, layout_model, font_family')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (templateData) {
        // Parse custom_layout if it's a string
        let parsedLayout = templateData.custom_layout;
        if (typeof parsedLayout === 'string') {
          try {
            parsedLayout = JSON.parse(parsedLayout);
          } catch {
            parsedLayout = undefined;
          }
        }
        
        setTemplateSettings({
          template_style: (templateData.template_style as 'modern' | 'classic' | 'minimal' | 'onix') || 'onix',
          primary_color: templateData.primary_color || '#C5E86C',
          show_watermark: templateData.show_watermark ?? false,
          custom_layout: Array.isArray(parsedLayout) ? parsedLayout : undefined,
          paper_size: templateData.paper_size || undefined,
          footer_text: templateData.footer_text || undefined,
        });
      } else {
        // Default to onix style if no settings exist
        setTemplateSettings({
          template_style: 'onix',
          primary_color: '#C5E86C',
          show_watermark: false,
        });
      }

      // Fetch invoices count
      const { count } = await supabase
        .from('service_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .eq('organization_id', orgId);

      setTotalCount(count || 0);

      // Fetch invoices with pagination
      const { data: invoicesData, error } = await supabase
        .from('service_invoices')
        .select('*')
        .eq('client_id', client.id)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .range(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      
      // Parse services JSON safely
      const parsedInvoices = (invoicesData || []).map(inv => ({
        ...inv,
        services: typeof inv.services === 'string' ? JSON.parse(inv.services) : inv.services
      }));
      
      setInvoices(parsedInvoices as Invoice[]);

      // Pre-fill services from client if available
      if (client.services && client.services.length > 0 && formServices.length === 1 && !formServices[0].description) {
        const prefilledServices = client.services.map(s => ({
          description: SERVICE_LABELS[s] || s,
          quantity: 1,
          unit_price: client.monthlyBudget ? Math.round(client.monthlyBudget / client.services!.length) : 0,
          total: client.monthlyBudget ? Math.round(client.monthlyBudget / client.services!.length) : 0,
        }));
        setFormServices(prefilledServices);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as facturas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    if (!downloadingInvoice || !agencyInfo) return;
    const inv = downloadingInvoice;
    const run = async () => {
      toast({ title: 'A gerar PDF...', description: 'Por favor aguarde.' });
      await new Promise(r => setTimeout(r, 600));
      try {
        await generateHtmlPDF('hidden-history-invoice', `Factura-${inv.invoice_number}.pdf`, (templateSettings?.paper_size || 'A4') as any);
      } catch (err) {
        console.error('PDF History error:', err);
      }
      setDownloadingInvoice(null);
    };
    run();
  }, [downloadingInvoice, agencyInfo, templateSettings]);

  const handleServiceChange = (index: number, field: keyof InvoiceService, value: string | number) => {
    setFormServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalculate total
      if (field === 'quantity' || field === 'unit_price') {
        updated[index].total = updated[index].quantity * updated[index].unit_price;
      }
      
      return updated;
    });
  };

  const addServiceRow = () => {
    setFormServices(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeServiceRow = (index: number) => {
    if (formServices.length > 1) {
      setFormServices(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = formServices.reduce((acc, s) => acc + s.total, 0);
    const taxAmount = subtotal * (taxPercentage / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

    const handleGeneratePreview = async () => {
    if (!agencyInfo) {
      toast({ title: 'Erro', description: 'Informações da organização não encontradas', variant: 'destructive' });
      return;
    }

    const validServices = formServices.filter(s => s.description && s.total > 0);
    if (validServices.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um serviço válido', variant: 'destructive' });
      return;
    }

    setGeneratingPreview(true);
    try {
      // Simular um pequeno delay para feedback visual
      await new Promise(r => setTimeout(r, 400));
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar a pré-visualização', variant: 'destructive' });
    } finally {
      setGeneratingPreview(false);
    }
  };

  const generateInvoiceNumber = async () => {
    if (!organizationId) return 'FAC-001';
    
    const { count } = await supabase
      .from('service_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const nextNum = (count || 0) + 1;
    return `FAC-${String(nextNum).padStart(3, '0')}`;
  };

  const handleGenerateInvoice = async () => {
    if (!organizationId || !agencyInfo) {
      toast({ title: 'Erro', description: 'Informações da organização não encontradas', variant: 'destructive' });
      return;
    }

    const validServices = formServices.filter(s => s.description && s.total > 0);
    if (validServices.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um serviço válido', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const invoiceNumber = await generateInvoiceNumber();
      const { subtotal, taxAmount, total } = calculateTotals();
      const issueDate = new Date().toISOString().split('T')[0];

      // Save to database
      const { error } = await supabase
        .from('service_invoices')
        .insert([{
          organization_id: organizationId,
          client_id: client.id,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate || null,
          services: JSON.parse(JSON.stringify(validServices)),
          subtotal,
          tax_percentage: taxPercentage,
          tax_amount: taxAmount,
          total,
          notes: notes || null,
          status: 'pending',
          created_by: user.id,
        }]);

      if (error) throw error;

      // Generate and download PDF using the new engine
      toast({ title: 'A gerar PDF...', description: 'Por favor aguarde.' });
      // Pequeno delay para garantir que o DOM oculto está pronto
      await new Promise(r => setTimeout(r, 600));
      await generateHtmlPDF('hidden-new-invoice', `Factura-${invoiceNumber}.pdf`, (templateSettings?.paper_size || 'A4') as any);

      toast({ title: 'Sucesso!', description: 'Factura gerada e guardada com sucesso' });
      
      // Reset form and reload
      setShowForm(false);
      setFormServices([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
      setNotes('');
      setDueDate('');
      setCurrentPage(0);
      loadData();
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({ title: 'Erro', description: 'Não foi possível gerar a factura', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    setDownloadingInvoice(invoice);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const { subtotal, taxAmount, total } = calculateTotals();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Pago</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) {
        setShowPreview(false);
        setPreviewUrl(null);
      }
      onOpenChange(value);
    }}>
      <DialogContent className={`h-[85vh] flex flex-col overflow-hidden ${showPreview ? 'max-w-6xl' : 'max-w-2xl'}`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Facturas de Prestação de Serviços
          </DialogTitle>
          <DialogDescription>
            Gere e visualize facturas para {client.companyName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : showForm ? (
          <div className={`flex-1 min-h-0 ${showPreview ? 'flex flex-col md:grid md:grid-cols-2 md:gap-6' : ''}`}>
            {/* Form Column */}
            <div className={`flex flex-col h-full min-h-0 ${showPreview ? 'hidden md:flex' : ''}`}>
              <div className="flex items-center justify-between shrink-0 pb-4">
                <h3 className="font-medium">Nova Factura</h3>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowForm(false);
                  setShowPreview(false);
                  setPreviewUrl(null);
                }}>
                  Cancelar
                </Button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-2">
                {/* Services */}
                <div className="space-y-3">
                  <Label>Serviços</Label>
              {formServices.map((service, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Input
                      placeholder="Descrição do serviço"
                      value={service.description}
                      onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qtd"
                      min="1"
                      value={service.quantity}
                      onChange={(e) => handleServiceChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Preço"
                      min="0"
                      value={service.unit_price}
                      onChange={(e) => handleServiceChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2 text-sm font-medium text-right">
                    {agencyInfo?.currency} {service.total.toLocaleString()}
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeServiceRow(index)}
                      disabled={formServices.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addServiceRow} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Serviço
              </Button>
            </div>

            {/* Tax and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IVA (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento (opcional)</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Notas adicionais para a factura..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            </div>

            {/* Fixed Footer: Totals and Action Buttons */}
            <div className="shrink-0 pt-4 mt-2 border-t bg-background space-y-4">
            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{agencyInfo?.currency} {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA ({taxPercentage}%):</span>
                <span>{agencyInfo?.currency} {taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span className="text-primary">{agencyInfo?.currency} {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!showPreview ? (
                <Button 
                  variant="outline" 
                  onClick={handleGeneratePreview} 
                  disabled={generatingPreview} 
                  className="flex-1 gap-2"
                >
                  {generatingPreview ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Pré-visualizar
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleGeneratePreview} 
                  disabled={generatingPreview} 
                  className="flex-1 gap-2"
                >
                  {generatingPreview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Actualizar
                </Button>
              )}
              <Button onClick={handleGenerateInvoice} disabled={generating} className="flex-1 gap-2">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Gerar Factura
                  </>
                )}
              </Button>
            </div>
            </div>
            </div>

            {/* Preview Column */}
            {showPreview && (
              <div className="flex flex-col h-full min-h-0 space-y-3">
                <div className="flex items-center justify-between shrink-0">
                  <h3 className="font-medium">Pré-Visualização</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewUrl(null);
                    }}
                  >
                    Fechar Preview
                  </Button>
                </div>
                <div className="border rounded-lg overflow-auto bg-gray-100 flex-1 p-2">
                  <PrintableInvoice
                    invoiceData={{
                      invoiceNumber: 'PRV-000',
                      issueDate: new Date().toISOString().split('T')[0],
                      dueDate: dueDate || undefined,
                      client: { companyName: client.companyName, contactName: client.contactName, email: client.email, phone: client.phone, address: client.address },
                      agency: agencyInfo as any,
                      services: formServices.filter(s => s.description && s.total > 0).length > 0
                        ? formServices.filter(s => s.description && s.total > 0)
                        : [{ description: 'Serviço de exemplo', quantity: 1, unit_price: 100, total: 100 }],
                      subtotal, taxPercentage, taxAmount, total,
                      currency: agencyInfo?.currency || 'MZN',
                      notes: notes || undefined,
                      invoiceType: 'factura' as any,
                    }}
                    sections={templateSettings?.custom_layout || DEFAULT_SECTIONS}
                    paperSize={(templateSettings?.paper_size as any) || 'A4'}
                    primaryColor={templateSettings?.primary_color || '#C5E86C'}
                    templateStyle={templateSettings?.template_style || 'onix'}
                    layoutModel={(templateSettings?.layout_model as LayoutModel) || 'letterhead'}
                    fontFamily={templateSettings?.font_family || 'Inter'}
                    agency={agencyInfo as any}
                    showWatermark={templateSettings?.show_watermark}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full min-h-0 space-y-4 pt-2">
            {/* Generate Button */}
            <Button onClick={() => setShowForm(true)} className="w-full gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Gerar Nova Factura
            </Button>

            {/* Invoice History */}
            {invoices.length > 0 ? (
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground sticky top-0 bg-background py-1">Histórico de Facturas</h3>
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.issue_date).toLocaleDateString('pt-MZ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {agencyInfo?.currency} {Number(invoice.total).toLocaleString()}
                        </p>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage + 1} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma factura gerada ainda</p>
                <p className="text-sm">Clique no botão acima para gerar a primeira factura</p>
              </div>
            )}
          </div>
        )}
      {/* Hidden invoice for PDF generation - new */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none" style={{width:'794px',zIndex:-1,background:'white'}}>
        <div id="hidden-new-invoice">
          <PrintableInvoice
            invoiceData={{ invoiceNumber:'FAC-GEN', issueDate:new Date().toISOString().split('T')[0], dueDate:dueDate||undefined,
              client:{companyName:client.companyName,contactName:client.contactName,email:client.email,phone:client.phone,address:client.address},
              agency:agencyInfo as any, services:formServices.filter(s=>s.description&&s.total>0),
              subtotal,taxPercentage,taxAmount,total, currency:agencyInfo?.currency||'MZN', notes:notes||undefined, invoiceType:'factura' as any }}
            sections={templateSettings?.custom_layout||DEFAULT_SECTIONS} paperSize={(templateSettings?.paper_size as any)||'A4'}
            primaryColor={templateSettings?.primary_color||'#C5E86C'} templateStyle={templateSettings?.template_style||'onix'}
            layoutModel={(templateSettings?.layout_model as LayoutModel)||'letterhead'} fontFamily={templateSettings?.font_family||'Inter'}
            agency={agencyInfo as any} showWatermark={templateSettings?.show_watermark}
          />
        </div>
      </div>
      {/* Hidden invoice for PDF generation - history */}
      {downloadingInvoice && agencyInfo && (
        <div className="fixed left-[-9999px] top-0 pointer-events-none" style={{width:'794px',zIndex:-1,background:'white'}}>
          <div id="hidden-history-invoice">
            <PrintableInvoice
              invoiceData={{ invoiceNumber:downloadingInvoice.invoice_number, issueDate:downloadingInvoice.issue_date, dueDate:downloadingInvoice.due_date||undefined,
                client:{companyName:client.companyName,contactName:client.contactName,email:client.email,phone:client.phone,address:client.address},
                agency:agencyInfo as any, services:downloadingInvoice.services,
                subtotal:downloadingInvoice.subtotal, taxPercentage:downloadingInvoice.tax_percentage, taxAmount:downloadingInvoice.tax_amount, total:downloadingInvoice.total,
                currency:agencyInfo.currency, notes:downloadingInvoice.notes||undefined, invoiceType:'factura' as any }}
              sections={templateSettings?.custom_layout||DEFAULT_SECTIONS} paperSize={(templateSettings?.paper_size as any)||'A4'}
              primaryColor={templateSettings?.primary_color||'#C5E86C'} templateStyle={templateSettings?.template_style||'onix'}
              layoutModel={(templateSettings?.layout_model as LayoutModel)||'letterhead'} fontFamily={templateSettings?.font_family||'Inter'}
              agency={agencyInfo as any} showWatermark={templateSettings?.show_watermark}
            />
          </div>
        </div>
      )}
      </DialogContent>
    </Dialog>
  );
}
