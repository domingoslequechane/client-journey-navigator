-- Fix: Function Search Path Mutable on create_default_finance_categories
-- Adding SET search_path = public to prevent search path injection

CREATE OR REPLACE FUNCTION public.create_default_finance_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;