import { InvoiceSection, PaperSize } from './section-types';

interface InvoicePreviewProps {
  sections: InvoiceSection[];
  paperSize: PaperSize;
  primaryColor: string;
}

export function InvoicePreview({ sections, paperSize, primaryColor }: InvoicePreviewProps) {
  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const aspectRatio = paperSize === 'A4' ? '210 / 297' : '148 / 210';

  return (
    <div
      className="bg-white rounded-lg shadow-lg overflow-hidden border"
      style={{
        aspectRatio,
        maxHeight: '100%',
        width: '100%',
      }}
    >
      <div className="p-4 h-full flex flex-col text-[8px] text-gray-800">
        {visibleSections.map((section) => (
          <PreviewSection
            key={section.id}
            section={section}
            primaryColor={primaryColor}
          />
        ))}
      </div>
    </div>
  );
}

function PreviewSection({
  section,
  primaryColor,
}: {
  section: InvoiceSection;
  primaryColor: string;
}) {
  const settings = section.settings;

  switch (section.type) {
    case 'header':
      return (
        <div className="mb-3 pb-2 border-b border-gray-200">
          <div
            className={`flex ${
              settings.logoPosition === 'center'
                ? 'justify-center text-center'
                : settings.logoPosition === 'right'
                ? 'justify-end text-right'
                : 'justify-start'
            }`}
          >
            <div>
              <div
                className="font-bold text-[10px] mb-1"
                style={{ color: primaryColor }}
              >
                Nome da Agência
              </div>
              {settings.showNuit && (
                <div className="text-gray-500">NUIT: 123456789</div>
              )}
              {settings.showPhone && (
                <div className="text-gray-500">Tel: +258 84 123 4567</div>
              )}
              {settings.showAddress && (
                <div className="text-gray-500">Maputo, Moçambique</div>
              )}
            </div>
          </div>
        </div>
      );

    case 'invoice_info':
      return (
        <div className="mb-3">
          <div className="font-semibold mb-1" style={{ color: primaryColor }}>
            FACTURA #001
          </div>
          <div className="text-gray-500">Data: 25/12/2025</div>
          {settings.showDueDate && (
            <div className="text-gray-500">Vencimento: 25/01/2026</div>
          )}
        </div>
      );

    case 'client':
      return (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="font-semibold mb-1">Cliente</div>
          <div>Empresa ABC</div>
          <div>João Silva</div>
          {settings.showEmail && <div className="text-gray-500">joao@abc.com</div>}
          {settings.showClientPhone && (
            <div className="text-gray-500">+258 82 987 6543</div>
          )}
          {settings.showClientAddress && (
            <div className="text-gray-500">Av. 25 de Setembro, Maputo</div>
          )}
        </div>
      );

    case 'services':
      return (
        <div className="mb-3 flex-1">
          <table className="w-full text-left">
            <thead>
              <tr
                className="text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <th className="p-1">Descrição</th>
                {settings.showQuantity && <th className="p-1 w-12">Qtd</th>}
                {settings.showUnitPrice && <th className="p-1 w-16">P.Unit</th>}
                <th className="p-1 w-16 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-1">Serviço de Exemplo</td>
                {settings.showQuantity && <td className="p-1">1</td>}
                {settings.showUnitPrice && <td className="p-1">5.000</td>}
                <td className="p-1 text-right">5.000,00</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-1">Outro Serviço</td>
                {settings.showQuantity && <td className="p-1">2</td>}
                {settings.showUnitPrice && <td className="p-1">2.500</td>}
                <td className="p-1 text-right">5.000,00</td>
              </tr>
            </tbody>
          </table>
        </div>
      );

    case 'totals':
      return (
        <div className="mb-3 text-right">
          {settings.showSubtotal && (
            <div className="flex justify-end gap-4">
              <span className="text-gray-500">Subtotal:</span>
              <span>10.000,00 MZN</span>
            </div>
          )}
          {settings.showTax && (
            <div className="flex justify-end gap-4">
              <span className="text-gray-500">IVA (16%):</span>
              <span>1.600,00 MZN</span>
            </div>
          )}
          <div
            className="flex justify-end gap-4 font-bold text-[9px] mt-1 pt-1 border-t"
            style={{ color: primaryColor }}
          >
            <span>Total:</span>
            <span>11.600,00 MZN</span>
          </div>
        </div>
      );

    case 'payment':
      return (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="font-semibold mb-1">Dados de Pagamento</div>
          {settings.showPaymentProvider && <div>M-Pesa</div>}
          {settings.showPaymentAccount && (
            <div className="text-gray-500">Conta: 84 123 4567</div>
          )}
          {settings.showPaymentRecipient && (
            <div className="text-gray-500">Nome: Agência XYZ</div>
          )}
        </div>
      );

    case 'signatures':
      return (
        <div className="mb-3 flex gap-4">
          {settings.showClientSignature && (
            <div className="flex-1 text-center">
              <div className="border-t border-gray-300 mt-4 pt-1">
                {settings.clientSignatureLabel || 'O Cliente'}
              </div>
            </div>
          )}
          {settings.showAgencySignature && (
            <div className="flex-1 text-center">
              <div className="border-t border-gray-300 mt-4 pt-1">
                {settings.agencySignatureLabel || 'A Agência'}
              </div>
            </div>
          )}
        </div>
      );

    case 'footer':
      return (
        <div className="mt-auto pt-2 border-t border-gray-200 text-center text-gray-500">
          {settings.footerText || 'Obrigado pela preferência!'}
        </div>
      );

    default:
      return null;
  }
}
