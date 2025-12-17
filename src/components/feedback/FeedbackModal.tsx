import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const feedbackTypes = [
  { value: 'general', label: 'Geral' },
  { value: 'bug', label: 'Reportar Bug' },
  { value: 'feature', label: 'Sugestão de Funcionalidade' },
  { value: 'support', label: 'Suporte Técnico' },
];

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para enviar feedback.',
        variant: 'destructive',
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o assunto e a mensagem.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Get user's organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase.from('feedbacks').insert({
        user_id: user.id,
        user_email: user.email,
        organization_id: profile?.organization_id,
        type,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (error) throw error;

      toast({
        title: 'Feedback enviado!',
        description: 'Obrigado pelo seu feedback. Vamos analisá-lo em breve.',
      });

      // Reset form
      setType('general');
      setSubject('');
      setMessage('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Erro ao enviar feedback',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
          <DialogDescription>
            Compartilhe sua opinião, reporte problemas ou sugira melhorias.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Feedback</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Resumo do seu feedback"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva seu feedback em detalhes..."
              rows={5}
              maxLength={2000}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
