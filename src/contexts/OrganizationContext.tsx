import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { getCurrencySymbol } from '@/lib/currencies';

interface Organization {
    id: string;
    name: string;
    currency: string;
    currency_symbol: string;
    slug: string;
    plan_type: string | null;
}

interface OrganizationContextType {
    organizationId: string | null;
    organization: Organization | null;
    loading: boolean;
    refreshOrganization: () => Promise<void>;
    setOrganizationId: (id: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [organizationId, setOrgIdState] = useState<string | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchOrganizationDetails = async (orgId: string) => {
        try {
            const { data: org, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', orgId)
                .single();

            if (error) throw error;

            if (org) {
                setOrganization({
                    id: org.id,
                    name: org.name,
                    currency: org.currency || 'MZN',
                    currency_symbol: getCurrencySymbol(org.currency || 'MZN'),
                    slug: org.slug,
                    plan_type: org.plan_type,
                });
            }
        } catch (error) {
            console.error('Error fetching organization details:', error);
        }
    };

    const refreshOrganization = async () => {
        if (!user) {
            setOrgIdState(null);
            setOrganization(null);
            setLoading(false);
            return;
        }

        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('current_organization_id, organization_id')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            const activeOrgId = profile?.current_organization_id || profile?.organization_id;

            if (activeOrgId) {
                setOrgIdState(activeOrgId);
                await fetchOrganizationDetails(activeOrgId);
            } else {
                setOrgIdState(null);
                setOrganization(null);
            }
        } catch (error) {
            console.error('Error refreshing organization:', error);
        } finally {
            setLoading(false);
        }
    };

    const setOrganizationId = async (id: string) => {
        if (!user) return;

        try {
            setLoading(true);
            const { error } = await supabase.rpc('set_current_organization', {
                user_uuid: user.id,
                org_uuid: id
            });

            if (error) throw error;

            setOrgIdState(id);
            await fetchOrganizationDetails(id);

            // Force full page reload to ensure clean workspace state
            window.location.reload();
        } catch (error) {
            console.error('Error setting organization ID:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshOrganization();
    }, [user]);

    return (
        <OrganizationContext.Provider value={{
            organizationId,
            organization,
            loading,
            refreshOrganization,
            setOrganizationId
        }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganizationContext() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganizationContext must be used within an OrganizationProvider');
    }
    return context;
}
