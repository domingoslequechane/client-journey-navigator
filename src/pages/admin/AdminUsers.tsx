import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithOrg {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  suspended: boolean;
  created_at: string | null;
  organization: {
    name: string;
  } | null;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          suspended,
          created_at,
          organization:organizations(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.organization?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-500/10 text-purple-500',
      sales: 'bg-blue-500/10 text-blue-500',
      operations: 'bg-green-500/10 text-green-500',
      campaign_management: 'bg-orange-500/10 text-orange-500',
    };
    return colors[role] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="p-6 space-y-6">
      <AnimatedContainer animation="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerenciar todos os usuários do sistema</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fade-up" delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || '-'}
                        </TableCell>
                        <TableCell>{user.email || '-'}</TableCell>
                        <TableCell>{user.organization?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadge(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.suspended ? (
                            <Badge variant="destructive">Suspenso</Badge>
                          ) : (
                            <Badge className="bg-green-500/10 text-green-500">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.created_at
                            ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum usuário encontrado
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
    </div>
  );
}
