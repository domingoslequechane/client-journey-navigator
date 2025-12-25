-- Adicionar coluna para armazenar o layout customizado do editor drag-and-drop
ALTER TABLE public.invoice_template_settings 
ADD COLUMN custom_layout JSONB DEFAULT NULL;

-- Adicionar coluna para o tamanho do papel
ALTER TABLE public.invoice_template_settings 
ADD COLUMN paper_size TEXT DEFAULT 'A4' CHECK (paper_size IN ('A4', 'A5'));

COMMENT ON COLUMN public.invoice_template_settings.custom_layout IS 'JSON com posições e estilos dos elementos do template de factura';
COMMENT ON COLUMN public.invoice_template_settings.paper_size IS 'Tamanho do papel: A4 ou A5';