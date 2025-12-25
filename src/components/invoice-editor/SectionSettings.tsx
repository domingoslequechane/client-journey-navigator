import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { InvoiceSection, SectionSettings as SectionSettingsType } from './section-types';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const settings = section.settings;

  const handleChange = (key: keyof SectionSettingsType, value: any) => {
    onUpdateSettings(section.id, { [key]: value });
  };

  const renderSettings = () => {
    switch (section.type) {
      case 'header':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Posição do Logo</Label>
              <RadioGroup
                value={settings.logoPosition || 'left'}
                onValueChange={(v) => handleChange('logoPosition', v)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="logo-left" />
                  <Label htmlFor="logo-left" className="font-normal">Esquerda</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="center" id="logo-center" />
                  <Label htmlFor="logo-center" className="font-normal">Centro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="logo-right" />
                  <Label htmlFor="logo-right" className="font-normal">Direita</Label>
                </div>
              </RadioGroup>
            </div>
            <ToggleSetting
              label="Mostrar NUIT"
              checked={settings.showNuit ?? true}
              onChange={(v) => handleChange('showNuit', v)}
            />
            <ToggleSetting
              label="Mostrar Telefone"
              checked={settings.showPhone ?? true}
              onChange={(v) => handleChange('showPhone', v)}
            />
            <ToggleSetting
              label="Mostrar Endereço"
              checked={settings.showAddress ?? true}
              onChange={(v) => handleChange('showAddress', v)}
            />
          </div>
        );

      case 'client':
        return (
          <div className="space-y-4">
            <ToggleSetting
              label="Mostrar Email"
              checked={settings.showEmail ?? true}
              onChange={(v) => handleChange('showEmail', v)}
            />
            <ToggleSetting
              label="Mostrar Telefone"
              checked={settings.showClientPhone ?? true}
              onChange={(v) => handleChange('showClientPhone', v)}
            />
            <ToggleSetting
              label="Mostrar Endereço"
              checked={settings.showClientAddress ?? true}
              onChange={(v) => handleChange('showClientAddress', v)}
            />
          </div>
        );

      case 'invoice_info':
        return (
          <div className="space-y-4">
            <ToggleSetting
              label="Mostrar Data de Vencimento"
              checked={settings.showDueDate ?? true}
              onChange={(v) => handleChange('showDueDate', v)}
            />
          </div>
        );

      case 'services':
        return (
          <div className="space-y-4">
            <ToggleSetting
              label="Mostrar Coluna Quantidade"
              checked={settings.showQuantity ?? true}
              onChange={(v) => handleChange('showQuantity', v)}
            />
            <ToggleSetting
              label="Mostrar Coluna Preço Unitário"
              checked={settings.showUnitPrice ?? true}
              onChange={(v) => handleChange('showUnitPrice', v)}
            />
          </div>
        );

      case 'totals':
        return (
          <div className="space-y-4">
            <ToggleSetting
              label="Mostrar Subtotal"
              checked={settings.showSubtotal ?? true}
              onChange={(v) => handleChange('showSubtotal', v)}
            />
            <ToggleSetting
              label="Mostrar IVA"
              checked={settings.showTax ?? true}
              onChange={(v) => handleChange('showTax', v)}
            />
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-4">
            <ToggleSetting
              label="Mostrar Provedora (M-Pesa, Banco, etc)"
              checked={settings.showPaymentProvider ?? true}
              onChange={(v) => handleChange('showPaymentProvider', v)}
            />
            <ToggleSetting
              label="Mostrar Número da Conta"
              checked={settings.showPaymentAccount ?? true}
              onChange={(v) => handleChange('showPaymentAccount', v)}
            />
            <ToggleSetting
              label="Mostrar Nome do Destinatário"
              checked={settings.showPaymentRecipient ?? true}
              onChange={(v) => handleChange('showPaymentRecipient', v)}
            />
          </div>
        );

      case 'signatures':
        return (
          <div className="space-y-4">
            <ToggleSetting
              label="Assinatura do Cliente"
              checked={settings.showClientSignature ?? true}
              onChange={(v) => handleChange('showClientSignature', v)}
            />
            {settings.showClientSignature && (
              <div className="space-y-2 pl-4">
                <Label>Label da Assinatura do Cliente</Label>
                <Input
                  value={settings.clientSignatureLabel || 'O Cliente'}
                  onChange={(e) => handleChange('clientSignatureLabel', e.target.value)}
                  placeholder="O Cliente"
                />
              </div>
            )}
            <ToggleSetting
              label="Assinatura da Agência"
              checked={settings.showAgencySignature ?? true}
              onChange={(v) => handleChange('showAgencySignature', v)}
            />
            {settings.showAgencySignature && (
              <div className="space-y-2 pl-4">
                <Label>Label da Assinatura da Agência</Label>
                <Input
                  value={settings.agencySignatureLabel || 'A Agência'}
                  onChange={(e) => handleChange('agencySignatureLabel', e.target.value)}
                  placeholder="A Agência"
                />
              </div>
            )}
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Texto do Rodapé</Label>
              <Textarea
                value={settings.footerText || ''}
                onChange={(e) => handleChange('footerText', e.target.value)}
                placeholder="Obrigado pela preferência!"
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">Sem configurações disponíveis.</p>;
    }
  };

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{section.label}</h3>
          <p className="text-sm text-muted-foreground">Configurações</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        {renderSettings()}
      </ScrollArea>
    </div>
  );
}

function ToggleSetting({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="font-normal">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary"
      />
    </div>
  );
}
