import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserPlus, Loader2, Mail, MoreHorizontal, Shield, UserX, UserCheck, Clock, CheckCircle, XCircle, ShieldAlert, RefreshCw, Lock, Ban, Info, Users, UsersRound } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

import { z } from 'zod';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { LimitReachedCard } from '@/components/subscription/LimitReachedCard';
import { useTranslatedLabels } from '@/hooks/useTranslatedLabels';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrganization } from '@/hooks/useOrganization';

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: 'sales' | 'operations' | 'campaign_management' | 'Owner' | 'User' | 'qfy-admin' | string;
  created_at: string | null;
  email?: string | null;
  status: 'active' | 'pending' | 'suspended';
  type: 'member' | 'invite';
  inviteId?: string;
  privileges?: string[] | null;
}

const ROLE_COLORS: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-800',
  operations: 'bg-purple-100 text-purple-800',
  campaign_management: 'bg-orange-100 text-orange-800',
  Owner: 'bg-red-100 text-red-800',
  'qfy-admin': 'bg-purple-100 text-purple-800',
};

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; icon: any }> = {
  active: { labelKey: 'status.active', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  pending: { labelKey: 'status.pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  suspended: { labelKey: 'status.suspended', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const PRIVILEGES = [
  { id: 'sales', labelKey: 'navigation.salesFunnel', descriptionKey: 'privileges.sales' },
  { id: 'designer', labelKey: 'navigation.operationalFlow', descriptionKey: 'privileges.designer' },
  { id: 'finance', labelKey: 'navigation.finance', descriptionKey: 'privileges.finance' },
  { id: 'link23', labelKey: 'navigation.link23', descriptionKey: 'privileges.link23' },
  { id: 'editorial', labelKey: 'navigation.editorial', descriptionKey: 'privileges.editorial' },
  { id: 'social_media', labelKey: 'navigation.socialMedia', descriptionKey: 'privileges.social_media' },
  { id: 'studio', labelKey: 'navigation.studio', descriptionKey: 'privileges.studio' },
  { id: 'clients', labelKey: 'navigation.clients', descriptionKey: 'privileges.clients' },
  { id: 'team', labelKey: 'navigation.team', descriptionKey: 'privileges.team' },
  { id: 'qia', labelKey: 'navigation.qia', descriptionKey: 'privileges.qia' },
  { id: 'ai_agents', labelKey: 'navigation.aiAgents', descriptionKey: 'privileges.ai_agents' },
] as const;

const UNIVERSAL_PRIVILEGES = [
  { id: 'academy', labelKey: 'navigation.academy', descriptionKey: 'privileges.academy' },
  { id: 'support', labelKey: 'navigation.support', descriptionKey: 'privileges.support' },
  { id: 'notifications', labelKey: 'navigation.notifications', descriptionKey: 'privileges.notifications' },
  { id: 'settings', labelKey: 'navigation.settings', descriptionKey: 'privileges.settings' },
];

const inviteSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  fullName: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  privileges: z.array(z.string()).min(1, { message: 'Selecione pelo menos um privilégio' }),
});

export default function Team() {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation('team');
  const { t: tCommon } = useTranslation('common');
  const { roleLabels, getRoleLabel } = useTranslatedLabels();
  const navigate = useNavigate();
  const { canInviteTeamMember, planType, usage, limits, loading: planLoading } = usePlanLimits();
  const { isOwner: currentUserIsOwner, isLoading: permissionsLoading, canAccessModule } = usePermissions();
  const canManageTeam = canAccessModule('team');
  const { organizationId: currentUserOrgId } = useOrganization();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgOwnerId, setOrgOwnerId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; fullName?: string }>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('user');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [adminPromotionDialogOpen, setAdminPromotionDialogOpen] = useState(false);
  const [pendingAdminPromotion, setPendingAdminPromotion] = useState<{ member: TeamMember; role: string } | null>(null);
  const [cancelInviteDialogOpen, setCancelInviteDialogOpen] = useState(false);
  const [inviteToCancel, setInviteToCancel] = useState<TeamMember | null>(null);

  useEffect(() => {
    if (!permissionsLoading) {
      if (canManageTeam && currentUserOrgId) {
        fetchMembers();
      } else if (!canManageTeam) {
        navigate('/app');
        toast({
          title: t('messages.accessDenied', 'Acesso negado'),
          description: t('messages.noTeamAccess', 'Você não tem acesso ao módulo de Equipe'),
          variant: 'destructive',
        });
      }
    }
  }, [canManageTeam, permissionsLoading, currentUserOrgId, navigate]);


  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentUserOrgId) {
        setMembers([]);
        return;
      }

      // Fetch active members from organization_members table
      const [{ data: orgMembers, error: membersError }, { data: orgData }] = await Promise.all([
        supabase
          .from('organization_members')
          .select('user_id, role, privileges')
          .eq('organization_id', currentUserOrgId)
          .eq('is_active', true) as any,
        // Fetch org owner_id to identify owner in the list
        supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', currentUserOrgId)
          .maybeSingle()
      ]);

      // Store the owner ID so we can display correct badge
      if (orgData?.owner_id) {
        setOrgOwnerId(orgData.owner_id);
      }

      if (membersError) {
        console.error('Error fetching organization members:', membersError);
      }

      // Fetch pending invites - handle separately so it doesn't break the page
      let pendingInvites: any[] = [];
      try {
        const { data: invitesData, error: invitesError } = await supabase
          .from('organization_invites')
          .select('id, email, full_name, role, created_at, status, privileges')
          .eq('organization_id', currentUserOrgId)
          .eq('status', 'pending');

        if (invitesError) {
          console.warn('Could not fetch pending invites:', invitesError);
        } else {
          pendingInvites = invitesData || [];
        }
      } catch (e) {
        console.warn('Error fetching invites:', e);
      }

      // Fetch profiles for active members
      const memberUserIds = orgMembers?.map(m => m.user_id) || [];
      let profiles: any[] = [];

      if (memberUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', memberUserIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          profiles = profilesData || [];
        }
      }

      // Create a map of user_id to role from organization_members
      const memberDataMap = new Map(orgMembers?.map(m => [m.user_id, { role: m.role, privileges: m.privileges }]) || []);

      // Map active members
      const activeMembers: TeamMember[] = profiles.map(member => {
        const memberData = memberDataMap.get(member.id) as any;
        return {
          id: member.id,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
          role: memberData?.role || member.role,
          privileges: memberData?.privileges || member.privileges,
          created_at: member.created_at,
          email: member.email,
          status: member.suspended ? 'suspended' : 'active',
          type: 'member' as const,
        };
      });

      // Map pending invites
      const pendingMembers: TeamMember[] = pendingInvites.map(invite => ({
        id: invite.id,
        full_name: invite.full_name,
        avatar_url: null,
        created_at: invite.created_at,
        email: invite.email,
        status: 'pending' as const,
        type: 'invite' as const,
        inviteId: invite.id,
        privileges: invite.privileges,
        body: { email: invite.email, fullName: invite.full_name, privileges: invite.privileges, resend: true },
      }));

      // Combine and sort: active first, then pending
      const allMembers = [...activeMembers, ...pendingMembers];
      setMembers(allMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({ title: t('messages.error', 'Erro'), description: t('messages.loadError', 'Não foi possível carregar a equipe'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    try {
      inviteSchema.parse({ email, fullName, privileges: selectedPrivileges });
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: typeof errors = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as keyof typeof errors] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return;
    }

    setInviting(true);
    try {
      const response = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, privileges: selectedPrivileges },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar convite');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Convite enviado!',
        description: `Um e-mail de convite foi enviado para ${email}`
      });
      setInviteOpen(false);
      setEmail('');
      setFullName('');
      setSelectedPrivileges([]);
      fetchMembers();
    } catch (error) {
      console.error('Invite error:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível enviar o convite',
        variant: 'destructive'
      });
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedMember) return;
    await executeRoleChange(selectedMember.id, selectedRole, selectedPrivileges);
  };

  const executeRoleChange = async (memberId: string, role: string, privileges: string[] = []) => {
    setActionLoading(memberId);
    try {
      // Update organization_members - this is the source of truth for agency roles
      if (currentUserOrgId) {
        const { error: orgMemberError } = await supabase
          .from('organization_members')
          .update({ role: role as any, privileges })
          .eq('user_id', memberId)
          .eq('organization_id', currentUserOrgId);

        if (orgMemberError) throw orgMemberError;
      }

      toast({ title: 'Sucesso!', description: 'Privilégios alterados com sucesso' });
      setRoleDialogOpen(false);
      setAdminPromotionDialogOpen(false);
      setSelectedMember(null);
      setPendingAdminPromotion(null);
      fetchMembers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar a função', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAdminPromotion = async () => {
    if (!pendingAdminPromotion) return;
    await executeRoleChange(pendingAdminPromotion.member.id, pendingAdminPromotion.role);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !currentUserOrgId) return;

    setActionLoading(memberToRemove.id);
    try {
      const { data, error } = await supabase.functions.invoke('remove-member', {
        body: {
          memberId: memberToRemove.id,
          memberEmail: memberToRemove.email,
          memberName: memberToRemove.full_name,
          organizationId: currentUserOrgId,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Sucesso!',
        description: 'Membro removido da equipe e notificado por email'
      });
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível remover o membro',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    }
  };

  const openRemoveDialog = (member: TeamMember) => {
    setMemberToRemove(member);
    setRemoveDialogOpen(true);
  };

  const handleToggleSuspend = async (member: TeamMember) => {
    setActionLoading(member.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isSuspending = member.status !== 'suspended';

      const { error } = await supabase
        .from('profiles')
        .update({
          suspended: isSuspending,
          suspended_at: isSuspending ? new Date().toISOString() : null,
          suspended_by: isSuspending ? user?.id : null,
        } as any)
        .eq('id', member.id);

      if (error) throw error;

      toast({
        title: isSuspending ? 'Usuário suspenso' : 'Usuário ativado',
        description: isSuspending
          ? 'O usuário não poderá mais acessar o sistema'
          : 'O usuário pode acessar o sistema novamente'
      });

      fetchMembers();
    } catch (error) {
      console.error('Error toggling suspend:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar o status do usuário', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (member: TeamMember) => {
    if (!member.email) {
      toast({ title: 'Erro', description: 'Email do usuário não encontrado', variant: 'destructive' });
      return;
    }

    setActionLoading(member.id);
    try {
      const response = await supabase.functions.invoke('invite-user', {
        body: {
          email: member.email,
          fullName: member.full_name || 'Colaborador',
          role: member.role,
          privileges: (member.privileges && member.privileges.length > 0) ? member.privileges : ['sales'],
          resend: true
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao reenviar convite');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Convite reenviado!',
        description: `Um novo e-mail foi enviado para ${member.email}`
      });
    } catch (error) {
      console.error('Resend invite error:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível reenviar o convite',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvite = async () => {
    if (!inviteToCancel?.inviteId) return;

    setActionLoading(inviteToCancel.id);
    try {
      const { error } = await supabase
        .from('organization_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteToCancel.inviteId);

      if (error) throw error;

      toast({
        title: 'Convite cancelado',
        description: 'O convite foi cancelado com sucesso'
      });
      fetchMembers();
    } catch (error) {
      console.error('Error cancelling invite:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar o convite',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
      setCancelInviteDialogOpen(false);
      setInviteToCancel(null);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canManageTeam) {
    return null;
  }

  return (
    <div className="p-4 md:p-8 pt-4 md:pt-8 space-y-6">
      {!canInviteTeamMember && limits.maxTeamMembers !== null && (
        <LimitReachedCard
          feature="membros da equipe"
          current={usage.teamMembersCount}
          limit={limits.maxTeamMembers}
          planType={planType}
          variant="banner"
        />
      )}
      <AnimatedContainer animation="fade-up" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 flex-wrap text-left">
            <UsersRound className="h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
            {t('title', 'Equipe')}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 text-left">{t('subtitle', 'Gerencie os membros da sua equipe')}</p>
        </div>
        {limits.maxTeamMembers !== null && (
          <div className="w-full sm:w-64 space-y-1.5 order-last sm:order-none sm:mx-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{t('members.label')}</span>
              <span className={cn("font-bold", usage.teamMembersCount >= limits.maxTeamMembers ? "text-destructive" : "text-primary")}>
                {usage.teamMembersCount} / {limits.maxTeamMembers}
              </span>
            </div>
            <Progress 
              value={(usage.teamMembersCount / limits.maxTeamMembers) * 100} 
              className={cn("h-1.5", usage.teamMembersCount >= limits.maxTeamMembers && "bg-destructive/20")} 
            />
          </div>
        )}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 w-full sm:w-auto"
              disabled={!canInviteTeamMember || !canManageTeam}
            >
              {!canManageTeam ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span>{t('invite.restricted')}</span>
                </>
              ) : !canInviteTeamMember ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('limits.reached', 'Limite Atingido')}</span>
                  <span className="sm:hidden">{t('limits.reached', 'Limite')}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('invite.title', 'Adicionar Membro')}</span>
                  <span className="sm:hidden">{t('invite.title', 'Adicionar')}</span>
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('invite.title', 'Convidar Novo Membro')}</DialogTitle>
              <DialogDescription>
                {t('invite.description', 'Envie um convite por e-mail para adicionar um novo membro à equipe.')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">{t('invite.fullName', 'Nome Completo')}</Label>
                <Input
                  id="invite-name"
                  placeholder={t('invite.fullNamePlaceholder', 'Nome do colaborador')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t('invite.email', 'E-mail')}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder={t('invite.emailPlaceholder', 'email@exemplo.com')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-0.5 gap-y-2">
                  <TooltipProvider>
                    {PRIVILEGES.map((privilege) => (
                      <div key={privilege.id} className="flex items-start space-x-2 p-1.5 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/30">
                        <Checkbox
                          id={`privilege-${privilege.id}`}
                          checked={selectedPrivileges.includes(privilege.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPrivileges([...selectedPrivileges, privilege.id]);
                            } else {
                              setSelectedPrivileges(selectedPrivileges.filter(id => id !== privilege.id));
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="grid gap-0.5 leading-tight">
                          <label
                            htmlFor={`privilege-${privilege.id}`}
                            className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                          >
                            {tCommon(privilege.labelKey)}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[220px]">
                                <p className="text-xs">{t(privilege.descriptionKey)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </label>
                        </div>
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">{t('invite.universalLabel')}</Badge>
                  <p className="text-[11px] text-muted-foreground italic">
                    {t('invite.universalDescription')}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                {tCommon('actions.cancel', 'Cancelar')}
              </Button>
              <Button onClick={handleInvite} disabled={inviting} className="gap-2">
                {inviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('invite.sending', 'Enviando...')}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    {t('invite.send', 'Enviar Convite')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AnimatedContainer>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Privilégios</DialogTitle>
            <DialogDescription>
              Altere os privilégios de {selectedMember?.full_name || 'este membro'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-0.5 gap-y-2">
              <TooltipProvider>
                {PRIVILEGES.map((privilege) => (
                  <div key={`edit-${privilege.id}`} className="flex items-start space-x-2 p-1.5 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/30">
                    <Checkbox
                      id={`edit-privilege-${privilege.id}`}
                      checked={selectedPrivileges.includes(privilege.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPrivileges([...selectedPrivileges, privilege.id]);
                        } else {
                          setSelectedPrivileges(selectedPrivileges.filter(id => id !== privilege.id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="grid gap-0.5 leading-tight">
                      <label
                        htmlFor={`edit-privilege-${privilege.id}`}
                        className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                      >
                        {tCommon(privilege.labelKey)}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-xs">{privilege.descriptionKey.includes('.') ? t(privilege.descriptionKey) : tCommon(privilege.descriptionKey)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </label>
                    </div>
                  </div>
                ))}
              </TooltipProvider>
            </div>


            <div className="flex items-center gap-2 px-1 pt-2">
              <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">Universal</Badge>
              <p className="text-[11px] text-muted-foreground italic">
                Academia, Suporte, Notificações e Configurações são liberados para todos os membros.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangeRole} disabled={actionLoading === selectedMember?.id}>
              {actionLoading === selectedMember?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Equipe</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {memberToRemove?.full_name || 'este membro'} da equipe?
              O usuário perderá acesso a esta agência, mas sua conta permanecerá ativa caso esteja
              em outras organizações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === memberToRemove?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Remover da Equipe'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invite Confirmation Dialog */}
      <AlertDialog open={cancelInviteDialogOpen} onOpenChange={setCancelInviteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o convite para {inviteToCancel?.full_name || inviteToCancel?.email}?
              O link de convite será invalidado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === inviteToCancel?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cancelar Convite'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Promotion Confirmation Dialog */}
      <AlertDialog open={adminPromotionDialogOpen} onOpenChange={setAdminPromotionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Promoção a Dono (Owner)
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a promover <strong>{pendingAdminPromotion?.member.full_name}</strong> para <strong>Dono (Owner)</strong>.</p>
              <p className="text-amber-600 font-medium">Esta ação concederá privilégios completos sobre o sistema, incluindo:</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Gerenciamento de todos os clientes</li>
                <li>Acesso às configurações da organização</li>
                <li>Controle sobre membros da equipe</li>
                <li>Acesso a informações financeiras</li>
              </ul>
              <p className="mt-3">Tem certeza que deseja continuar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAdminPromotion(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAdminPromotion}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {actionLoading === pendingAdminPromotion?.member.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirmar Promoção'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatedContainer animation="fade-up" delay={0.1} className="bg-card border border-border rounded-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('member.name', 'Membro')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('member.email', 'E-mail')}</TableHead>
                <TableHead>{t('member.roleLabel', 'Função')}</TableHead>
                <TableHead>{t('member.statusLabel', 'Status')}</TableHead>
                <TableHead className="hidden sm:table-cell">Desde</TableHead>
                <TableHead className="w-[50px]">{t('member.actionsLabel', 'Ações')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('empty.title', 'Nenhum membro da equipe encontrado.')}
                  </TableCell>
                </TableRow>
              ) : (
                members.map(member => {
                  const StatusIcon = STATUS_CONFIG[member.status].icon;
                  const isPending = member.type === 'invite';
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{member.full_name || t('member.pending', 'Aguardando...')}</span>
                            <span className="text-xs text-muted-foreground md:hidden">{member.email || '-'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {member.email || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          {/* Owner badge for org owner, Colaborador for everyone else */}
                          {member.role?.toLowerCase() === 'owner' ? (
                            <Badge variant="secondary" className="w-fit bg-orange-100 text-orange-800 border border-orange-200">
                              👑 {t('member.owner', 'Dono')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="w-fit bg-slate-100 text-slate-700">
                              {getRoleLabel(member.role || 'user')}
                            </Badge>
                          )}
                          {member.id !== orgOwnerId && member.privileges && member.privileges.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {member.privileges.map(p => (
                                <Badge key={p} variant="outline" className="text-[10px] px-1 py-0 h-4 bg-muted/50">
                                  {tCommon(PRIVILEGES.find(pr => pr.id === p)?.labelKey || UNIVERSAL_PRIVILEGES.find(pr => pr.id === p)?.labelKey || p)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`gap-1 ${STATUS_CONFIG[member.status].color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {t(STATUS_CONFIG[member.status].labelKey)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {member.created_at
                          ? new Date(member.created_at).toLocaleDateString(t('locale', 'pt-BR'))
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={actionLoading === member.id}>
                              {actionLoading === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                             {!canManageTeam ? (
                               <DropdownMenuItem disabled className="text-stone-400 italic text-xs">
                                 <Lock className="h-3 w-3 mr-2" />
                                 Sem permissão de gestão
                               </DropdownMenuItem>
                             ) : isPending ? (
                              <>
                                <DropdownMenuItem onClick={() => handleResendInvite(member)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  {t('actions.resendInvite', 'Reenviar Convite')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setInviteToCancel(member);
                                    setCancelInviteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  {t('actions.cancelInvite', 'Cancelar Convite')}
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setSelectedPrivileges(member.privileges || []);
                                    setSelectedRole(member.role || 'user');
                                    setRoleDialogOpen(true);
                                  }}
                                  disabled={
                                    member.id === currentUser?.id ||
                                    member.role?.toLowerCase() === 'owner'
                                  }
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {t('actions.changeRole', 'Alterar Privilégios')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleSuspend(member)}
                                  disabled={
                                    member.id === currentUser?.id ||
                                    member.role?.toLowerCase() === 'owner'
                                  }
                                >
                                  {member.status === 'suspended' ? (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      {t('actions.activate', 'Ativar')}
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      {t('actions.suspend', 'Suspender')}
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openRemoveDialog(member)}
                                  className="text-destructive"
                                  disabled={
                                    member.id === currentUser?.id ||
                                    member.role?.toLowerCase() === 'owner'
                                  }
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  {t('actions.remove', 'Remover da Equipe')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AnimatedContainer>
    </div>
  );
}

