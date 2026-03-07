import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Save, Loader2, User, BookOpen, Upload, FileText, Trash2, Lock, Eye, EyeOff, Phone, AlertTriangle, Sparkles, CreditCard, Plus, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { DocumentTemplatesTab } from '@/components/settings/DocumentTemplatesTab';
import { InvoiceTemplateSettings } from '@/components/settings/InvoiceTemplateSettings';
import { DeleteAgencyModal } from '@/components/settings/DeleteAgencyModal';

interface PaymentMethod {
  id: string;
  provider_name: string;
  account_number: string;
  recipient_name: string;
  is_default: boolean;
}

interface AgencySettings {
  id: string;
  agency_name: string;
  headquarters: string | null;
  nuit: string | null;
  representative_name: string | null;
  representative_position: string | null;
  knowledge_base_url: string | null;
  knowledge_base_name: string | null;
  knowledge_base_text: string | null;
}

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKB, setUploadingKB] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'knowledge' | 'documents'>('profile');

  const [settings, setSettings] = useState<AgencySettings>({
    id: '',
    agency_name: '',
    headquarters: '',
    nuit: '',
    representative_name: '',
    representative_position: '',
    knowledge_base_url: null,
    knowledge_base_name: null,
    knowledge_base_text: null,
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [savingPayment, setSavingPayment] = useState(false);

  // Organization state
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationPhone, setOrganizationPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    avatar_url: null,
    role: 'sales',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user || permissionsLoading) {
      return;
    }

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, permissionsLoading]);


  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role, organization_id, current_organization_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);

        const orgId = data.current_organization_id || data.organization_id;

        if (!orgId) {
          setOrganizationId(null);
          return;
        }

        setOrganizationId(orgId);

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select(
            'id, phone, name, owner_id, headquarters, nuit, representative_name, representative_position, knowledge_base_url, knowledge_base_name, knowledge_base_text, onboarding_completed'
          )
          .eq('id', orgId)
          .single();

        if (orgError) throw orgError;

        // Fetch payment methods
        const { data: paymentData } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('organization_id', orgId)
          .order('is_default', { ascending: false });

        if (paymentData) {
          setPaymentMethods(paymentData);
        }

        if (orgData) {
          setOrganizationPhone(orgData.phone || '');
          setOrganizationName(orgData.name || '');
          setIsOwner(orgData.owner_id === user.id);
          setOnboardingCompleted(orgData.onboarding_completed ?? false);

          setSettings(prev => ({
            ...prev,
            id: orgData.id,
            agency_name: orgData.name || '',
            headquarters: orgData.headquarters || '',
            nuit: orgData.nuit || '',
            representative_name: orgData.representative_name || '',
            representative_position: orgData.representative_position || '',
            knowledge_base_url: orgData.knowledge_base_url || null,
            knowledge_base_name: orgData.knowledge_base_name || null,
            knowledge_base_text: orgData.knowledge_base_text || null,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar o perfil', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAgency = async () => {
    if (!isAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem alterar as configurações da agência',
        variant: 'destructive',
      });
      return;
    }

    if (!organizationId) {
      toast({ title: 'Erro', description: 'Organização não encontrada', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Apenas o nome da agência é obrigatório para o onboarding inicial
      const isComplete = Boolean(settings.agency_name?.trim());

      const { error } = await supabase
        .from('organizations')
        .update({
          name: settings.agency_name.trim(),
          headquarters: settings.headquarters?.trim() || null,
          nuit: settings.nuit?.trim() || null,
          phone: organizationPhone?.trim() || null,
          representative_name: settings.representative_name?.trim() || null,
          representative_position: settings.representative_position?.trim() || null,
          onboarding_completed: isComplete,
        })
        .eq('id', organizationId);

      if (error) throw error;

      setOrganizationName(settings.agency_name.trim());
      setOnboardingCompleted(isComplete);

      toast({
        title: 'Sucesso!',
        description: 'Configurações da agência salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar as configurações', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleKBFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O tamanho máximo é 20MB', variant: 'destructive' });
      return;
    }

    setUploadingKB(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `knowledge-base-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      if (!organizationId) {
        throw new Error('Organização não encontrada');
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          knowledge_base_url: filePath,
          knowledge_base_name: file.name,
        })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      setSettings(prev => ({
        ...prev,
        knowledge_base_url: filePath,
        knowledge_base_name: file.name,
      }));

      toast({ title: 'Sucesso!', description: 'Base de conhecimento carregada' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar o arquivo', variant: 'destructive' });
    } finally {
      setUploadingKB(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteKBFile = async () => {
    if (!isAdmin || !settings.knowledge_base_url) return;

    setUploadingKB(true);
    try {
      await supabase.storage
        .from('knowledge-base')
        .remove([settings.knowledge_base_url]);

      if (!organizationId) {
        throw new Error('Organização não encontrada');
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          knowledge_base_url: null,
          knowledge_base_name: null,
        })
        .eq('id', organizationId);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        knowledge_base_url: null,
        knowledge_base_name: null,
      }));

      toast({ title: 'Sucesso!', description: 'Arquivo removido' });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Erro', description: 'Não foi possível remover o arquivo', variant: 'destructive' });
    } finally {
      setUploadingKB(false);
    }
  };

  const handleSaveKBText = async () => {
    if (!isAdmin) return;

    setSaving(true);
    try {
      if (!organizationId) {
        throw new Error('Organização não encontrada');
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          knowledge_base_text: settings.knowledge_base_text,
        })
        .eq('id', organizationId);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Texto de conhecimento salvo' });
    } catch (error) {
      console.error('Error saving KB text:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o texto', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Perfil atualizado' });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o perfil', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({ title: 'Erro', description: 'Preencha todos os campos de senha', variant: 'destructive' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Senha alterada com sucesso' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar a senha', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/app');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      sales: 'Vendas',
      operations: 'Operações',
      campaign_management: 'Gestor de Campanhas',
    };
    return labels[role] || role;
  };

  const coerceTab = (tab: string | null) => {
    const allowed: Array<'profile' | 'agency' | 'knowledge' | 'documents'> = isAdmin
      ? ['profile', 'agency', 'knowledge', 'documents']
      : ['profile'];

    if (tab && (allowed as string[]).includes(tab)) {
      return tab as (typeof allowed)[number];
    }

    return 'profile' as const;
  };

  const handleTabChange = (next: string) => {
    const nextTab = coerceTab(next);
    setActiveTab(nextTab);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    setActiveTab(coerceTab(searchParams.get('tab')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="shrink-0 p-4 md:px-8 md:pt-8 md:pb-4 bg-background sticky top-0 z-10 border-b border-border md:border-b-0">
        <AnimatedContainer animation="fade-up" className="flex items-center gap-3 md:gap-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold">Configurações</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gerencie as configurações do sistema</p>
          </div>
        </AnimatedContainer>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-4 md:px-8 md:pb-8">
        <div className="max-w-4xl mx-auto">

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className={cn("grid w-full", isAdmin ? "grid-cols-4" : "grid-cols-1")}>
              <TabsTrigger value="profile" className="gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
                <User className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Meu Perfil</span>
                <span className="sm:hidden">Perfil</span>
              </TabsTrigger>
              {isAdmin && (
                <>
                  <TabsTrigger value="agency" className="gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
                    <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Agência</span>
                    <span className="sm:hidden">Agência</span>
                  </TabsTrigger>
                  <TabsTrigger value="knowledge" className="gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
                    <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Conhecimento</span>
                    <span className="sm:hidden">Conhec.</span>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
                    <FileText className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Documentos</span>
                    <span className="sm:hidden">Docs.</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informações Pessoais
                    </CardTitle>
                    <CardDescription>
                      Atualize suas informações de perfil
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        placeholder="Seu nome completo"
                        value={profile.full_name || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Função</Label>
                      <Input
                        id="role"
                        value={getRoleLabel(profile.role)}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">A função só pode ser alterada por administradores</p>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full gap-2">
                      {savingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Salvar Perfil
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Alterar Senha
                    </CardTitle>
                    <CardDescription>
                      Atualize sua senha de acesso
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_password">Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Digite a nova senha"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        placeholder="Confirme a nova senha"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Alterando...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Alterar Senha
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Agency Tab */}
            <TabsContent value="agency">
              {!onboardingCompleted && isAdmin && (
                <Alert className="mb-6 border-primary/50 bg-primary/5">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <AlertTitle className="text-primary">Bem-vindo! Configure sua agência</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    Para começar a usar o sistema, preencha pelo menos o <strong>nome da sua agência</strong> abaixo.
                    Os demais campos são opcionais e podem ser preenchidos depois.
                  </AlertDescription>
                </Alert>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados da Agência
                  </CardTitle>
                  <CardDescription>
                    {isAdmin
                      ? 'Configure as informações básicas da sua agência'
                      : 'Apenas administradores podem alterar estas informações'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="agency_name" className="flex items-center gap-1">
                      Nome da Agência
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="agency_name"
                      placeholder="Ex: Onix Agence"
                      value={settings.agency_name}
                      onChange={(e) => setSettings(prev => ({ ...prev, agency_name: e.target.value }))}
                      disabled={!isAdmin}
                      className={!settings.agency_name?.trim() && !onboardingCompleted ? 'border-destructive' : ''}
                    />
                    {!settings.agency_name?.trim() && !onboardingCompleted && (
                      <p className="text-xs text-destructive">Campo obrigatório</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="headquarters">Sede Social</Label>
                    <Input
                      id="headquarters"
                      placeholder="Ex: Av. Eduardo Mondlane, 123 - Maputo"
                      value={settings.headquarters || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, headquarters: e.target.value }))}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nuit">NUIT</Label>
                      <Input
                        id="nuit"
                        placeholder="Ex: 123456789"
                        value={settings.nuit || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, nuit: e.target.value }))}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contacto da Agência
                      </Label>
                      <PhoneInput
                        value={organizationPhone}
                        onChange={setOrganizationPhone}
                        placeholder="+258 84 123 4567"
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="representative_name">Nome do Representante</Label>
                      <Input
                        id="representative_name"
                        placeholder="Ex: João Silva"
                        value={settings.representative_name || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, representative_name: e.target.value }))}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="representative_position">Cargo do Representante</Label>
                      <Input
                        id="representative_position"
                        placeholder="Ex: Diretor Geral"
                        value={settings.representative_position || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, representative_position: e.target.value }))}
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  {/* Dados de Pagamento */}
                  <div className="pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Dados de Pagamento
                      </h3>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPaymentMethods(prev => [...prev, {
                              id: `new-${Date.now()}`,
                              provider_name: '',
                              account_number: '',
                              recipient_name: '',
                              is_default: prev.length === 0
                            }]);
                          }}
                          className="gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Informações exibidas nas facturas de prestação de serviços
                    </p>

                    {paymentMethods.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum método de pagamento adicionado
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {paymentMethods.map((method, index) => (
                          <div key={method.id} className="p-3 border border-border rounded-lg space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <Input
                                placeholder="Provedora (M-Pesa, BCI...)"
                                value={method.provider_name}
                                onChange={(e) => {
                                  const updated = [...paymentMethods];
                                  updated[index].provider_name = e.target.value;
                                  setPaymentMethods(updated);
                                }}
                                disabled={!isAdmin}
                              />
                              <Input
                                placeholder="Número de Conta"
                                value={method.account_number}
                                onChange={(e) => {
                                  const updated = [...paymentMethods];
                                  updated[index].account_number = e.target.value;
                                  setPaymentMethods(updated);
                                }}
                                disabled={!isAdmin}
                              />
                              <Input
                                placeholder="Destinatário"
                                value={method.recipient_name || ''}
                                onChange={(e) => {
                                  const updated = [...paymentMethods];
                                  updated[index].recipient_name = e.target.value;
                                  setPaymentMethods(updated);
                                }}
                                disabled={!isAdmin}
                              />
                            </div>
                            {isAdmin && (
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const methodId = method.id;
                                    if (!methodId.startsWith('new-')) {
                                      await supabase.from('payment_methods').delete().eq('id', methodId);
                                    }
                                    setPaymentMethods(prev => prev.filter(m => m.id !== methodId));
                                  }}
                                  className="text-muted-foreground hover:text-destructive gap-1"
                                >
                                  <X className="h-4 w-4" />
                                  Remover
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isAdmin && paymentMethods.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={savingPayment}
                        onClick={async () => {
                          if (!organizationId) return;
                          setSavingPayment(true);
                          try {
                            for (const method of paymentMethods) {
                              if (method.id.startsWith('new-')) {
                                await supabase.from('payment_methods').insert({
                                  organization_id: organizationId,
                                  provider_name: method.provider_name,
                                  account_number: method.account_number,
                                  recipient_name: method.recipient_name || null,
                                  is_default: method.is_default
                                });
                              } else {
                                await supabase.from('payment_methods').update({
                                  provider_name: method.provider_name,
                                  account_number: method.account_number,
                                  recipient_name: method.recipient_name || null,
                                }).eq('id', method.id);
                              }
                            }
                            // Refresh
                            const { data } = await supabase.from('payment_methods').select('*').eq('organization_id', organizationId).order('is_default', { ascending: false });
                            if (data) setPaymentMethods(data);
                            toast({ title: 'Sucesso!', description: 'Métodos de pagamento salvos' });
                          } catch (error) {
                            console.error(error);
                            toast({ title: 'Erro', description: 'Não foi possível salvar', variant: 'destructive' });
                          } finally {
                            setSavingPayment(false);
                          }
                        }}
                        className="mt-3 gap-2"
                      >
                        {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Métodos de Pagamento
                      </Button>
                    )}
                  </div>

                  {isAdmin && (
                    <Button onClick={handleSaveAgency} disabled={saving} className="w-full gap-2">
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Salvar Configurações
                        </>
                      )}
                    </Button>
                  )}

                  {/* Delete Agency Section - Only for owner */}
                  {isAdmin && isOwner && organizationId && (
                    <div className="pt-6 border-t border-border">
                      <Card className="border-destructive/50 bg-destructive/5">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-destructive flex items-center gap-2 text-base">
                            <AlertTriangle className="h-5 w-5" />
                            Zona de Perigo
                          </CardTitle>
                          <CardDescription>
                            Ações irreversíveis para sua agência
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6">
                          <Button
                            variant="destructive"
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full gap-2 text-xs sm:text-sm"
                          >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">Apagar Agência Permanentemente</span>
                            <span className="sm:hidden">Apagar Agência</span>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Knowledge Base Tab */}
            <TabsContent value="knowledge">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Documento PDF
                    </CardTitle>
                    <CardDescription>
                      {isAdmin
                        ? 'Carregue um documento PDF como base de conhecimento para o Agente de IA'
                        : 'Apenas administradores podem alterar a base de conhecimento'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settings.knowledge_base_url ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{settings.knowledge_base_name}</p>
                            <p className="text-sm text-muted-foreground">Documento atual</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingKB}
                              className="flex-1 gap-2"
                            >
                              {uploadingKB ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              Alterar
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDeleteKBFile}
                              disabled={uploadingKB}
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remover
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed border-border rounded-lg p-8 text-center ${isAdmin ? 'cursor-pointer hover:border-primary/50' : 'opacity-50'} transition-colors`}
                        onClick={() => isAdmin && fileInputRef.current?.click()}
                      >
                        {uploadingKB ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Carregando...</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">Clique para carregar</p>
                            <p className="text-xs text-muted-foreground mt-1">PDF (máx 20MB)</p>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleKBFileUpload}
                      className="hidden"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Texto de Conhecimento
                    </CardTitle>
                    <CardDescription>
                      {isAdmin
                        ? 'Digite informações adicionais que o Agente de IA deve conhecer sobre a agência'
                        : 'Apenas administradores podem alterar o texto de conhecimento'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Ex: Nossa agência foi fundada em 2015 e é especializada em marketing digital para PMEs em Moçambique. Nossos principais serviços incluem gestão de redes sociais, tráfego pago e criação de conteúdo..."
                      value={settings.knowledge_base_text || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, knowledge_base_text: e.target.value }))}
                      disabled={!isAdmin}
                      rows={8}
                    />
                    {isAdmin && (
                      <Button onClick={handleSaveKBText} disabled={saving} className="w-full gap-2">
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Salvar Texto
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <div className="space-y-6">
                <InvoiceTemplateSettings organizationId={organizationId} />
                <DocumentTemplatesTab />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete Agency Modal */}
      {organizationId && (
        <DeleteAgencyModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          organizationId={organizationId}
          organizationName={organizationName}
        />
      )}
    </div>
  );
}
