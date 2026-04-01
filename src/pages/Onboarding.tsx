import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ArrowRight, Globe, LogOut, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { COUNTRIES } from '@/lib/currencies';
import { CITIES_BY_COUNTRY } from '@/lib/locations';
import { useDraft } from '@/hooks/useDraft';
import { useState, useMemo } from 'react';
import { PublicBackground } from '@/components/layout/PublicBackground';

interface OnboardingFormData {
  agencyName: string;
  selectedCountry: string;
  selectedCity: string;
}

export default function Onboarding() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingOrg, setCheckingOrg] = useState(true);

  const {
    value: formData,
    setValue: setFormData,
    clearDraft,
  } = useDraft<OnboardingFormData>({
    key: 'onboarding_form',
    initialValue: { 
      agencyName: '', 
      selectedCountry: 'MZ',
      selectedCity: ''
    },
    storage: 'local',
    lazy: true,
  });

  const availableCities = useMemo(() => {
    return CITIES_BY_COUNTRY[formData.selectedCountry] || [];
  }, [formData.selectedCountry]);

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
          // Check if org has a proper name and if user is the owner
          const { data: org } = await supabase
            .from('organizations')
            .select('onboarding_completed, owner_id')
            .eq('id', profile.organization_id)
            .single();

          // Only auto-redirect to dashboard if they are the owner and it's complete
          // This allows collaborators to proceed to create their own agency if they wish
          if (org?.onboarding_completed && org?.owner_id === user.id) {
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

    if (!formData.agencyName.trim()) {
      toast.error('Por favor, insira o nome da sua agência');
      return;
    }

    if (!formData.selectedCountry) {
      toast.error('Por favor, selecione o seu país');
      return;
    }

    if (!formData.selectedCity) {
      toast.error('Por favor, selecione a sua cidade/província');
      return;
    }

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

      // Check if user already owns an organization
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', sessionUser.id)
        .maybeSingle();

      // Get country data
      const country = COUNTRIES.find(c => c.code === formData.selectedCountry);
      const cityName = availableCities.find(c => c.code === formData.selectedCity)?.name || formData.selectedCity;
      const currency = country?.currency || 'MZN';
      const countryName = country?.name || formData.selectedCountry;

      let organizationId = ownedOrg?.id;

      // If user doesn't own an organization, create one
      if (!organizationId) {
        const { data: slugData } = await supabase.rpc('generate_slug', { name: formData.agencyName.trim() });
        const slug = slugData || `agency-${Date.now()}`;

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.agencyName.trim(),
            slug: slug,
            owner_id: sessionUser.id,
            currency: currency,
            onboarding_completed: true,
            country: countryName,
            city: cityName,
            headquarters: `${cityName}, ${countryName}`,
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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
              current_organization_id: organizationId,
              account_type: 'owner',
            },
            { onConflict: 'id' }
          );

        if (profileUpsertError) throw profileUpsertError;

        // Add user to organization_members
        const { error: memberError } = await supabase
          .from('organization_members')
          .upsert(
            {
              user_id: sessionUser.id,
              organization_id: organizationId,
              role: 'Owner',
              is_active: true,
            },
            { onConflict: 'user_id,organization_id' }
          );

        if (memberError) throw memberError;
      } else {
        // Update existing organization with name and currency
        const { data: slug } = await supabase.rpc('generate_slug', { name: formData.agencyName.trim() });

        const { error } = await supabase
          .from('organizations')
          .update({
            name: formData.agencyName.trim(),
            slug: slug || `agency-${Date.now()}`,
            currency: currency,
            onboarding_completed: true,
            country: countryName,
            city: cityName,
            headquarters: `${cityName}, ${countryName}`,
          })
          .eq('id', organizationId);

        if (error) throw error;

        // Ensure user is in organization_members
        const { error: memberError } = await supabase
          .from('organization_members')
          .upsert(
            {
              user_id: sessionUser.id,
              organization_id: organizationId,
              role: 'Owner',
              is_active: true,
            },
            { onConflict: 'user_id,organization_id' }
          );

        if (memberError) throw memberError;

        // Ensure current_organization_id is set
        await supabase
          .from('profiles')
          .update({
            current_organization_id: organizationId,
            account_type: 'owner'
          })
          .eq('id', sessionUser.id);
      }

      // Organization already has plan_type set (agency for trial or existing)
      // No need to override to free here

      clearDraft();
      toast.success('Agência configurada com sucesso!');

      // Check if user has active subscription, if not redirect to select-plan
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organization_id', organizationId!)
        .maybeSingle();

      if (sub?.status === 'active' || sub?.status === 'trialing') {
        navigate('/app');
      } else {
        navigate('/select-plan');
      }
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
    <PublicBackground>
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/10 transition-all shadow-sm"
            onClick={() => signOut()}
            disabled={isSubmitting}
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Configure sua Agência</CardTitle>
            <CardDescription>
              Configure sua agência para começar a usar o Qualify
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
                  value={formData.agencyName}
                  onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
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
                <Select 
                  value={formData.selectedCountry} 
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    selectedCountry: value,
                    selectedCity: '' // Reset city when country changes
                  })} 
                  disabled={isSubmitting}
                >
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

              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Cidade/Província
                </Label>
                <Select 
                  value={formData.selectedCity} 
                  onValueChange={(value) => setFormData({ ...formData, selectedCity: value })} 
                  disabled={isSubmitting || availableCities.length === 0}
                >
                  <SelectTrigger id="city">
                    <SelectValue placeholder={formData.selectedCountry ? "Selecione a sua cidade" : "Selecione o país primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((city) => (
                      <SelectItem key={city.code} value={city.code}>
                        {city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Selecione a localização da sua sede principal
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !formData.agencyName.trim()}
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
    </PublicBackground>
  );
}
