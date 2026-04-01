import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Search, Building2, Trash2, Users, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Agency {
  id: string;
  name: string;
  created_at: string;
  members_count: number;
  clients_count: number;
  status?: string;
}

export default function AdminAgencies() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [confirmName, setConfirmName] = useState('');

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      if (!orgs || orgs.length === 0) {
        setAgencies([]);
        return;
      }

      const orgIds = orgs.map(o => o.id);

      const [{ data: members }, { data: clients }, { data: subs }] = await Promise.all([
        supabase.from('organization_members').select('organization_id').in('organization_id', orgIds),
        supabase.from('clients').select('organization_id').in('organization_id', orgIds),
        supabase.from('subscriptions').select('organization_id, status').in('organization_id', orgIds)
      ]);

      const memberCounts = (members || []).reduce((acc, m) => {
        acc[m.organization_id] = (acc[m.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const clientCounts = (clients || []).reduce((acc, c) => {
        acc[c.organization_id] = (acc[c.organization_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const subStatus = (subs || []).reduce((acc, s) => {
        acc[s.organization_id] = s.status;
        return acc;
      }, {} as Record<string, string>);

      const mappedAgencies = orgs.map(org => ({
        ...org,
        members_count: memberCounts[org.id] || 0,
        clients_count: clientCounts[org.id] || 0,
        status: subStatus[org.id] || 'none'
      }));

      setAgencies(mappedAgencies);
    } catch (err) {
      console.error('Error fetching agencies:', err);
      toast.error('Erro ao carregar agências');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, []);

  const handleDeleteAgency = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      // Usar a RPC criada para deleção segura
      // @ts-expect-error - RPC was just created in DB, types are not updated yet
      const { error } = await supabase.rpc('admin_delete_organization', { target_org_id: id });
      
      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }
      
      toast.success(`Agência ${name} eliminada com sucesso. Os dados e os utilizadores foram removidos.`);
      setConfirmName('');
      setSelectedAgency(null);
      await fetchAgencies();
    } catch (error: any) {
      console.error('Erro ao eliminar agência:', error);
      toast.error(`Erro ao eliminar a agência: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(search.toLowerCase())
  );

  const getSubBadge = (status?: string) => {
    const map: Record<string, { label: string; className: string }> = {
      active: { label: 'Activa', className: 'bg-emerald-500/10 text-emerald-500' },
      trialing: { label: 'Teste', className: 'bg-yellow-500/10 text-yellow-500' },
      none: { label: 'Sem plano', className: 'bg-muted text-muted-foreground' },
      expired: { label: 'Expirada', className: 'bg-red-500/10 text-red-500' },
    };
    const entry = map[status || 'none'] || map.none;
    return <Badge className={`border-0 text-[10px] ${entry.className}`}>{entry.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <AnimatedContainer animation="fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Agências</h1>
            <p className="text-muted-foreground">Gerir todas as agências/organizações registadas</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome..."
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
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Lista de Agências ({filteredAgencies.length})
            </CardTitle>
            <CardDescription>Visão geral de todas as contas e seus membros associados</CardDescription>
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
                      <TableHead>Nome da Agência</TableHead>
                      <TableHead>Status (Plano)</TableHead>
                      <TableHead className="text-center">Colaboradores</TableHead>
                      <TableHead className="text-center">Clientes</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Acções</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgencies.map((agency) => (
                      <TableRow key={agency.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-primary">
                                {agency.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-sm">{agency.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getSubBadge(agency.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono">{agency.members_count}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono">{agency.clients_count}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(agency.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === agency.id}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => {
                              setSelectedAgency(agency);
                              setConfirmName('');
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAgencies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          Nenhuma agência encontrada
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

      {/* Dialog partilhado de eliminação */}
      {selectedAgency && (
        <AlertDialog open={!!selectedAgency} onOpenChange={(open) => !open && setSelectedAgency(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Eliminar Agência Definitivamente
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p className="text-muted-foreground mt-2">
                    Tem a certeza absoluta de que deseja eliminar a agência <strong className="text-foreground">{selectedAgency.name}</strong>?
                  </p>
                  <div className="bg-red-50 border border-red-200 p-3 rounded-md text-red-800 text-sm">
                    <strong>Atenção:</strong> Esta acção é irreversível e irá apagar em cascata:
                    <ul className="list-disc ml-5 mt-1 space-y-0.5">
                      <li>Todos os clientes, contactos e links</li>
                      <li><strong>Todos os utilizadores</strong> que pertencem exclusivamente a esta agência</li>
                      <li>As contas sociais, configurações e posts</li>
                      <li>Histórico de mensagens de chat (Atende AI)</li>
                      <li>Ficheiros, imagens e transacções financeiras</li>
                    </ul>
                  </div>
                  <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium text-foreground">
                      Para confirmar, digite o nome da agência: <span className="font-bold select-none">{selectedAgency.name}</span>
                    </label>
                    <Input
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={selectedAgency.name}
                      autoFocus
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel onClick={() => {
                setSelectedAgency(null);
                setConfirmName('');
              }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteAgency(selectedAgency.id, selectedAgency.name)}
                disabled={confirmName !== selectedAgency.name || deletingId === selectedAgency.id}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50"
              >
                {deletingId === selectedAgency.id ? 'A eliminar...' : 'Eliminar agência e utilizadores'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
