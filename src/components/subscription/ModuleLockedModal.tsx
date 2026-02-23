import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, ArrowUpRight } from 'lucide-react';

interface ModuleLockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleName: string;
  requiredPlan?: string;
}

export function ModuleLockedModal({ open, onOpenChange, moduleName, requiredPlan = 'Lança' }: ModuleLockedModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Módulo Bloqueado</DialogTitle>
          <DialogDescription className="text-center">
            O módulo <strong>{moduleName}</strong> está disponível a partir do plano <strong>{requiredPlan}</strong>. Faça upgrade para desbloquear.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate('/app/upgrade');
            }}
          >
            Ver Planos
            <ArrowUpRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
