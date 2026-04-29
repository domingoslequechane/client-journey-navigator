import { supabase } from '@/integrations/supabase/client';

export interface OrganizationScope {
  organizationId: string;
  userId: string;
}

export async function validateTenantAccess(
  table: string,
  recordId: string,
  organizationId: string,
  idColumn: string = 'id'
): Promise<boolean> {
  const { data, error } = await (supabase
    .from(table as any)
    .select('id')
    .eq(idColumn, recordId)
    .eq('organization_id', organizationId)
    .single() as any);

  return !error && data !== null;
}

export async function validateOwnership(
  table: string,
  recordId: string,
  userId: string,
  ownerColumn: string = 'user_id'
): Promise<boolean> {
  const { data, error } = await (supabase
    .from(table as any)
    .select(ownerColumn)
    .eq('id', recordId)
    .single() as any);

  return !error && data?.[ownerColumn] === userId;
}

export function sanitizeNumeric(value: unknown, fieldName: string): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) {
    throw new Error(`${fieldName} inválido`);
  }
  return num;
}

export function validatePositiveValue(value: number, fieldName: string): void {
  if (value < 0) {
    throw new Error(`${fieldName} não pode ser negativo`);
  }
}

export function validateBillingLimit(
  currentCount: number,
  limit: number,
  featureName: string
): void {
  if (currentCount >= limit) {
    throw new Error(`Limite do plano excedido: ${featureName}. Faça upgrade do seu plano.`);
  }
}

export const PRIVILEGED_ROLES = ['owner', 'admin'];

export function sanitizeMemberInvite(
  invitedByRole: string,
  requestedRole?: string,
  requestedPermissions?: string[]
): { role: string; permissions: string[] } {
  const isPrivileged = PRIVILEGED_ROLES.includes(invitedByRole);
  
  if (!isPrivileged && (requestedRole === 'owner' || requestedRole === 'admin')) {
    throw new Error('Não tem permissão para atribuir privilégios administrativos');
  }

  const validRoles = ['member', 'viewer', 'admin', 'owner'];
  const role = requestedRole && validRoles.includes(requestedRole) ? requestedRole : 'member';

  const allowedPermissions = [
    'clients', 'deals', 'finances', 'projects', 
    'analytics', 'team', 'settings', 'ai_agents'
  ];
  
  const permissions = (requestedPermissions ?? [])
    .filter(p => allowedPermissions.includes(p));

  return { role, permissions };
}