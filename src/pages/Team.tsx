import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2, Mail, MoreHorizontal, Shield, UserX, UserCheck, Clock, CheckCircle, XCircle, ShieldAlert, RefreshCw, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { z } from 'zod';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { LimitReachedCard } from '@/components/subscription/LimitReachedCard';

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'sales' | 'operations' | 'campaign_management' | 'admin';
  created_at: string | null;
  email?: string | null;
  status?: 'active' | 'pending' | 'suspended';
}


const ROLE_LABELS: Record<string, string> = {
  sales: 'Vendas',
  operations: 'Operações',
  campaign_management: 'Gestão de Campanhas',
  admin: 'Administrador',
};

const ROLE_COLORS: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-800',
  operations: 'bg-purple-100 text-purple-800',
  campaign_management: 'bg-orange-100 text-orange-800',
  admin: 'bg-red-100 text-red-800',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Ativo', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  pending: { label: 'Convite Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const inviteSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  fullName: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  role: z.enum(['sales', 'operations', 'campaign_management'], { message: 'Selecione uma função' }),
});

export default function Team() {
  const navigate = useNavigate();
  const { canInviteTeamMember, planType, usage, limits, loading: planLoading } = usePlanLimits();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>('');
  const [errors, setErrors] = useState<{ email?: string; fullName?: string; role?: string }>({});
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null);
  const [currentUserOrgId, setCurrentUserOrgId] = useState<string | null>(null);
  const [isProprietor, setIsProprietor] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [adminPromotionDialogOpen, setAdminPromotionDialogOpen] = useState(false);
  const [pendingAdminPromotion, setPendingAdminPromotion] = useState<{ member: TeamMember; role: string } | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isCurrentUserAdmin === true && currentUserOrgId) {
      fetchMembers();
    } else if (isCurrentUserAdmin === false) {
      navigate('/app');
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem acessar esta página',
        variant: 'destructive',
      });
    }
  }, [isCurrentUserAdmin, currentUserOrgId, navigate]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCurrentUserAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id, current_organization_id')
        .eq('id', user.id)
        .single();

      // Check if user is proprietor
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'proprietor')
        .maybeSingle();

      setIsProprietor(roleData?.role === 'proprietor');
      // Use current_organization_id if available, fallback to organization_id
      setCurrentUserOrgId(profile?.current_organization_id || profile?.organization_id || null);
      setIsCurrentUserAdmin(profile?.role === 'admin' || roleData?.role === 'proprietor');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsCurrentUserAdmin(false);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentUserOrgId) {
        setMembers([]);
        return;
      }

      // Fetch active members from organization_members table
      const { data: orgMembers, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', currentUserOrgId)
        .eq('is_active', true);

      if (membersError) throw membersError;

      if (!orgMembers || orgMembers.length === 0) {
        setMembers([]);
        return;
      }

      const memberUserIds = orgMembers.map(m => m.user_id);

      // Fetch profiles for these members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds);

      if (profilesError) throw profilesError;

      // Fetch proprietor user IDs to filter them out (unless current user is proprietor)
      const { data: proprietorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'proprietor');

      const proprietorIds = new Set(proprietorRoles?.map(r => r.user_id) || []);

      // Filter out proprietors unless the current user is a proprietor
      const filteredProfiles = profiles?.filter(profile => {
        if (isProprietor) {
          return true;
        }
        return !proprietorIds.has(profile.id);
      }) || [];

      // Fetch login history to determine if users have accepted their invite
      const userIds = filteredProfiles.map(p => p.id);
      const { data: loginHistory } = await supabase
        .from('login_history')
        .select('user_id')
        .in('user_id', userIds);

      const usersWithLogins = new Set(loginHistory?.map(l => l.user_id) || []);

      // Create a map of user_id to role from organization_members
      const memberRoleMap = new Map(orgMembers.map(m => [m.user_id, m.role]));

      const membersWithStatus = filteredProfiles.map(member => {
        let status: 'active' | 'pending' | 'suspended' = 'active';
        if ((member as any).suspended) {
          status = 'suspended';
        } else if (!usersWithLogins.has(member.id)) {
          status = 'pending';
        }
        return {
          ...member,
          // Use role from organization_members for this specific org
          role: memberRoleMap.get(member.id) || member.role,
          status,
        };
      });

      setMembers(membersWithStatus);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar a equipe', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    try {
      inviteSchema.parse({ email, fullName, role });
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
        body: { email, fullName, role },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar convite');
      }

      toast({ 
        title: 'Convite enviado!', 
        description: `Um e-mail foi enviado para ${email}` 
      });
      setInviteOpen(false);
      setEmail('');
      setFullName('');
      setRole('');
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
    if (!selectedMember || !newRole) return;
    
    // If promoting to admin, show special confirmation dialog
    if (newRole === 'admin' && selectedMember.role !== 'admin') {
      setPendingAdminPromotion({ member: selectedMember, role: newRole });
      setAdminPromotionDialogOpen(true);
      setRoleDialogOpen(false);
      return;
    }
    
    await executeRoleChange(selectedMember.id, newRole);
  };

  const executeRoleChange = async (memberId: string, role: string) => {
    setActionLoading(memberId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: role as any })
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Função alterada com sucesso' });
      setRoleDialogOpen(false);
      setAdminPromotionDialogOpen(false);
      setSelectedMember(null);
      setNewRole('');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Use the database function to remove from team (not delete user)
      const { data, error } = await supabase.rpc('remove_from_team', {
        member_user_id: memberToRemove.id,
        org_uuid: currentUserOrgId,
        removed_by_user_id: user.id
      });

      if (error) throw error;

      if (!data) {
        throw new Error('Não foi possível remover o membro da equipe');
      }

      toast({ 
        title: 'Sucesso!', 
        description: 'Membro removido da equipe com sucesso' 
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
          role: member.role === 'admin' ? 'operations' : member.role,
          resend: true 
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao reenviar convite');
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

  // Show loading while checking admin status
  if (isCurrentUserAdmin === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render if not admin (redirect will happen)
  if (!isCurrentUserAdmin) {
    return null;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Equipe</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Gerencie os membros da sua equipe</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2 w-full sm:w-auto" 
              disabled={!canInviteTeamMember}
            >
              {!canInviteTeamMember ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span className="hidden sm:inline">Limite Atingido</span>
                  <span className="sm:hidden">Limite</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Adicionar Membro</span>
                  <span className="sm:hidden">Adicionar</span>
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Novo Membro</DialogTitle>
              <DialogDescription>
                Envie um convite por e-mail para adicionar um novo membro à equipe.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nome Completo</Label>
                <Input
                  id="invite-name"
                  placeholder="Nome do colaborador"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Função</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Vendas</SelectItem>
                    <SelectItem value="operations">Operações</SelectItem>
                    <SelectItem value="campaign_management">Gestão de Campanhas</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInvite} disabled={inviting} className="gap-2">
                {inviting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Enviar Convite
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
            <DialogTitle>Alterar Função</DialogTitle>
            <DialogDescription>
              Altere a função de {selectedMember?.full_name || 'este membro'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nova Função</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione a nova função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Vendas</SelectItem>
                <SelectItem value="operations">Operações</SelectItem>
                <SelectItem value="campaign_management">Gestão de Campanhas</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangeRole} disabled={!newRole || actionLoading === selectedMember?.id}>
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

      {/* Admin Promotion Confirmation Dialog */}
      <AlertDialog open={adminPromotionDialogOpen} onOpenChange={setAdminPromotionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Promoção a Administrador
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a promover <strong>{pendingAdminPromotion?.member.full_name}</strong> para Administrador.</p>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Desde</TableHead>
              <TableHead className="w-[50px]">Ações</TableHead>
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
                  Nenhum membro da equipe encontrado.
                </TableCell>
              </TableRow>
            ) : (
              members.map(member => {
                const StatusIcon = STATUS_CONFIG[member.status || 'active'].icon;
                const hasAcceptedInvite = member.status !== 'pending' && member.full_name;
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
                          <span className="font-medium">{member.full_name || 'Aguardando...'}</span>
                          <span className="text-xs text-muted-foreground md:hidden">{member.email || '-'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {member.email || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ROLE_COLORS[member.role] || ''}>
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className={`gap-1 ${STATUS_CONFIG[member.status || 'active'].color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_CONFIG[member.status || 'active'].label}
                        </Badge>
                        {member.status === 'pending' && (
                          <span className="text-xs text-muted-foreground">Convite pendente</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {member.created_at 
                        ? new Date(member.created_at).toLocaleDateString('pt-BR')
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
                          {member.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleResendInvite(member)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reenviar Convite
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => {
                            setSelectedMember(member);
                            setNewRole(member.role);
                            setRoleDialogOpen(true);
                          }}>
                            <Shield className="h-4 w-4 mr-2" />
                            Alterar Privilégios
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleSuspend(member)}>
                            {member.status === 'suspended' ? (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            ) : (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Suspender
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openRemoveDialog(member)}
                            className="text-destructive"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remover da Equipe
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </AnimatedContainer>

    </div>
  );
}
