import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, CheckCircle, Loader2 } from 'lucide-react';

interface Feedback {
  id: string;
  user_email: string | null;
  type: string;
  subject: string;
  message: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export default function AdminFeedbacks() {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFeedbacks = async () => {
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedbacks:', error);
    } else {
      setFeedbacks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleOpenFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminNotes(feedback.admin_notes || '');
    setNewStatus(feedback.status);
  };

  const handleSave = async () => {
    if (!selectedFeedback) return;

    setSaving(true);
    const { error } = await supabase
      .from('feedbacks')
      .update({
        status: newStatus,
        admin_notes: adminNotes,
      })
      .eq('id', selectedFeedback.id);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Feedback atualizado',
        description: 'As alterações foram salvas.',
      });
      setSelectedFeedback(null);
      fetchFeedbacks();
    }
    setSaving(false);
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, { className: string; label: string }> = {
      general: { className: 'bg-blue-500/10 text-blue-500', label: 'Geral' },
      bug: { className: 'bg-red-500/10 text-red-500', label: 'Bug' },
      feature: { className: 'bg-purple-500/10 text-purple-500', label: 'Funcionalidade' },
      support: { className: 'bg-orange-500/10 text-orange-500', label: 'Suporte' },
    };
    const variant = types[type] || types.general;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, { className: string; label: string }> = {
      pending: { className: 'bg-yellow-500/10 text-yellow-500', label: 'Pendente' },
      reviewed: { className: 'bg-blue-500/10 text-blue-500', label: 'Analisado' },
      resolved: { className: 'bg-green-500/10 text-green-500', label: 'Resolvido' },
    };
    const variant = statuses[status] || statuses.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const filterByStatus = (status: string | null) => {
    if (!status) return feedbacks;
    return feedbacks.filter(f => f.status === status);
  };

  const FeedbackTable = ({ data }: { data: Feedback[] }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Assunto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((feedback) => (
            <TableRow key={feedback.id}>
              <TableCell>{feedback.user_email || '-'}</TableCell>
              <TableCell>{getTypeBadge(feedback.type)}</TableCell>
              <TableCell className="max-w-[200px] truncate">{feedback.subject}</TableCell>
              <TableCell>{getStatusBadge(feedback.status)}</TableCell>
              <TableCell>
                {format(new Date(feedback.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenFeedback(feedback)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhum feedback encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <AnimatedContainer animation="fade-up">
        <div>
          <h1 className="text-3xl font-bold">Feedbacks</h1>
          <p className="text-muted-foreground">Gerenciar feedbacks dos usuários</p>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fade-up" delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Feedbacks ({feedbacks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Tabs defaultValue="pending">
                <TabsList className="mb-4">
                  <TabsTrigger value="pending">Pendentes ({filterByStatus('pending').length})</TabsTrigger>
                  <TabsTrigger value="reviewed">Analisados ({filterByStatus('reviewed').length})</TabsTrigger>
                  <TabsTrigger value="resolved">Resolvidos ({filterByStatus('resolved').length})</TabsTrigger>
                  <TabsTrigger value="all">Todos ({feedbacks.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="pending">
                  <FeedbackTable data={filterByStatus('pending')} />
                </TabsContent>
                <TabsContent value="reviewed">
                  <FeedbackTable data={filterByStatus('reviewed')} />
                </TabsContent>
                <TabsContent value="resolved">
                  <FeedbackTable data={filterByStatus('resolved')} />
                </TabsContent>
                <TabsContent value="all">
                  <FeedbackTable data={feedbacks} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </AnimatedContainer>

      {/* Feedback Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Feedback</DialogTitle>
            <DialogDescription>
              Enviado por {selectedFeedback?.user_email || 'Usuário desconhecido'}
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {getTypeBadge(selectedFeedback.type)}
                {getStatusBadge(selectedFeedback.status)}
              </div>

              <div>
                <Label className="text-muted-foreground">Assunto</Label>
                <p className="font-medium">{selectedFeedback.subject}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Mensagem</Label>
                <p className="whitespace-pre-wrap bg-muted p-3 rounded-lg text-sm">
                  {selectedFeedback.message}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="reviewed">Analisado</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas do Admin</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicione notas internas sobre este feedback..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
