import { InvoiceSection, PaperSize, INVOICE_TYPE_LABELS } from './section-types';

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

  // Get section by type
  const getSection = (type: string) => visibleSections.find((s) => s.type === type);

  const headerSection = getSection('header');
  const invoiceInfoSection = getSection('invoice_info');
  const clientSection = getSection('client');
  const servicesSection = getSection('services');
  const totalsSection = getSection('totals');
  const paymentSection = getSection('payment');
  const signaturesSection = getSection('signatures');
  const footerSection = getSection('footer');

  return (
    <div
      className="bg-white rounded-lg shadow-lg overflow-hidden border"
      style={{
        aspectRatio,
        maxHeight: '100%',
        width: '100%',
      }}
    >
      <div className="p-3 h-full flex flex-col text-[7px] text-gray-800">
        {/* HEADER - Two columns: Invoice type left, Agency info right */}
        {(headerSection || invoiceInfoSection) && (
          <div className="flex justify-between items-start mb-2 pb-2 border-b border-gray-200">
            {/* Left: Invoice Type */}
            {invoiceInfoSection && (
              <div>
                <div className="text-gray-500 text-[6px] mb-0.5">Factura</div>
                <div className="font-bold text-[10px]" style={{ color: primaryColor }}>
                  {INVOICE_TYPE_LABELS[invoiceInfoSection.settings.invoiceType || 'proforma']}
                </div>
                <div className="text-gray-600 text-[6px]">Nº 25-0043</div>
              </div>
            )}

            {/* Right: Agency Info */}
            {headerSection && (
              <div className="text-right">
                <div className="font-bold text-[9px] mb-0.5" style={{ color: primaryColor }}>
                  AGÊNCIA ONIX
                </div>
                {headerSection.settings.showSlogan && (
                  <div className="text-gray-500 text-[5px] italic mb-0.5">
                    {headerSection.settings.slogan || 'Marketing Digital'}
                  </div>
                )}
                {headerSection.settings.showNuit && (
                  <div className="text-gray-500 text-[5px]">NUIT: 123456789</div>
                )}
                {headerSection.settings.showAddress && (
                  <div className="text-gray-500 text-[5px]">Maputo, Moçambique</div>
                )}
                {headerSection.settings.showPhone && (
                  <div className="text-gray-500 text-[5px]">+258 84 123 4567</div>
                )}
                {headerSection.settings.showEmail && (
                  <div className="text-gray-500 text-[5px]">info@agencia.mz</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CLIENT + DATES BOX - Green/Lime colored box */}
        {(clientSection || invoiceInfoSection) && (
          <div 
            className="rounded-md p-2 mb-2"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <div className="flex justify-between gap-2">
              {/* Left: Client Info */}
              {clientSection && (
                <div className="flex-1">
                  <div className="text-[5px] text-gray-500 mb-0.5">Para a:</div>
                  <div className="font-semibold text-[7px]">Nome do Cliente</div>
                  {clientSection.settings.showClientNuit && (
                    <div className="text-gray-500 text-[5px]">NUIT: -</div>
                  )}
                  {clientSection.settings.showClientAddress && (
                    <div className="text-gray-500 text-[5px]">Endereço: Maputo</div>
                  )}
                  {clientSection.settings.showClientPhone && (
                    <div className="text-gray-500 text-[5px]">Tel: +258 82 000 0000</div>
                  )}
                  {clientSection.settings.showClientEmail && (
                    <div className="text-gray-500 text-[5px]">cliente@email.com</div>
                  )}
                </div>
              )}

              {/* Right: Dates + Total */}
              {invoiceInfoSection && (
                <div className="text-right border-l border-gray-300 pl-2">
                  <div className="text-[5px]">
                    <span className="text-gray-500">Data: </span>
                    <span>25/12/2025</span>
                  </div>
                  {invoiceInfoSection.settings.showValidity && (
                    <div className="text-[5px]">
                      <span className="text-gray-500">Validade: </span>
                      <span>25/01/2026</span>
                    </div>
                  )}
                  {invoiceInfoSection.settings.showDueDate && (
                    <div className="text-[5px]">
                      <span className="text-gray-500">Vencimento: </span>
                      <span>25/01/2026</span>
                    </div>
                  )}
                  {invoiceInfoSection.settings.showTotalInHeader && (
                    <div className="mt-1 pt-1 border-t border-gray-300">
                      <div className="font-bold text-[8px]" style={{ color: primaryColor }}>
                        Total: 5.336 mt
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SERVICES TABLE - Numbered rows */}
        {servicesSection && (
          <div className="mb-2 flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2" style={{ borderColor: primaryColor }}>
                  {servicesSection.settings.showRowNumbers && (
                    <th className="py-0.5 text-[5px] text-gray-500 w-4">Nº</th>
                  )}
                  <th className="py-0.5 text-[5px] text-gray-500">DESCRIÇÃO</th>
                  {servicesSection.settings.showQuantity && (
                    <th className="py-0.5 text-[5px] text-gray-500 w-6 text-center">QNT.</th>
                  )}
                  {servicesSection.settings.showUnitPrice && (
                    <th className="py-0.5 text-[5px] text-gray-500 w-10 text-right">P. UNIT.</th>
                  )}
                  <th className="py-0.5 text-[5px] text-gray-500 w-10 text-right">QUANTIA</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {servicesSection.settings.showRowNumbers && (
                      <td className="py-0.5 text-[6px] text-gray-400">{i}.</td>
                    )}
                    <td className="py-0.5 text-[6px]">Serviço de exemplo {i}</td>
                    {servicesSection.settings.showQuantity && (
                      <td className="py-0.5 text-[6px] text-center">1</td>
                    )}
                    {servicesSection.settings.showUnitPrice && (
                      <td className="py-0.5 text-[6px] text-right">650 mt</td>
                    )}
                    <td className="py-0.5 text-[6px] text-right">650 mt</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* NOTES + TOTALS - Side by side */}
        {totalsSection && (
          <div className="flex gap-2 mb-2">
            {/* Left: Notes */}
            {totalsSection.settings.showNotes && totalsSection.settings.notesPosition === 'left' && (
              <div className="flex-1">
                <div className="text-[5px] text-gray-500 mb-0.5">Nota:</div>
                <div className="text-[5px] text-gray-600 leading-relaxed">
                  Este é um documento preliminar para aprovação do cliente.
                </div>
              </div>
            )}

            {/* Right: Totals */}
            <div className="text-right ml-auto">
              {totalsSection.settings.showSubtotal && (
                <div className="flex justify-end gap-2 text-[6px]">
                  <span className="text-gray-500">Sub-Total:</span>
                  <span className="w-12">4.600 mt</span>
                </div>
              )}
              {totalsSection.settings.showTax && (
                <div className="flex justify-end gap-2 text-[6px]">
                  <span className="text-gray-500">IVA 16%:</span>
                  <span className="w-12">736 mt</span>
                </div>
              )}
              <div 
                className="flex justify-end gap-2 text-[7px] font-bold mt-0.5 pt-0.5 border-t"
                style={{ borderColor: primaryColor }}
              >
                <span>Total:</span>
                <span className="w-12" style={{ color: primaryColor }}>5.336 mt</span>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER - Three columns: Payment | Legal | Signature */}
        {(paymentSection || signaturesSection || footerSection) && (
          <div 
            className="mt-auto pt-1 border-t flex gap-2"
            style={{ borderColor: primaryColor }}
          >
            {/* Column 1: Payment */}
            {paymentSection && (
              <div className="flex-1">
                <div className="text-[5px] text-gray-500 mb-0.5">Nº de Conta</div>
                {paymentSection.settings.showPaymentProvider && (
                  <div className="text-[5px]">
                    <span className="text-gray-500">BIM: </span>
                    <span>xxx-xxxx-xxx</span>
                  </div>
                )}
                {paymentSection.settings.showPaymentAccount && (
                  <div className="text-[5px]">
                    <span className="text-gray-500">E-Mola: </span>
                    <span>84 xxx xxxx</span>
                  </div>
                )}
                {paymentSection.settings.showPaymentRecipient && (
                  <div className="text-[5px]">
                    <span className="text-gray-500">M-Pesa: </span>
                    <span>84 xxx xxxx</span>
                  </div>
                )}
              </div>
            )}

            {/* Column 2: Legal/Thanks */}
            {footerSection && (
              <div className="flex-1 text-center">
                <div className="text-[5px] text-gray-500 leading-relaxed">
                  {footerSection.settings.footerLegalText || 'Documento não válido para fins fiscais.'}
                </div>
                <div className="text-[5px] mt-1" style={{ color: primaryColor }}>
                  {footerSection.settings.footerText || 'Obrigado pela preferência!'}
                </div>
              </div>
            )}

            {/* Column 3: Signature */}
            {signaturesSection && signaturesSection.settings.showAgencySignature && (
              <div className="flex-1 text-right">
                <div className="border-b border-gray-300 mb-0.5 h-3"></div>
                <div className="text-[5px] text-gray-500">
                  {signaturesSection.settings.agencySignatureLabel || 'O Responsável'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
