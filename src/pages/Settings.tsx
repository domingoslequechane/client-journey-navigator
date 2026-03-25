import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useHeader } from '@/contexts/HeaderContext';
import { usePermissions } from '@/hooks/usePermissions';
import { InvoiceTemplateSettings } from '@/components/settings/InvoiceTemplateSettings';
import { DocumentTemplatesTab } from '@/components/settings/DocumentTemplatesTab';
import { DeleteAgencyModal } from '@/components/settings/DeleteAgencyModal';
import { AgencyOnboardingModal } from '@/components/settings/AgencyOnboardingModal';
import {
  User, Building2, BookOpen, FileText, ArrowLeft,
  Save, Loader2, Upload, Trash2, Lock, Eye, EyeOff,
  Phone, AlertTriangle, CreditCard, Plus, X,
  Settings as SettingsIcon, Check, Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ─── Module-level cache ───────────────────────────────────────────────────────
// Stored outside React so it survives component unmounts (e.g. switching OS windows).
// Cleared only on explicit user logout.
let _cache: SettingsCache | null = null;

interface PaymentMethod {
  id: string;
  provider_name: string;
  account_number: string;
  recipient_name: string;
  is_default: boolean;
}

interface SettingsCache {
  profile: {
    full_name: string | null;
    role: string;
  };
  org: {
    id: string;
    name: string;
    phone: string;
    headquarters: string | null;
    nuit: string | null;
    representative_name: string | null;
    representative_position: string | null;
    knowledge_base_url: string | null;
    knowledge_base_name: string | null;
    knowledge_base_text: string | null;
    owner_id: string;
    onboarding_completed: boolean;
  } | null;
  paymentMethods: PaymentMethod[];
}

// ─── Nav items ────────────────────────────────────────────────────────────────
type NavSection = 'profile' | 'agency' | 'knowledge' | 'documents';

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ReactNode; adminOnly?: boolean; badge?: string }[] = [
  { id: 'profile',    label: 'Meu Perfil',        icon: <User className="h-4 w-4" /> },
  { id: 'agency',     label: 'Agência',            icon: <Building2 className="h-4 w-4" />, adminOnly: true },
  { id: 'knowledge',  label: 'Base de Conhecimento', icon: <BookOpen className="h-4 w-4" />, adminOnly: true },
  { id: 'documents',  label: 'Documentos',         icon: <FileText className="h-4 w-4" />, adminOnly: true, badge: 'BETA' },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setBackAction } = useHeader();

  // ─ UI state
  const [activeSection, setActiveSection] = useState<NavSection>('profile');
  const [loading, setLoading] = useState(true);

  // ─ Form state – initialized from cache if available
  const [profile, setProfile] = useState({ full_name: '', role: 'sales' });
  const [org, setOrg] = useState<SettingsCache['org'] | null>(null);
  const [orgPhone, setOrgPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [kbText, setKbText] = useState('');
  const [kbFileName, setKbFileName] = useState<string | null>(null);
  const [kbFileUrl, setKbFileUrl] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasShownOnboardingModal, setHasShownOnboardingModal] = useState(false);

  // ─ Saving state
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAgency, setSavingAgency] = useState(false);
  const [savingKB, setSavingKB] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [uploadingKB, setUploadingKB] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Section from URL ──────────────────────────────────────────────────────
  useEffect(() => {
    const tab = searchParams.get('tab') as NavSection | null;
    const allowed: NavSection[] = isAdmin
      ? ['profile', 'agency', 'knowledge', 'documents']
      : ['profile'];
    if (tab && allowed.includes(tab)) setActiveSection(tab);
  }, [isAdmin, searchParams]);

  const goTo = (section: NavSection) => {
    setActiveSection(section);
    const p = new URLSearchParams(searchParams);
    p.set('tab', section);
    setSearchParams(p, { replace: true });
  };

  // ─── Back button ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (window.history.length > 2) navigate(-1);
    else navigate('/app');
  }, [navigate]);

  useEffect(() => {
    setBackAction(() => handleBack);
    return () => setBackAction(null);
  }, [setBackAction, handleBack]);

  // ─── Data fetch — uses module cache, only hits DB once per session ─────────
  useEffect(() => {
    if (!user || permissionsLoading) return;

    if (_cache) {
      // Restore from cache — no DB call needed
      setProfile({ full_name: _cache.profile.full_name || '', role: _cache.profile.role });
      setOrg(_cache.org);
      setOrgPhone(_cache.org?.phone || '');
      setOrgName(_cache.org?.name || '');
      setPaymentMethods(_cache.paymentMethods);
      setKbText(_cache.org?.knowledge_base_text || '');
      setKbFileName(_cache.org?.knowledge_base_name || null);
      setKbFileUrl(_cache.org?.knowledge_base_url || null);
      setIsOwner(_cache.org?.owner_id === user.id);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role, organization_id, current_organization_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        const orgId = profileData?.current_organization_id || profileData?.organization_id;

        let orgData: SettingsCache['org'] = null;
        let payments: PaymentMethod[] = [];

        if (orgId) {
          const { data: o, error: oErr } = await supabase
            .from('organizations')
            .select('id, phone, name, owner_id, headquarters, nuit, representative_name, representative_position, knowledge_base_url, knowledge_base_name, knowledge_base_text, onboarding_completed')
            .eq('id', orgId)
            .single();
          if (!oErr && o) orgData = o as SettingsCache['org'];

          const { data: pm } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('organization_id', orgId)
            .order('is_default', { ascending: false });
          if (pm) payments = pm;
        }

        // Write to module-level cache
        _cache = {
          profile: { full_name: profileData?.full_name || null, role: profileData?.role || 'sales' },
          org: orgData,
          paymentMethods: payments,
        };

        setProfile({ full_name: profileData?.full_name || '', role: profileData?.role || 'sales' });
        setOrg(orgData);
        setOrgPhone(orgData?.phone || '');
        setOrgName(orgData?.name || '');
        setPaymentMethods(payments);
        setKbText(orgData?.knowledge_base_text || '');
        setKbFileName(orgData?.knowledge_base_name || null);
        setKbFileUrl(orgData?.knowledge_base_url || null);
        setIsOwner(orgData?.owner_id === user.id);
      } catch (err) {
        console.error(err);
        toast({ title: 'Erro', description: 'Não foi possível carregar as configurações.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, permissionsLoading]);

  // Handle onboarding modal trigger
  useEffect(() => {
    // Only show modal if:
    // 1. Data has loaded (loading is false)
    // 2. Org exists
    // 3. Onboarding is NOT completed
    // 4. We haven't shown it yet in this session
    // 5. We are in the agency section
    if (!loading && org && !org.onboarding_completed && !hasShownOnboardingModal && activeSection === 'agency') {
      setShowOnboardingModal(true);
      setHasShownOnboardingModal(true);
    }
  }, [loading, org, activeSection, hasShownOnboardingModal]);

  // ─── Save profile ─────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', user.id);
      if (error) throw error;
      if (_cache) _cache.profile.full_name = profile.full_name;
      toast({ title: 'Perfil actualizado!' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível actualizar o perfil.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Change password ──────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      toast({ title: 'Senha alterada com sucesso!' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível alterar a senha.', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  // ─── Save agency ──────────────────────────────────────────────────────────
  const handleSaveAgency = async () => {
    if (!org?.id || !isAdmin) return;
    
    if (!orgName.trim()) {
      toast({ title: 'Erro', description: 'O nome da agência é obrigatório.', variant: 'destructive' });
      return;
    }

    setSavingAgency(true);
    const wasJustOnboarding = !org.onboarding_completed;

    try {
      const { error } = await supabase.from('organizations').update({
        name: orgName.trim(),
        phone: orgPhone.trim() || null,
        headquarters: org.headquarters?.trim() || null,
        nuit: org.nuit?.trim() || null,
        representative_name: org.representative_name?.trim() || null,
        representative_position: org.representative_position?.trim() || null,
        onboarding_completed: true,
      }).eq('id', org.id);

      if (error) throw error;
      
      const updatedOrg = { 
        ...org, 
        name: orgName, 
        phone: orgPhone, 
        onboarding_completed: true 
      };
      
      setOrg(updatedOrg);
      if (_cache) _cache.org = updatedOrg;

      if (wasJustOnboarding) {
        toast({ 
          title: 'Configuração concluída!', 
          description: 'A sua agência foi configurada e o acesso total foi desbloqueado.' 
        });
      } else {
        toast({ title: 'Agência actualizada!' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível guardar.', variant: 'destructive' });
    } finally {
      setSavingAgency(false);
    }
  };

  // ─── Payment methods ──────────────────────────────────────────────────────
  const handleSavePayments = async () => {
    if (!org?.id) return;
    setSavingPayment(true);
    try {
      for (const m of paymentMethods) {
        if (m.id.startsWith('new-')) {
          await supabase.from('payment_methods').insert({
            organization_id: org.id,
            provider_name: m.provider_name,
            account_number: m.account_number,
            recipient_name: m.recipient_name || null,
            is_default: m.is_default,
          });
        } else {
          await supabase.from('payment_methods').update({
            provider_name: m.provider_name,
            account_number: m.account_number,
            recipient_name: m.recipient_name || null,
          }).eq('id', m.id);
        }
      }
      const { data } = await supabase.from('payment_methods').select('*').eq('organization_id', org.id).order('is_default', { ascending: false });
      if (data) {
        setPaymentMethods(data);
        if (_cache) _cache.paymentMethods = data;
      }
      toast({ title: 'Métodos de pagamento guardados!' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível guardar.', variant: 'destructive' });
    } finally {
      setSavingPayment(false);
    }
  };

  // ─── Knowledge base ────────────────────────────────────────────────────────
  const handleSaveKBText = async () => {
    if (!org?.id) return;
    setSavingKB(true);
    try {
      const { error } = await supabase.from('organizations').update({ knowledge_base_text: kbText }).eq('id', org.id);
      if (error) throw error;
      if (_cache?.org) _cache.org.knowledge_base_text = kbText;
      toast({ title: 'Texto de conhecimento guardado!' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível guardar.', variant: 'destructive' });
    } finally {
      setSavingKB(false);
    }
  };

  const handleKBUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org?.id) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 20MB', variant: 'destructive' });
      return;
    }
    setUploadingKB(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `knowledge-base-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('knowledge-base').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error: updateErr } = await supabase.from('organizations').update({ knowledge_base_url: path, knowledge_base_name: file.name }).eq('id', org.id);
      if (updateErr) throw updateErr;
      setKbFileUrl(path);
      setKbFileName(file.name);
      if (_cache?.org) { _cache.org.knowledge_base_url = path; _cache.org.knowledge_base_name = file.name; }
      toast({ title: 'Documento carregado!' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar.', variant: 'destructive' });
    } finally {
      setUploadingKB(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteKB = async () => {
    if (!org?.id || !kbFileUrl) return;
    setUploadingKB(true);
    try {
      await supabase.storage.from('knowledge-base').remove([kbFileUrl]);
      await supabase.from('organizations').update({ knowledge_base_url: null, knowledge_base_name: null }).eq('id', org.id);
      setKbFileUrl(null);
      setKbFileName(null);
      if (_cache?.org) { _cache.org.knowledge_base_url = null; _cache.org.knowledge_base_name = null; }
      toast({ title: 'Documento removido.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível remover.', variant: 'destructive' });
    } finally {
      setUploadingKB(false);
    }
  };

  const roleLabel: Record<string, string> = {
    admin: 'Administrador', sales: 'Vendas',
    operations: 'Operações', campaign_management: 'Gestor de Campanhas',
  };

  // ─── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">A carregar configurações…</p>
        </div>
      </div>
    );
  }

  const visibleNav = NAV_ITEMS.filter(n => !n.adminOnly || isAdmin);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-background">
      {/* ── Top Header (desktop only) ── */}


      {/* ── Body: sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="hidden md:flex w-56 flex-col gap-1 border-r border-border px-3 py-4 bg-muted/20 shrink-0">
          {visibleNav.map(item => (
            <button
              key={item.id}
              onClick={() => goTo(item.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left justify-between',
                activeSection === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </div>
              {item.badge && (
                <Badge variant="secondary" className="text-[9px] px-1.5 h-4 font-bold bg-primary/10 text-primary border-none uppercase">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </aside>

        {/* Mobile top tabs */}
        <div className="md:hidden flex gap-1 overflow-x-auto px-4 py-3 border-b border-border shrink-0 bg-background w-full">
          {visibleNav.map(item => (
            <button
              key={item.id}
              onClick={() => goTo(item.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                activeSection === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <div className="flex items-center gap-1.5">
                {item.icon}
                {item.label}
                {item.badge && (
                  <Badge variant="secondary" className="text-[8px] px-1 h-3 font-bold bg-primary/10 text-primary border-none uppercase">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="py-6 px-4 md:px-8 w-full">

            {/* ── Profile ── */}
            {activeSection === 'profile' && (
              <div className="space-y-6 animate-fade-in">
                <SectionHeader
                  icon={<User className="h-5 w-5" />}
                  title="Meu Perfil"
                  subtitle="Gerencie as suas informações pessoais"
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <SettingsCard title="Informações Pessoais" icon={<User className="h-4 w-4" />}>
                    <FieldGroup>
                      <Field label="Email">
                        <Input value={user?.email || ''} disabled className="bg-muted/50 opacity-70" />
                        <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                      </Field>
                      <Field label="Nome Completo">
                        <Input
                          placeholder="O seu nome completo"
                          value={profile.full_name || ''}
                          onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
                        />
                      </Field>
                      <Field label="Função">
                        <Input value={roleLabel[profile.role] || profile.role} disabled className="bg-muted/50 opacity-70" />
                      </Field>
                    </FieldGroup>
                    <ActionRow>
                      <SaveButton loading={savingProfile} onClick={handleSaveProfile} label="Guardar Perfil" />
                    </ActionRow>
                  </SettingsCard>

                  <SettingsCard title="Alterar Senha" icon={<Lock className="h-4 w-4" />}>
                    <FieldGroup>
                      <Field label="Nova Senha">
                        <div className="relative">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="mínimo 6 caracteres"
                            value={passwordForm.newPassword}
                            onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </Field>
                      <Field label="Confirmar Senha">
                        <Input
                          type="password"
                          placeholder="Confirme a nova senha"
                          value={passwordForm.confirmPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        />
                      </Field>
                    </FieldGroup>
                    <ActionRow>
                      <SaveButton loading={changingPassword} onClick={handleChangePassword} label="Alterar Senha" icon={<Shield className="h-4 w-4" />} />
                    </ActionRow>
                  </SettingsCard>
                </div>
              </div>
            )}

            {/* ── Agency ── */}
            {activeSection === 'agency' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <SectionHeader
                  icon={<Building2 className="h-5 w-5" />}
                  title="Dados da Agência"
                  subtitle="Informações que aparecem nos documentos gerados"
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <SettingsCard title="Identificação" icon={<Building2 className="h-4 w-4" />}>
                    <FieldGroup>
                      <Field label="Nome da Agência *">
                        <Input
                          placeholder="Ex: Onix Agência"
                          value={orgName}
                          onChange={e => setOrgName(e.target.value)}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="NUIT">
                          <Input
                            placeholder="Ex: 400123987"
                            value={org?.nuit || ''}
                            onChange={e => setOrg(o => o ? ({ ...o, nuit: e.target.value }) : o)}
                          />
                        </Field>
                        <Field label="Telefone">
                          <PhoneInput
                            value={orgPhone}
                            onChange={setOrgPhone}
                            placeholder="+258 84 000 0000"
                          />
                        </Field>
                      </div>
                      <Field label="Sede / Endereço">
                        <Input
                          placeholder="Ex: Av. 25 de Setembro, 147 – Maputo"
                          value={org?.headquarters || ''}
                          onChange={e => setOrg(o => o ? ({ ...o, headquarters: e.target.value }) : o)}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Nome do Representante">
                          <Input
                            placeholder="Ex: João Silva"
                            value={org?.representative_name || ''}
                            onChange={e => setOrg(o => o ? ({ ...o, representative_name: e.target.value }) : o)}
                          />
                        </Field>
                        <Field label="Cargo">
                          <Input
                            placeholder="Ex: Diretor Geral"
                            value={org?.representative_position || ''}
                            onChange={e => setOrg(o => o ? ({ ...o, representative_position: e.target.value }) : o)}
                          />
                        </Field>
                      </div>
                    </FieldGroup>
                    <ActionRow>
                      <SaveButton loading={savingAgency} onClick={handleSaveAgency} label="Guardar Agência" />
                    </ActionRow>
                  </SettingsCard>

                  <SettingsCard
                    title="Métodos de Pagamento"
                    icon={<CreditCard className="h-4 w-4" />}
                    subtitle="Dados exibidos nas facturas"
                    action={
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => {
                        setPaymentMethods(prev => [...prev, {
                          id: `new-${Date.now()}`,
                          provider_name: '', account_number: '', recipient_name: '',
                          is_default: prev.length === 0,
                        }]);
                      }}>
                        <Plus className="h-3.5 w-3.5" /> Adicionar
                      </Button>
                    }
                  >
                    {paymentMethods.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                        Nenhum método de pagamento ainda
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {paymentMethods.map((m, i) => (
                          <div key={m.id} className="group relative p-2.5 rounded-xl border border-border bg-muted/20 flex flex-col md:flex-row items-center gap-2.5">
                            <Input 
                              placeholder="Banco / Provedora" 
                              value={m.provider_name}
                              className="w-full md:w-36 bg-background/40 h-10"
                              onChange={e => setPaymentMethods(prev => prev.map((x, xi) => xi === i ? { ...x, provider_name: e.target.value } : x))} 
                            />
                            <Input 
                              placeholder="Nº de Conta / Celular" 
                              value={m.account_number}
                              className="w-full md:w-52 bg-background/40 h-10"
                              onChange={e => setPaymentMethods(prev => prev.map((x, xi) => xi === i ? { ...x, account_number: e.target.value } : x))} 
                            />
                            <Input 
                              placeholder="Titular / Destinatário" 
                              value={m.recipient_name}
                              className="flex-1 bg-background/40 h-10"
                              onChange={e => setPaymentMethods(prev => prev.map((x, xi) => xi === i ? { ...x, recipient_name: e.target.value } : x))} 
                            />
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 gap-2 px-3 shrink-0"
                              onClick={async () => {
                                if (!m.id.startsWith('new-')) await supabase.from('payment_methods').delete().eq('id', m.id);
                                setPaymentMethods(prev => prev.filter(x => x.id !== m.id));
                              }}>
                              <X className="h-4 w-4" />
                              <span className="md:hidden lg:inline text-xs font-medium">Remover</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {paymentMethods.length > 0 && (
                      <ActionRow>
                        <SaveButton loading={savingPayment} onClick={handleSavePayments} label="Guardar Pagamentos" />
                      </ActionRow>
                    )}
                  </SettingsCard>
                </div>

                {/* Danger zone — full width */}
                {isOwner && org?.id && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <h3 className="font-semibold text-destructive text-sm">Zona de Perigo</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Esta acção é irreversível</p>
                    <Button variant="destructive" size="sm" className="gap-2" onClick={() => setShowDeleteModal(true)}>
                      <Trash2 className="h-4 w-4" />
                      Apagar Agência Permanentemente
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Knowledge Base ── */}
            {activeSection === 'knowledge' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <SectionHeader
                  icon={<BookOpen className="h-5 w-5" />}
                  title="Base de Conhecimento"
                  subtitle="Documentos e informações que o Agente de IA usa para responder"
                />

                <SettingsCard title="Documento PDF" icon={<FileText className="h-4 w-4" />}>
                  {kbFileUrl ? (
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{kbFileName}</p>
                        <p className="text-xs text-muted-foreground">Documento activo</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploadingKB}>
                          {uploadingKB ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          Substituir
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-muted-foreground hover:text-destructive gap-1.5 text-xs" onClick={handleDeleteKB} disabled={uploadingKB}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingKB ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-7 w-7 animate-spin text-primary" />
                          <p className="text-sm">A carregar…</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="h-7 w-7" />
                          <p className="text-sm font-medium">Clique para carregar PDF</p>
                          <p className="text-xs">Máximo 20MB</p>
                        </div>
                      )}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleKBUpload} className="hidden" />
                </SettingsCard>

                <SettingsCard title="Texto de Conhecimento" icon={<BookOpen className="h-4 w-4" />} subtitle="Informações adicionais sobre a agência">
                  <Textarea
                    placeholder="Ex: A nossa agência foi fundada em 2015 e é especializada em marketing digital para PMEs em Moçambique…"
                    value={kbText}
                    onChange={e => setKbText(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  <ActionRow>
                    <SaveButton loading={savingKB} onClick={handleSaveKBText} label="Guardar Texto" />
                  </ActionRow>
                </SettingsCard>
              </div>
            )}

            {/* ── Documents ── */}
            {activeSection === 'documents' && isAdmin && (
              <div className="space-y-6 animate-fade-in">
                <SectionHeader
                  icon={<FileText className="h-5 w-5" />}
                  title="Documentos"
                  subtitle="Configure os modelos de facturas e documentos da agência"
                />
                <InvoiceTemplateSettings organizationId={org?.id || null} />
                <DocumentTemplatesTab />
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Delete modal */}
      {org?.id && (
        <DeleteAgencyModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          organizationId={org.id}
          organizationName={orgName}
        />
      )}
      {/* Onboarding Welcome Modal */}
      <AgencyOnboardingModal 
        isOpen={showOnboardingModal} 
        onClose={() => setShowOnboardingModal(false)} 
      />
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-border">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function SettingsCard({
  title, subtitle, icon, children, action
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="text-primary">{icon}</div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end pt-2 border-t border-border mt-4">{children}</div>;
}

function SaveButton({
  loading, onClick, label, icon
}: {
  loading: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Button onClick={onClick} disabled={loading} className="gap-2 h-9">
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : (icon || <Check className="h-4 w-4" />)
      }
      {loading ? 'A guardar…' : label}
    </Button>
  );
}
