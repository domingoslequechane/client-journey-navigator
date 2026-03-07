import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function useOrganization() {
  const { organizationId, organization, loading, refreshOrganization } = useOrganizationContext();

  return {
    currency: organization?.currency || 'MZN',
    currencySymbol: organization?.currency_symbol || 'MT',
    organizationId,
    loading,
    refreshOrganization
  };
}
