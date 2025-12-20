import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ArrowRight, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { COUNTRIES } from '@/lib/currencies';

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [agencyName, setAgencyName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('MZ');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingOrg, setCheckingOrg] = useState(true);

  // Check if returning from successful payment
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast.success('Pagamento realizado com sucesso! Configure sua agência.');
      // Remove success param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    // Check if user already has organization setup
    const checkOrganization = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.organization_id) {
          // Check if org has a proper name
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', profile.organization_id)
            .single();
          
          // If organization has a real name, redirect to dashboard
          const hasProperName = org && !org.name.includes("'s Agency") && org.name !== 'Agency';
          
          if (hasProperName) {
            navigate('/app');
          }
        }
      } catch (error) {
        console.error('Error checking organization:', error);
      } finally {
        setCheckingOrg(false);
      }
    };

    if (user) {
      checkOrganization();
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agencyName.trim()) {
      toast.error('Por favor, insira o nome da sua agência');
      return;
    }

    // A validação de sessão é feita dentro do try (cobre casos de login social)

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user;

      if (!sessionUser) {
        toast.error('Sua sessão expirou. Entre novamente para continuar.');
        setIsSubmitting(false);
        navigate('/auth');
        return;
      }

      if (!sessionUser.email) {
        throw new Error('Não foi possível obter seu e-mail do login. Tente novamente.');
      }

      // Get user's profile to find organization_id (may not exist for first social login)
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', sessionUser.id)
        .maybeSingle();

      // Get country currency
      const country = COUNTRIES.find(c => c.code === selectedCountry);
      const currency = country?.currency || 'MZN';

      let organizationId = profile?.organization_id;

      // If user doesn't have an organization (e.g., social login), create one
      if (!organizationId) {
        const { data: slugData } = await supabase.rpc('generate_slug', { name: agencyName.trim() });
        const slug = slugData || `agency-${Date.now()}`;

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: agencyName.trim(),
            slug: slug,
            owner_id: sessionUser.id,
            currency: currency,
            // Plan is set by webhook after checkout
          })
          .select()
          .single();

        if (orgError) throw orgError;

        organizationId = orgData.id;

        // Ensure profile exists and has organization_id
        const { error: profileUpsertError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: sessionUser.id,
              email: sessionUser.email,
              full_name: (sessionUser.user_metadata as any)?.full_name ?? null,
              organization_id: organizationId,
            },
            { onConflict: 'id' }
          );

        if (profileUpsertError) throw profileUpsertError;
      } else {
        // Update existing organization with name and currency
        const { data: slug } = await supabase.rpc('generate_slug', { name: agencyName.trim() });

        const { error } = await supabase
          .from('organizations')
          .update({ 
            name: agencyName.trim(),
            slug: slug || `agency-${Date.now()}`,
            currency: currency
          })
          .eq('id', organizationId);

        if (error) throw error;
      }

      // Organization already has plan_type set (agency for trial or existing)
      // No need to override to free here

      toast.success('Agência configurada com sucesso!');
      navigate('/app');
    } catch (error: any) {
      console.error('Error in onboarding:', error);
      toast.error(error.message || 'Erro ao configurar agência. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  if (authLoading || checkingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configure sua Agência</CardTitle>
          <CardDescription>
            Configure sua agência e comece a usar gratuitamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="agencyName">Nome da Agência</Label>
              <Input
                id="agencyName"
                type="text"
                placeholder="Ex: Marketing Digital Pro"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                disabled={isSubmitting}
                maxLength={100}
                required
              />
              <p className="text-sm text-muted-foreground">
                Este será o nome exibido em toda a plataforma
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                País
              </Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o seu país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.currencySymbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                A moeda será definida automaticamente com base no país selecionado
              </p>
            </div>

            <Button
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !agencyName.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                  Configurando...
                </>
              ) : (
                <>
                  Começar Agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
