import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, AlertTriangle, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DeleteAgencyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
}

export function DeleteAgencyModal({ 
  open, 
  onOpenChange, 
  organizationId,
  organizationName 
}: DeleteAgencyModalProps) {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<'confirm' | 'otp'>('confirm');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleConfirmDelete = async () => {
    if (!user?.email) return;
    
    setSendingOtp(true);
    try {
      const response = await fetch(
        `https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/send-delete-agency-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ 
            email: user.email,
            organizationName 
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código');
      }

      setStep('otp');
      toast({
        title: 'Código enviado!',
        description: 'Verifique seu e-mail para o código de verificação',
      });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar o código',
        variant: 'destructive',
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleDeleteAgency = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: 'Erro',
        description: 'Digite o código de 6 dígitos',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/delete-agency`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ 
            organizationId,
            otpCode 
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao apagar agência');
      }

      toast({
        title: 'Agência apagada',
        description: 'Todos os dados foram removidos permanentemente',
      });

      // Sign out and redirect
      await signOut();
      window.location.href = '/';
    } catch (error: any) {
      console.error('Error deleting agency:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível apagar a agência',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setOtpCode('');
    onOpenChange(false);
  };

  if (step === 'confirm') {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <AlertDialogTitle>Apagar Agência Permanentemente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a apagar <strong>{organizationName}</strong> e todos os dados associados.
              </p>
              <p className="font-medium text-destructive">
                Esta ação é irreversível! Serão apagados:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Todos os clientes e seus dados</li>
                <li>Histórico de atividades e conversas com IA</li>
                <li>Contratos e documentos</li>
                <li>Membros da equipe</li>
                <li>Configurações e base de conhecimento</li>
                <li>Subscrição e histórico de pagamentos</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={sendingOtp}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {sendingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Enviando código...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Continuar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle>Digite o código de verificação</DialogTitle>
          <DialogDescription>
            Enviamos um código de 6 dígitos para <strong>{user?.email}</strong>. 
            Digite-o abaixo para confirmar a exclusão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Código de verificação</Label>
            <Input
              id="otp"
              type="text"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-widest"
              maxLength={6}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteAgency}
            disabled={loading || otpCode.length !== 6}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Apagando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar Agência
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
