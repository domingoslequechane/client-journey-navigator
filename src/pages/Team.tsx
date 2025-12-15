import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Loader2, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

interface TeamMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'sales' | 'operations' | 'campaign_management' | 'admin';
  created_at: string | null;
  email?: string;
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

const inviteSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  fullName: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }),
  role: z.enum(['sales', 'operations', 'campaign_management'], { message: 'Selecione uma função' }),
});

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>('');
  const [errors, setErrors] = useState<{ email?: string; fullName?: string; role?: string }>({});

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user emails from auth (only works for admin users via RLS)
      const membersWithEmail = data?.map(member => ({
        ...member,
        email: member.id // We'll show the profile data
      })) || [];

      setMembers(membersWithEmail);
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
      const { data: { session } } = await supabase.auth.getSession();
      
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros da sua equipe e seus níveis de acesso</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Membro
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
      </div>

      <div className="bg-card border border-border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membro</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum membro da equipe encontrado.
                </TableCell>
              </TableRow>
            ) : (
              members.map(member => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {member.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.full_name || 'Sem nome'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ROLE_COLORS[member.role] || ''}>
                      {ROLE_LABELS[member.role] || member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.created_at 
                      ? new Date(member.created_at).toLocaleDateString('pt-BR')
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
