import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InvoiceSection, SectionSettings as SectionSettingsType } from './section-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SectionSettingsProps {
  section: InvoiceSection;
  onClose: () => void;
  onUpdateSettings: (sectionId: string, settings: Partial<SectionSettingsType>) => void;
}

export function SectionSettings({
  section,
  onClose,
  onUpdateSettings,
}: SectionSettingsProps) {
  // LOCAL state — fixes the toggle bug where turning off won't let you turn back on
  const [local, setLocal] = useState<SectionSettingsType>(section.settings);

  // Sync when section changes (e.g. switching between sections)
  useEffect(() => {
    setLocal(section.settings);
  }, [section.id]);

  const set = <K extends keyof SectionSettingsType>(key: K, value: SectionSettingsType[K]) => {
    const updated = { ...local, [key]: value };
    setLocal(updated);
    onUpdateSettings(section.id, { [key]: value });
  };

  const renderSettings = () => {
    switch (section.type) {
      case 'header':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Posição do Logo</Label>
              <RadioGroup
                value={local.logoPosition || 'right'}
                onValueChange={(v) => set('logoPosition', v as 'left' | 'center' | 'right')}
                className="flex gap-4"
              >
                {['left', 'center', 'right'].map(pos => (
                  <div key={pos} className="flex items-center space-x-2">
                    <RadioGroupItem value={pos} id={`logo-${pos}`} />
                    <Label htmlFor={`logo-${pos}`} className="font-normal capitalize cursor-pointer">
                      {pos === 'left' ? 'Esquerda' : pos === 'center' ? 'Centro' : 'Direita'}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-3">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Campos visíveis</Label>
              <Toggle label="Mostrar NUIT" checked={local.showNuit ?? true} onChange={v => set('showNuit', v)} />
              <Toggle label="Mostrar Telefone" checked={local.showPhone ?? true} onChange={v => set('showPhone', v)} />
              <Toggle label="Mostrar Endereço" checked={local.showAddress ?? true} onChange={v => set('showAddress', v)} />
              <Toggle label="Mostrar Email" checked={local.showEmail ?? true} onChange={v => set('showEmail', v)} />
              <Toggle label="Mostrar Slogan" checked={local.showSlogan ?? true} onChange={v => set('showSlogan', v)} />
            </div>
            {local.showSlogan && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Texto do Slogan</Label>
                <Input
                  value={local.slogan || ''}
                  onChange={e => set('slogan', e.target.value)}
                  placeholder="Marketing Digital de Elite"
                  className="h-9"
                />
              </div>
            )}
          </div>
        );

      case 'client':
        return (
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos visíveis</Label>
            <Toggle label="Mostrar Email" checked={local.showClientEmail ?? true} onChange={v => set('showClientEmail', v)} />
            <Toggle label="Mostrar Telefone" checked={local.showClientPhone ?? true} onChange={v => set('showClientPhone', v)} />
            <Toggle label="Mostrar Endereço" checked={local.showClientAddress ?? true} onChange={v => set('showClientAddress', v)} />
            <Toggle label="Mostrar NUIT" checked={local.showClientNuit ?? true} onChange={v => set('showClientNuit', v)} />
          </div>
        );

      case 'invoice_info':
        return (
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos visíveis</Label>
            <Toggle label="Mostrar Data de Vencimento" checked={local.showDueDate ?? true} onChange={v => set('showDueDate', v)} />
            <Toggle label="Mostrar Validade" checked={local.showValidity ?? true} onChange={v => set('showValidity', v)} />
            <Toggle label="Mostrar Total no Cabeçalho" checked={local.showTotalInHeader ?? true} onChange={v => set('showTotalInHeader', v)} />
          </div>
        );

      case 'services':
        return (
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colunas da tabela</Label>
            <Toggle label="Mostrar Coluna Quantidade" checked={local.showQuantity ?? true} onChange={v => set('showQuantity', v)} />
            <Toggle label="Mostrar Coluna Preço Unitário" checked={local.showUnitPrice ?? true} onChange={v => set('showUnitPrice', v)} />
            <Toggle label="Mostrar Nº de Linha" checked={local.showRowNumbers ?? true} onChange={v => set('showRowNumbers', v)} />
          </div>
        );

      case 'totals':
        return (
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos visíveis</Label>
            <Toggle label="Mostrar Subtotal" checked={local.showSubtotal ?? true} onChange={v => set('showSubtotal', v)} />
            <Toggle label="Mostrar IVA (16%)" checked={local.showTax ?? true} onChange={v => set('showTax', v)} />
            <Toggle label="Mostrar Notas" checked={local.showNotes ?? true} onChange={v => set('showNotes', v)} />
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos visíveis</Label>
            <Toggle label="Mostrar Provedora (M-Pesa, Banco…)" checked={local.showPaymentProvider ?? true} onChange={v => set('showPaymentProvider', v)} />
            <Toggle label="Mostrar Número da Conta" checked={local.showPaymentAccount ?? true} onChange={v => set('showPaymentAccount', v)} />
            <Toggle label="Mostrar Nome do Destinatário" checked={local.showPaymentRecipient ?? true} onChange={v => set('showPaymentRecipient', v)} />
          </div>
        );

      case 'signatures':
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <Toggle label="Assinatura do Cliente" checked={local.showClientSignature ?? true} onChange={v => set('showClientSignature', v)} />
              {local.showClientSignature && (
                <div className="pl-3 border-l-2 border-primary/30 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Label</Label>
                  <Input
                    value={local.clientSignatureLabel || 'O Cliente'}
                    onChange={e => set('clientSignatureLabel', e.target.value)}
                    placeholder="O Cliente"
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Toggle label="Assinatura da Agência" checked={local.showAgencySignature ?? true} onChange={v => set('showAgencySignature', v)} />
              {local.showAgencySignature && (
                <div className="pl-3 border-l-2 border-primary/30 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Label</Label>
                  <Input
                    value={local.agencySignatureLabel || 'O Responsável'}
                    onChange={e => set('agencySignatureLabel', e.target.value)}
                    placeholder="O Responsável"
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagem de Agradecimento</Label>
              <Textarea
                value={local.footerText || ''}
                onChange={e => set('footerText', e.target.value)}
                placeholder="Obrigado pela preferência!"
                rows={2}
                className="text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Texto Legal</Label>
              <Textarea
                value={local.footerLegalText || ''}
                onChange={e => set('footerLegalText', e.target.value)}
                placeholder="Documento não válido para fins fiscais."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">Sem configurações disponíveis.</p>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div>
          <h3 className="font-semibold text-base">{section.label}</h3>
          <p className="text-sm text-muted-foreground">{section.description}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          {renderSettings()}
        </div>
      </ScrollArea>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between py-2 px-3 rounded-lg transition-colors',
      checked ? 'bg-primary/5' : 'bg-muted/30'
    )}>
      <Label className="font-normal text-sm cursor-pointer">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
