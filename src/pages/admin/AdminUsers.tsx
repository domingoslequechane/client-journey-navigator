import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserX, UserCheck, Users, ShieldAlert, Trash2, Shield, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface UserWithOrg {
  id: string; // User Profile ID
  membership_id?: string; // Organization Member ID (optional for orphans)
  email: string | null;
  full_name: string | null;
  role: string; // Role in THAT organization, or fallback role
  suspended: boolean;
  created_at: string | null;
  organization_id: string | null;
  is_primary_owner?: boolean;
  organization: { 
    id: string;
    name: string;
    owner_id: string;
  } | null;
  subscription_status?: string | null;
  privileges?: string[];
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [selectedDeleteUser, setSelectedDeleteUser] = useState<UserWithOrg | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const [roleUser, setRoleUser] = useState<UserWithOrg | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [selectedPrivileges, setSelectedPrivileges] = useState<string[]>([]);

  const availablePrivileges = [
    { id: 'clients', label: 'Gestão de Clientes' },
    { id: 'team', label: 'Gestão de Equipa' },
    { id: 'settings', label: 'Configurações' },
    { id: 'sales', label: 'Pipeline / Vendas' },
    { id: 'academy', label: 'Academia' },
    { id: 'qia', label: 'Agente QIA' },
    { id: 'social_media', label: 'Mídias Sociais / Atende-AI' },
    { id: 'link23', label: 'Link23' },
    { id: 'studio', label: 'Studio (Vídeo/Carrossel)' },
    { id: 'finance', label: 'Financeiro' },
    { id: 'editorial', label: 'Calendário Editorial' },
    { id: 'ai_agents', label: 'Agentes de IA' },
  ];

  const fetchUsers = async () => {
    try {
      // 1. Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, suspended, created_at, privileges')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Fetch all organization members with their organization details
      const { data: memberships, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          organization_id,
          organizations (
            id,
            name,
            owner_id
          )
        `);

      if (membersError) throw membersError;

      // 3. Fetch all subscriptions status
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('organization_id, status');

      if (subsError) throw subsError;

      const subscriptionMap = Object.fromEntries((subs || []).map(s => [s.organization_id, s.status]));

      const finalUsers: UserWithOrg[] = [];

      // 4. Map profiles and memberships
      (profiles || []).forEach(profile => {
        const userMemberships = (memberships || []).filter(m => m.user_id === profile.id);

        if (userMemberships.length > 0) {
          userMemberships.forEach(membership => {
            const org = membership.organizations as any;
            finalUsers.push({
              id: profile.id,
              membership_id: membership.id,
              email: profile.email,
              full_name: profile.full_name,
              role: membership.role || 'user',
              suspended: profile.suspended || false,
              created_at: profile.created_at,
              organization_id: membership.organization_id,
              organization: org ? { id: org.id, name: org.name, owner_id: org.owner_id } : null,
              subscription_status: membership.organization_id ? subscriptionMap[membership.organization_id] : null,
              privileges: profile.privileges || []
            });
          });
        } else {
          // Orphan user (no organization)
          finalUsers.push({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role || 'user',
            suspended: profile.suspended || false,
            created_at: profile.created_at,
            organization_id: null,
            is_primary_owner: false,
            organization: null,
            subscription_status: null,
            privileges: profile.privileges || []
          });
        }
      });

      setUsers(finalUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar a lista de utilizadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleSuspend = async (user: UserWithOrg) => {
    setActionLoading(user.id);
    const { error } = await supabase
      .from('profiles')
      .update({ suspended: !user.suspended })
      .eq('id', user.id);

    if (error) {
      toast.error('Erro ao actualizar utilizador');
    } else {
      toast.success(user.suspended ? 'Utilizador reactivado' : 'Utilizador suspenso');
      fetchUsers();
    }
    setActionLoading(null);
  };

  const handleDeleteUser = async (user: UserWithOrg) => {
    setActionLoading(user.id);
    try {
      // @ts-expect-error - RPC newly created 
      const { error } = await supabase.rpc('admin_delete_user', { target_user_id: user.id });
      if (error) throw error;
      
      toast.success('Utilizador eliminado com sucesso!');
      setSelectedDeleteUser(null);
      setDeleteConfirmName('');
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao eliminar:', error);
      toast.error(error.message || 'Ocorreu um erro ao eliminar este utilizador.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleUser) return;
    
    setActionLoading(roleUser.id);
    try {
      const { error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: roleUser.id,
        target_org_id: roleUser.organization_id || null,
        new_role: newRole, // RPC now handles normalization
        new_privileges: selectedPrivileges
      });

      if (error) throw error;

      toast.success('Função actualizada com sucesso!');
      setRoleUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao mudar função:', error);
      toast.error('Erro ao actualizar a função do utilizador.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.organization?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    // Normalize case for matching
    const roleKey = role?.toLowerCase();
    const map: Record<string, { label: string; className: string }> = {
      'qfy-admin': { label: 'Sistema (Master)', className: 'bg-indigo-500/10 text-indigo-500' },
      'owner': { label: 'Owner (Dono)', className: 'bg-amber-500/10 text-amber-600 font-bold' },
      'user': { label: 'User (Colaborador)', className: 'bg-blue-500/10 text-blue-500' },
      'trial': { label: 'Período de Teste', className: 'bg-yellow-500/10 text-yellow-500' },
      'sales': { label: 'Colaborador (Vendas)', className: 'bg-blue-500/10 text-blue-500' },
      'operations': { label: 'Colaborador (Ops)', className: 'bg-green-500/10 text-green-500' },
      'campaign_management': { label: 'Colaborador (Campanhas)', className: 'bg-orange-500/10 text-orange-500' },
    };
    const entry = map[roleKey] || { label: roleKey === 'user' ? 'User (Colaborador)' : role, className: 'bg-muted text-muted-foreground' };
    return <Badge className={`border-0 ${entry.className}`}>{entry.label}</Badge>;
  };

  const getSubscriptionBadge = (status: string | null | undefined) => {
    if (!status) return <span className="text-xs text-muted-foreground">—</span>;
    const map: Record<string, { label: string; className: string }> = {
      active: { label: 'Activa', className: 'bg-emerald-500/10 text-emerald-500' },
      trialing: { label: 'Teste', className: 'bg-yellow-500/10 text-yellow-500' },
      expired: { label: 'Expirada', className: 'bg-muted text-muted-foreground' },
      cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-500' },
    };
    const entry = map[status] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <Badge className={`border-0 ${entry.className}`}>{entry.label}</Badge>;
  };

  const activeCount = users.filter(u => !u.suspended).length;
  const suspendedCount = users.filter(u => u.suspended).length;

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">
      <AnimatedContainer animation="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Utilizadores</h1>
            <p className="text-muted-foreground">Gerir todos os utilizadores do sistema</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou organização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </AnimatedContainer>

      {/* Stats summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Activos', value: activeCount, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Suspensos', value: suspendedCount, icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map(s => (
          <AnimatedContainer key={s.label} animation="fade-up" delay={0.05}>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${s.bg}`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loading ? '—' : s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </AnimatedContainer>
        ))}
      </div>

      <AnimatedContainer animation="fade-up" delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Utilizadores ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Registado em</TableHead>
                      <TableHead className="text-right">Acções</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={`${user.id}-${user.organization_id || 'orphan'}`} className={user.suspended ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {user.full_name
                                  ? user.full_name.charAt(0).toUpperCase()
                                  : user.email?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{user.full_name || '—'}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email || '—'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{user.organization?.name || '—'}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getSubscriptionBadge(user.subscription_status)}</TableCell>
                        <TableCell>
                          {user.suspended
                            ? <Badge className="bg-red-500/10 text-red-500 border-0">Suspenso</Badge>
                            : <Badge className="bg-emerald-500/10 text-emerald-500 border-0">Activo</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.created_at
                            ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={actionLoading === user.id}
                                  className={user.suspended
                                    ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10'
                                    : 'text-orange-500 hover:text-orange-600 hover:bg-orange-500/10'}
                                >
                                  {user.suspended
                                    ? <><UserCheck className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Reactivar</span></>
                                    : <><UserX className="h-4 w-4 md:mr-1" /><span className="hidden md:inline">Suspender</span></>
                                  }
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {user.suspended ? 'Reactivar Utilizador' : 'Suspender Utilizador'}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {user.suspended
                                      ? `Tem a certeza que pretende reactivar ${user.full_name || user.email}?`
                                      : `Tem a certeza que pretende suspender ${user.full_name || user.email}? O utilizador não conseguirá aceder à plataforma.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleToggleSuspend(user)}
                                    className={user.suspended ? '' : 'bg-orange-500 hover:bg-orange-600'}
                                  >
                                    {user.suspended ? 'Reactivar' : 'Suspender'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <Button
                               variant="ghost"
                               size="sm"
                               disabled={
                                 actionLoading === user.id || 
                                 user.role === 'qfy-admin' || 
                                 user.id === currentUser?.id
                               }
                               className={
                                 (user.role === 'qfy-admin' || user.id === currentUser?.id)
                                 ? "text-stone-400 cursor-not-allowed opacity-50" 
                                 : "text-stone-500 hover:text-stone-600 hover:bg-stone-500/10"
                               }
                               title={
                                 user.role === 'qfy-admin' ? "Sistema Master (Imutável)" :
                                 user.id === currentUser?.id ? "Você não pode mudar sua própria função" : ""
                               }
                               onClick={() => {
                                 setRoleUser(user);
                                 setNewRole(user.role.toLowerCase());
                                 setSelectedPrivileges(user.privileges || []);
                               }}
                             >
                               <Shield className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Função</span>
                             </Button>

                             <Button
                               variant="ghost"
                               size="sm"
                               disabled={
                                 actionLoading === user.id || 
                                 user.role === 'qfy-admin' || 
                                 user.id === currentUser?.id
                               }
                               className={
                                 (user.role === 'qfy-admin' || user.id === currentUser?.id)
                                 ? "text-red-300 cursor-not-allowed opacity-50"
                                 : "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                               }
                               title={
                                 user.role === 'qfy-admin' ? "Sistema Master (Imutável)" :
                                 user.id === currentUser?.id ? "Você não pode eliminar sua própria conta" : ""
                               }
                               onClick={() => {
                                 setSelectedDeleteUser(user);
                                 setDeleteConfirmName('');
                               }}
                             >
                               <Trash2 className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Eliminar</span>
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          Nenhum utilizador encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </AnimatedContainer>

      {/* Shared Delete Modal */}
      {selectedDeleteUser && (
        <AlertDialog open={!!selectedDeleteUser} onOpenChange={(open) => !open && setSelectedDeleteUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Eliminar Utilizador Definitivamente
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p className="text-muted-foreground mt-2">
                    Certeza que deseja eliminar <strong className="text-foreground">{selectedDeleteUser.full_name || selectedDeleteUser.email}</strong>?
                  </p>
                  <div className="bg-red-50 border border-red-200 p-3 rounded-md text-red-800 text-sm">
                    <strong>Atenção:</strong> A conta será completamente removida. Registos operacionais (projetos, notas) passarão a pertencer a "Utilizador Eliminado".
                  </div>
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium text-foreground">
                      Para confirmar, digite o nome completo ou email: <span className="font-bold select-none">{selectedDeleteUser.full_name || selectedDeleteUser.email}</span>
                    </label>
                    <Input
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder={selectedDeleteUser.full_name || selectedDeleteUser.email || ''}
                      autoFocus
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel onClick={() => {
                setSelectedDeleteUser(null);
                setDeleteConfirmName('');
              }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteUser(selectedDeleteUser)}
                disabled={deleteConfirmName !== (selectedDeleteUser.full_name || selectedDeleteUser.email) || actionLoading === selectedDeleteUser.id}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50"
              >
                {actionLoading === selectedDeleteUser.id ? 'A eliminar...' : 'Sim, eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Role Update Modal */}
      <Dialog open={!!roleUser} onOpenChange={(open) => !open && setRoleUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Alterar Função do Utilizador
            </DialogTitle>
            <DialogDescription>
              Defina o nível de acesso para <span className="font-bold text-foreground">{roleUser?.full_name || roleUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccione a nova função</label>
              <Select 
                value={newRole} 
                onValueChange={(val) => {
                  setNewRole(val);
                  if (val === 'owner') {
                    setSelectedPrivileges(availablePrivileges.map(p => p.id));
                  } else if (val === 'user') {
                    setSelectedPrivileges([]);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner (Dono da Agência)</SelectItem>
                  <SelectItem value="user">User (Colaborador da Agência)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              <label className="text-sm font-medium">Privilégios / Acesso a Módulos</label>
              <div className="grid grid-cols-2 gap-1.5">
                {availablePrivileges.map((p) => (
                  <div key={p.id} className="flex items-center space-x-2 bg-muted/30 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`priv-${p.id}`}
                      checked={selectedPrivileges.includes(p.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPrivileges([...selectedPrivileges, p.id]);
                        } else {
                          setSelectedPrivileges(selectedPrivileges.filter(id => id !== p.id));
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`priv-${p.id}`} 
                      className="text-xs font-medium leading-none cursor-pointer select-none"
                    >
                      {p.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
              <p className="font-semibold mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Níveis de Acesso:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Owner:</strong> Dono da Agência (Gestão total).</li>
                <li><strong>User:</strong> Colaborador da Agência (Operação).</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="ghost" onClick={() => setRoleUser(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateRole} 
              disabled={actionLoading === roleUser?.id || newRole === roleUser?.role}
              className="bg-primary hover:bg-primary/90"
            >
              {actionLoading === roleUser?.id ? 'A actualizar...' : 'Confirmar Alteração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
