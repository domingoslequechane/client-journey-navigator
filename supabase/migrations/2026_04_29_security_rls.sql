-- =====================================================
-- ROW LEVEL SECURITY POLICIES FOR TENANT ISOLATION
-- Applied: April 29, 2026
-- =====================================================

-- =====================================================
-- CLIENTS
-- =====================================================
DROP POLICY IF EXISTS "clients_tenant_isolation" ON clients;
CREATE POLICY "clients_tenant_isolation" ON clients
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- FINANCIAL TRANSACTIONS
-- =====================================================
DROP POLICY IF EXISTS "transactions_tenant_isolation" ON financial_transactions;
CREATE POLICY "transactions_tenant_isolation" ON financial_transactions
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- DEALS / PIPELINE
-- =====================================================
DROP POLICY IF EXISTS "deals_tenant_isolation" ON deals;
CREATE POLICY "deals_tenant_isolation" ON deals
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- PROJECTS
-- =====================================================
DROP POLICY IF EXISTS "projects_tenant_isolation" ON projects;
CREATE POLICY "projects_tenant_isolation" ON projects
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- CONTRACTS
-- =====================================================
DROP POLICY IF EXISTS "contracts_tenant_isolation" ON contracts;
CREATE POLICY "contracts_tenant_isolation" ON contracts
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- ORGANIZATION MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "members_tenant_isolation" ON organization_members;
CREATE POLICY "members_tenant_isolation" ON organization_members
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- LEADS
-- =====================================================
DROP POLICY IF EXISTS "leads_tenant_isolation" ON leads;
CREATE POLICY "leads_tenant_isolation" ON leads
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- ACTIVITIES
-- =====================================================
DROP POLICY IF EXISTS "activities_tenant_isolation" ON activities;
CREATE POLICY "activities_tenant_isolation" ON activities
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- ATENDE AI INSTANCES
-- =====================================================
DROP POLICY IF EXISTS "atende_ai_instances_tenant_isolation" ON atende_ai_instances;
CREATE POLICY "atende_ai_instances_tenant_isolation" ON atende_ai_instances
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- ATENDE AI CONVERSATIONS
-- =====================================================
DROP POLICY IF EXISTS "atende_ai_conversations_tenant_isolation" ON atende_ai_conversations;
CREATE POLICY "atende_ai_conversations_tenant_isolation" ON atende_ai_conversations
  FOR ALL
  USING (instance_id IN (
    SELECT id FROM atende_ai_instances 
    WHERE organization_id = current_setting('app.current_organization_id', true)::uuid
  ));

-- =====================================================
-- AI AGENTS
-- =====================================================
DROP POLICY IF EXISTS "ai_agents_tenant_isolation" ON ai_agents;
CREATE POLICY "ai_agents_tenant_isolation" ON ai_agents
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- SOCIAL MEDIA ACCOUNTS
-- =====================================================
DROP POLICY IF EXISTS "social_accounts_tenant_isolation" ON social_accounts;
CREATE POLICY "social_accounts_tenant_isolation" ON social_accounts
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- SOCIAL POSTS
-- =====================================================
DROP POLICY IF EXISTS "social_posts_tenant_isolation" ON social_posts;
CREATE POLICY "social_posts_tenant_isolation" ON social_posts
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- STUDIO PROJECTS
-- =====================================================
DROP POLICY IF EXISTS "studio_projects_tenant_isolation" ON studio_projects;
CREATE POLICY "studio_projects_tenant_isolation" ON studio_projects
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- LINK PAGES
-- =====================================================
DROP POLICY IF EXISTS "link_pages_tenant_isolation" ON link_pages;
CREATE POLICY "link_pages_tenant_isolation" ON link_pages
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- EDITORIAL TASKS
-- =====================================================
DROP POLICY IF EXISTS "editorial_tasks_tenant_isolation" ON editorial_tasks;
CREATE POLICY "editorial_tasks_tenant_isolation" ON editorial_tasks
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- SUBSCRIPTIONS (allow read for billing, update only for owners)
-- =====================================================
DROP POLICY IF EXISTS "subscriptions_tenant_isolation" ON subscriptions;
CREATE POLICY "subscriptions_tenant_isolation" ON subscriptions
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE atende_ai_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE atende_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;