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
import { Search, Building2, Trash2, Users, Briefcase, Phone, User, MessageCircle, Edit2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  representative_name?: string | null;
  phone?: string | null;
}

export default function AdminAgencies() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [confirmName, setConfirmName] = useState('');
  
  const [editForm, setEditForm] = useState({
    name: '',
    representative_name: '',
    phone: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      // @ts-expect-error - RPC types not yet generated
      const { data, error } = await supabase.rpc('admin_get_agencies_stats');
      if (error) throw error;

      const mappedAgencies = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        representative_name: row.representative_name,
        phone: row.phone,
        members_count: Number(row.members_count) || 0,
        clients_count: Number(row.clients_count) || 0,
        status: row.subscription_status || 'none',
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

    const channels = [
      supabase.channel('agencies-orgs').on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, () => fetchAgencies()).subscribe(),
      supabase.channel('agencies-members').on('postgres_changes', { event: '*', schema: 'public', table: 'organization_members' }, () => fetchAgencies()).subscribe(),
      supabase.channel('agencies-subs').on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => fetchAgencies()).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
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

  const handleUpdateAgency = async () => {
    if (!editingAgency) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editForm.name,
          representative_name: editForm.representative_name,
          phone: editForm.phone
        })
        .eq('id', editingAgency.id);

      if (error) throw error;

      toast.success('Agência atualizada com sucesso');
      setEditingAgency(null);
      await fetchAgencies();
    } catch (err) {
      console.error('Error updating agency:', err);
      toast.error('Erro ao atualizar agência');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(search.toLowerCase()) ||
    agency.representative_name?.toLowerCase().includes(search.toLowerCase()) ||
    agency.phone?.includes(search)
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
    <div className="p-4 md:p-6 space-y-5 md:space-y-6">
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
                      <TableHead>Representante</TableHead>
                      <TableHead>Contacto</TableHead>
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
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{agency.representative_name || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-mono">{agency.phone || '—'}</span>
                            {agency.phone && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                onClick={() => window.open(`https://wa.me/${agency.phone?.replace(/\D/g, '')}`, '_blank')}
                                title="Contactar via WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => {
                                setEditingAgency(agency);
                                setEditForm({
                                  name: agency.name,
                                  representative_name: agency.representative_name || '',
                                  phone: agency.phone || ''
                                });
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-1" /> Editar
                            </Button>
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAgencies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
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

      {/* Modal para Editar Agência */}
      <Dialog open={!!editingAgency} onOpenChange={(open) => !open && setEditingAgency(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" /> Editar Informações da Agência
            </DialogTitle>
            <DialogDescription>
              Atualize os detalhes de contacto e representante desta agência.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agency-name">Nome da Agência</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="agency-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="pl-9"
                  placeholder="Nome da empresa"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rep-name">Nome do Representante</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="rep-name"
                  value={editForm.representative_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, representative_name: e.target.value }))}
                  className="pl-9"
                  placeholder="Ex: João Silva"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rep-phone">Contacto (WhatsApp)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="rep-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="pl-9"
                  placeholder="+258 8X XXX XXXX"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">
                Utilizado para o follow-up rápido via WhatsApp no painel.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAgency(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateAgency} 
              disabled={isUpdating || !editForm.name}
            >
              {isUpdating ? 'A guardar...' : 'Guardar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
