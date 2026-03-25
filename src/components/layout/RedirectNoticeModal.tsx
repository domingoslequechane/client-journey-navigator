import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Lock, Rocket, UserCheck, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';

export function RedirectNoticeModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const reasonParam = searchParams.get('reason');
    if (reasonParam) {
      setReason(reasonParam);
      setIsOpen(true);
      
      // Clear the param from URL without refreshing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('reason');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getContent = () => {
    switch (reason) {
      case 'onboarding':
        return {
          title: "Configuração Necessária",
          description: "Para começar a usar a plataforma, precisamos que complete as informações básicas da sua agência.",
          icon: <Rocket className="h-6 w-6 text-primary" />,
          buttonText: "Entendido"
        };
      case 'expired':
        return {
          title: "Plano Expirado",
          description: "O período de validade do seu plano terminou. Por favor, renove a sua subscrição para continuar a aceder a todas as funcionalidades.",
          icon: <AlertCircle className="h-6 w-6 text-destructive" />,
          buttonText: "Ver Planos"
        };
      case 'no_plan':
        return {
          title: "Escolha um Plano",
          description: "A sua agência ainda não tem um plano ativo. Escolha o plano que melhor se adapta às suas necessidades para começar.",
          icon: <Lock className="h-6 w-6 text-amber-500" />,
          buttonText: "Escolher Plano"
        };
      default:
        return {
          title: "Acesso Condicionado",
          description: "Foi redirecionado porque esta funcionalidade requer uma configuração adicional ou um plano superior.",
          icon: <Info className="h-6 w-6 text-blue-500" />,
          buttonText: "Continuar"
        };
    }
  };

  const content = getContent();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent mb-4">
            {content.icon}
          </div>
          <DialogTitle className="text-center text-xl">{content.title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {content.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center mt-4">
          <Button type="button" onClick={() => setIsOpen(false)} className="w-full sm:w-auto px-8">
            {content.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
