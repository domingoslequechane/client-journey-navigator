-- Atualizar Bússola (free): 3 clientes, 3 contratos, 90 msgs IA, 1 usuário
UPDATE plan_limits 
SET max_clients = 3, 
    max_contracts_per_month = 3, 
    max_ai_messages_per_month = 90,
    max_team_members = 1
WHERE plan_type = 'free';

-- Atualizar Lança (starter): 5 usuários
UPDATE plan_limits 
SET max_team_members = 5
WHERE plan_type = 'starter';