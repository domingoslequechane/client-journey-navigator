import { useEffect, useState } from 'react';
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
import { Search, UserX, UserCheck, Users, ShieldAlert, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface UserWithOrg {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  suspended: boolean;
  created_at: string | null;
  organization: { name: string } | null;
  subscription_status?: string | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [selectedDeleteUser, setSelectedDeleteUser] = useState<UserWithOrg | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, suspended, created_at, current_organization_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      return;
    }

    const orgIds = [...new Set(data?.filter(u => u.current_organization_id).map(u => u.current_organization_id))];

    let orgMap: Record<string, string> = {};
    let subscriptionMap: Record<string, string> = {};

    if (orgIds.length > 0) {
      const [{ data: orgs }, { data: subs }] = await Promise.all([
        supabase.from('organizations').select('id, name').in('id', orgIds),
        supabase.from('subscriptions').select('organization_id, status').in('organization_id', orgIds),
      ]);

      orgMap = Object.fromEntries((orgs || []).map(o => [o.id, o.name]));
      subscriptionMap = Object.fromEntries((subs || []).map(s => [s.organization_id, s.status]));
    }

    const usersWithOrg = (data || []).map(user => ({
      ...user,
      organization: user.current_organization_id && orgMap[user.current_organization_id]
        ? { name: orgMap[user.current_organization_id] }
        : null,
      subscription_status: user.current_organization_id
        ? subscriptionMap[user.current_organization_id] || null
        : null,
    }));

    setUsers(usersWithOrg);
    setLoading(false);
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

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.organization?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; className: string }> = {
      admin: { label: 'Admin', className: 'bg-purple-500/10 text-purple-500' },
      sales: { label: 'Comercial', className: 'bg-blue-500/10 text-blue-500' },
      operations: { label: 'Operações', className: 'bg-green-500/10 text-green-500' },
      campaign_management: { label: 'Campanhas', className: 'bg-orange-500/10 text-orange-500' },
    };
    const entry = map[role] || { label: role, className: 'bg-muted text-muted-foreground' };
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
    <div className="p-6 space-y-6">
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
                      <TableRow key={user.id} className={user.suspended ? 'opacity-60' : ''}>
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
                              disabled={actionLoading === user.id}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
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
    </div>
  );
}
