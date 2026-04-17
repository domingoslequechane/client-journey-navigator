import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleLockedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleName: string;
  requiredPlan?: string;
  type?: 'plan' | 'privilege' | 'development';
}

export function ModuleLockedModal({ 
  open, 
  onOpenChange, 
  moduleName, 
  requiredPlan = 'Lança',
  type = 'plan'
}: ModuleLockedModalProps) {
  const navigate = useNavigate();

  const isPrivilege = type === 'privilege';
  const isDevelopment = type === 'development';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-transform hover:scale-110 duration-300">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2 text-center">
            <DialogTitle className="text-xl font-bold">
              {isDevelopment ? 'Em Desenvolvimento' : (isPrivilege ? 'Acesso Restrito' : 'Módulo Bloqueado')}
            </DialogTitle>
            <DialogDescription className="text-sm text-balance">
              {isDevelopment ? (
                <>
                  O módulo <strong>{moduleName}</strong> está a ser construído e será disponibilizado em breve.
                </>
              ) : (isPrivilege ? (
                <>
                  Você não tem permissão para aceder ao módulo <strong>{moduleName}</strong>. 
                  Solicite acesso ao administrador da sua agência.
                </>
              ) : (
                <>
                  O módulo <strong>{moduleName}</strong> está disponível a partir do plano <strong>{requiredPlan}</strong>. 
                  Faça upgrade para desbloquear.
                </>
              ))}
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col gap-2 mt-4">
          {(!isPrivilege && !isDevelopment) && (
            <Button
              className="w-full h-11 gap-2 font-bold shadow-lg shadow-primary/20"
              onClick={() => {
                onOpenChange(false);
                navigate('/app/upgrade');
              }}
            >
              Ver Planos
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          )}
          
          <Button 
            variant={(isPrivilege || isDevelopment) ? "default" : "ghost"} 
            className={cn(
              "w-full h-10 font-medium",
              (isPrivilege || isDevelopment) ? "font-bold" : "text-muted-foreground hover:text-foreground"
            )} 
            onClick={() => onOpenChange(false)}
          >
            {(isPrivilege || isDevelopment) ? "Entendi" : "Fechar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
