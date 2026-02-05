-- Adicionar cheque ao enum
ALTER TYPE financial_payment_method ADD VALUE 'cheque';

-- Função para criar categorias padrão
CREATE OR REPLACE FUNCTION create_default_finance_categories()
RETURNS trigger AS $$
BEGIN
  -- Categorias de Receita
  INSERT INTO financial_categories (organization_id, name, type, color) VALUES
    (NEW.id, 'Serviços', 'income', '#22c55e'),
    (NEW.id, 'Consultoria', 'income', '#3b82f6'),
    (NEW.id, 'Venda de Produto', 'income', '#14b8a6'),
    (NEW.id, 'Comissões', 'income', '#f59e0b'),
    (NEW.id, 'Outras Receitas', 'income', '#8b5cf6');
  
  -- Categorias de Despesa
  INSERT INTO financial_categories (organization_id, name, type, color) VALUES
    (NEW.id, 'Salários', 'expense', '#ef4444'),
    (NEW.id, 'Marketing', 'expense', '#ec4899'),
    (NEW.id, 'Tecnologia', 'expense', '#3b82f6'),
    (NEW.id, 'Aluguel', 'expense', '#f97316'),
    (NEW.id, 'Transporte', 'expense', '#84cc16'),
    (NEW.id, 'Alimentação', 'expense', '#f59e0b'),
    (NEW.id, 'Material de Escritório', 'expense', '#6366f1'),
    (NEW.id, 'Impostos', 'expense', '#64748b'),
    (NEW.id, 'Outras Despesas', 'expense', '#78716c');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novas organizações
DROP TRIGGER IF EXISTS on_organization_created_finance_categories ON organizations;
CREATE TRIGGER on_organization_created_finance_categories
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_finance_categories();

-- Criar categorias para organizações existentes que não têm categorias
INSERT INTO financial_categories (organization_id, name, type, color)
SELECT o.id, c.name, c.type::financial_transaction_type, c.color
FROM organizations o
CROSS JOIN (VALUES
  ('Serviços', 'income', '#22c55e'),
  ('Consultoria', 'income', '#3b82f6'),
  ('Venda de Produto', 'income', '#14b8a6'),
  ('Comissões', 'income', '#f59e0b'),
  ('Outras Receitas', 'income', '#8b5cf6'),
  ('Salários', 'expense', '#ef4444'),
  ('Marketing', 'expense', '#ec4899'),
  ('Tecnologia', 'expense', '#3b82f6'),
  ('Aluguel', 'expense', '#f97316'),
  ('Transporte', 'expense', '#84cc16'),
  ('Alimentação', 'expense', '#f59e0b'),
  ('Material de Escritório', 'expense', '#6366f1'),
  ('Impostos', 'expense', '#64748b'),
  ('Outras Despesas', 'expense', '#78716c')
) AS c(name, type, color)
WHERE NOT EXISTS (
  SELECT 1 FROM financial_categories fc 
  WHERE fc.organization_id = o.id AND fc.name = c.name
);