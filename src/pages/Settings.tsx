import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Save, Loader2, User, BookOpen, Upload, FileText, Trash2, Lock, Eye, EyeOff, Phone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { useAuth } from '@/contexts/AuthContext';
import { ContractTemplatesTab } from '@/components/settings/ContractTemplatesTab';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingKB, setUploadingKB] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Organization phone state
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationPhone, setOrganizationPhone] = useState('');

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
    fetchSettings();
    fetchProfile();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as configurações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role, organization_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setIsAdmin(data.role === 'admin');
        
        // Fetch organization phone
        if (data.organization_id) {
          setOrganizationId(data.organization_id);
          const { data: orgData } = await supabase
            .from('organizations')
            .select('phone')
            .eq('id', data.organization_id)
            .single();
          
          if (orgData?.phone) {
            setOrganizationPhone(orgData.phone);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSaveAgency = async () => {
    if (!isAdmin) {
      toast({ title: 'Acesso negado', description: 'Apenas administradores podem alterar as configurações da agência', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Save agency settings
      const { error } = await supabase
        .from('agency_settings')
        .update({
          agency_name: settings.agency_name,
          headquarters: settings.headquarters,
          nuit: settings.nuit,
          representative_name: settings.representative_name,
          representative_position: settings.representative_position,
        })
        .eq('id', settings.id);

      if (error) throw error;

      // Save organization phone
      if (organizationId) {
        const { error: orgError } = await supabase
          .from('organizations')
          .update({ phone: organizationPhone })
          .eq('id', organizationId);
        
        if (orgError) throw orgError;
      }

      toast({ title: 'Sucesso!', description: 'Configurações da agência salvas' });
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

      const { error: updateError } = await supabase
        .from('agency_settings')
        .update({
          knowledge_base_url: filePath,
          knowledge_base_name: file.name,
        })
        .eq('id', settings.id);

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

      const { error } = await supabase
        .from('agency_settings')
        .update({
          knowledge_base_url: null,
          knowledge_base_name: null,
        })
        .eq('id', settings.id);

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
      const { error } = await supabase
        .from('agency_settings')
        .update({
          knowledge_base_text: settings.knowledge_base_text,
        })
        .eq('id', settings.id);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <AnimatedContainer animation="fade-up" className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold">Configurações</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie as configurações do sistema</p>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fade-up" delay={0.1}>
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
            <User className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Meu Perfil</span>
            <span className="sm:hidden">Perfil</span>
          </TabsTrigger>
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
          <TabsTrigger value="contracts" className="gap-1 md:gap-2 text-xs md:text-sm px-1 md:px-2">
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Contratos</span>
            <span className="sm:hidden">Contr.</span>
          </TabsTrigger>
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
                <Label htmlFor="agency_name">Nome da Agência</Label>
                <Input
                  id="agency_name"
                  placeholder="Ex: Onix Agence"
                  value={settings.agency_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, agency_name: e.target.value }))}
                  disabled={!isAdmin}
                />
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

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <ContractTemplatesTab />
        </TabsContent>
      </Tabs>
      </AnimatedContainer>
    </div>
  );
}
