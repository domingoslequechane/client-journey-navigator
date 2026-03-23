import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, Info } from "lucide-react";

interface AgencyOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgencyOnboardingModal({ isOpen, onClose }: AgencyOnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Bem-vindo ao Qualify!</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Estamos felizes em ter você conosco. Para desbloquear todas as funcionalidades do sistema, precisamos que complete o perfil da sua agência.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-primary">O que fazer agora?</p>
              <p className="text-muted-foreground mt-1">
                Preencha os dados da sua agência na tela abaixo e clique em <span className="font-bold text-foreground">"Guardar Agência"</span>.
              </p>
            </div>
          </div>
          
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Acesso ao Dashboard e Finanças</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Gerador de Documentos e Link23</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Agentes de IA e Social Media</span>
            </li>
          </ul>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button type="button" onClick={onClose} className="w-full sm:w-auto px-8">
            Entendido, vamos lá!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
