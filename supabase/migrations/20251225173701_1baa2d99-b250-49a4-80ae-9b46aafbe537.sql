-- Add document_type column to contract_templates table
ALTER TABLE public.contract_templates 
ADD COLUMN document_type TEXT NOT NULL DEFAULT 'contract';

-- Add comment for clarity
COMMENT ON COLUMN public.contract_templates.document_type IS 'Type of document: contract, proforma_invoice, budget, commercial_proposal';