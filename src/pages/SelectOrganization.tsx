import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, ChevronRight, LogOut } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PublicBackground } from '@/components/layout/PublicBackground';

interface Organization {
  organization_id: string;
  organization_name: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  sales: 'Vendas',
  operations: 'Operações',
  campaign_management: 'Gestão de Campanhas',
  admin: 'Administrador',
};

export default function SelectOrganization() {
  const navigate = useNavigate();
  const { user, signOut, clearNewLoginFlag } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sair da aplicação',
        variant: 'destructive',
      });
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    if (!user) return;

    try {
      // Use the database function to get user's organizations
      const { data, error } = await supabase.rpc('get_user_organizations', {
        user_uuid: user.id
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        // No organizations - still show the screen so they can click "Create New Agency"
        setOrganizations([]);
      } else {
        setOrganizations(data);
      }

      // Check if user is an owner via their profile account_type OR if they have an Owner role in any org
      const hasOwnerRole = data?.some(org => org.role?.toLowerCase() === 'owner');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .maybeSingle();

      if (hasOwnerRole || (!profileError && profile?.account_type === 'owner')) {
        setIsOwner(true);
      }

    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar suas organizações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = async (orgId: string) => {
    if (!user) return;

    setSelecting(orgId);
    try {
      // 1. Set current organization
      const { data, error } = await supabase.rpc('set_current_organization', {
        user_uuid: user.id,
        org_uuid: orgId
      });

      if (error) throw error;
      if (!data) throw new Error('Não foi possível selecionar a organização');

      // 2. Check subscription status BEFORE entering /app
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organization_id', orgId)
        .maybeSingle();

      const hasAccess = subData?.status === 'active' || subData?.status === 'trialing';
      
      clearNewLoginFlag();

      // Always clear cache before navigation to prevent stale state loops
      const cacheKey = `sub_cache_${user.id}_${orgId}`;
      sessionStorage.removeItem(cacheKey);

      if (!hasAccess) {
        // Redirect directly to plan selection without going through ProtectedRoute
        window.location.href = '/select-plan';
      } else {
        // Navigate to dashboard with full page reload to ensure clean workspace state
        window.location.href = '/app';
      }
    } catch (error) {
      console.error('Error selecting organization:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível selecionar a organização',
        variant: 'destructive',
      });
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando suas agências...</p>
          </div>
        </div>
      </PublicBackground>
    );
  }

  return (
    <PublicBackground>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">Q</span>
            </div>
            <CardTitle className="text-2xl">Selecione uma Agência</CardTitle>
            <CardDescription>
              Escolha a agência que deseja acessar ou crie uma nova.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.map((org) => (
              <Button
                key={org.organization_id}
                variant="outline"
                className="w-full h-auto py-4 px-4 justify-between"
                onClick={() => selectOrganization(org.organization_id)}
                disabled={selecting !== null || loggingOut}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{org.organization_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[org.role] || org.role}
                    </p>
                  </div>
                </div>
                {selecting === org.organization_id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ))}

            {!isOwner && (
              <>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                <Button
                  variant="default"
                  className="w-full h-auto py-4 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    clearNewLoginFlag();
                    navigate('/app/onboarding');
                  }}
                  disabled={selecting !== null || loggingOut}
                >
                  Criar Nova Agência
                </Button>
              </>
            )}
          </CardContent>

          <CardFooter className="flex justify-center pt-4 border-t">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive gap-2"
              onClick={handleLogout}
              disabled={loggingOut || selecting !== null}
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sair da Aplicação
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PublicBackground>
  );
}
