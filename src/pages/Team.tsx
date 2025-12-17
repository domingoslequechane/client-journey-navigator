import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2, Mail, MoreHorizontal, Shield, UserX, UserCheck, Clock, CheckCircle, XCircle, History, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'sales' | 'operations' | 'campaign_management' | 'admin';
  created_at: string | null;
  email?: string | null;
  status?: 'active' | 'pending' | 'suspended';
}

interface LoginRecord {
  id: string;
  user_id: string;
  logged_in_at: string;
  provider: string;
  user_agent: string | null;
  user_name?: string;
  user_email?: string;
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
  pending: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  suspended: { label: 'Suspenso', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const inviteSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  fullName: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  role: z.enum(['sales', 'operations', 'campaign_management'], { message: 'Selecione uma função' }),
});

export default function Team() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>('');
  const [errors, setErrors] = useState<{ email?: string; fullName?: string; role?: string }>({});
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState<boolean | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isCurrentUserAdmin === true) {
      fetchMembers();
      fetchLoginHistory();
    } else if (isCurrentUserAdmin === false) {
      navigate('/app');
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem acessar esta página',
        variant: 'destructive',
      });
    }
  }, [isCurrentUserAdmin, navigate]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCurrentUserAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsCurrentUserAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsCurrentUserAdmin(false);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const membersWithStatus = data?.map(member => {
        let status: 'active' | 'pending' | 'suspended' = 'active';
        if ((member as any).suspended) {
          status = 'suspended';
        } else if (!member.full_name) {
          status = 'pending';
        }
        return {
          ...member,
          status,
        };
      }) || [];

      setMembers(membersWithStatus);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar a equipe', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data: logins, error } = await supabase
        .from('login_history')
        .select('*')
        .order('logged_in_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profiles for user names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const historyWithNames = (logins || []).map(login => ({
        ...login,
        user_name: profileMap.get(login.user_id)?.full_name || 'Usuário',
        user_email: profileMap.get(login.user_id)?.email || '',
      }));

      setLoginHistory(historyWithNames as LoginRecord[]);
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoadingHistory(false);
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
    
    setActionLoading(selectedMember.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('id', selectedMember.id);

      if (error) throw error;

      toast({ title: 'Sucesso!', description: 'Função alterada com sucesso' });
      setRoleDialogOpen(false);
      setSelectedMember(null);
      setNewRole('');
      fetchMembers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast({ title: 'Erro', description: 'Não foi possível alterar a função', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro? Esta ação é irreversível.')) return;
    
    setActionLoading(memberId);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: memberId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao remover usuário');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ 
        title: 'Sucesso!', 
        description: 'Usuário removido com sucesso' 
      });
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ 
        title: 'Erro', 
        description: error instanceof Error ? error.message : 'Não foi possível remover o usuário', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(null);
    }
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
      <AnimatedContainer animation="fade-up" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Equipe</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Gerencie os membros da sua equipe</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Adicionar Membro</span>
              <span className="sm:hidden">Adicionar</span>
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

      {/* Team Members Table */}
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
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-destructive"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Remover
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

      {/* Login History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Logins
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loginHistory.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum registro de login encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="hidden md:table-cell">E-mail</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="hidden sm:table-cell">Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.map(login => (
                    <TableRow key={login.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {login.user_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{login.user_name}</span>
                            <span className="text-xs text-muted-foreground md:hidden">{login.user_email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {login.user_email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(login.logged_in_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs capitalize">
                          {login.provider}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
