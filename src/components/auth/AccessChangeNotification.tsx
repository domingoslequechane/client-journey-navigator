import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function AccessChangeNotification() {
    const {
        role,
        privileges,
        lastNotifiedRole,
        lastNotifiedPrivileges,
        isLoading,
        isOwner,
        organizationId
    } = usePermissions();
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (isLoading) return;

        // Owners don't need access change notifications for themselves
        if (isOwner) {
            if (isOpen) setIsOpen(false);
            return;
        }

        // Check if anything changed since last notification in DB
        const roleChanged = lastNotifiedRole !== role;

        // Simple array comparison for privileges
        const sortedPrivileges = [...(privileges || [])].sort();
        const sortedLastPrivileges = [...(lastNotifiedPrivileges || [])].sort();

        const privilegesChanged = JSON.stringify(sortedLastPrivileges) !== JSON.stringify(sortedPrivileges);

        if (roleChanged || privilegesChanged) {
            // Even if DB says it's different, check localStorage to prevent 
            // constant re-triggering when switching between agencies with different roles
            const storageKey = `access_notified_${organizationId}_${role}_${JSON.stringify(sortedPrivileges)}`;
            const hasBeenNotifiedLocally = localStorage.getItem(storageKey);

            if (!hasBeenNotifiedLocally) {
                setIsOpen(true);
            }
        }
    }, [role, privileges, lastNotifiedRole, lastNotifiedPrivileges, isLoading, isOwner, organizationId]);

    const handleAcknowledge = async () => {
        setIsUpdating(true);
        try {
            // Update localStorage first to suppress immediately on this device
            const sortedPrivileges = [...(privileges || [])].sort();
            const storageKey = `access_notified_${organizationId}_${role}_${JSON.stringify(sortedPrivileges)}`;
            localStorage.setItem(storageKey, 'true');

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({
                    last_notified_role: role as any,
                    last_notified_privileges: privileges as any
                })
                .eq('id', user.id);

            if (error) throw error;

            setIsOpen(false);
            toast.success("Permissões actualizadas e confirmadas.");
        } catch (error) {
            console.error('Error acknowledging access change:', error);
            toast.error("Erro ao confirmar actualização de acesso.");
        } finally {
            setIsUpdating(false);
        }
    };

    if (!isOpen) return null;

    const isAdmin = role === 'admin' || privileges.includes('admin');

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex justify-center mb-4">
                        {isAdmin ? (
                            <div className="p-3 bg-primary/10 rounded-full">
                                <ShieldCheck className="w-12 h-12 text-primary" />
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-500/10 rounded-full">
                                <Shield className="w-12 h-12 text-amber-500" />
                            </div>
                        )}
                    </div>
                    <DialogTitle className="text-center text-xl">
                        O seu nível de acesso foi actualizado
                    </DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Administradores da agência actualizaram as suas responsabilidades no sistema Qualify.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                            <span className="text-muted-foreground font-normal">Novo Perfil:</span>
                            {isAdmin ? "Administrador" : "Colaborador"}
                        </p>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Privilégios Activos:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {privileges.length > 0 ? (
                                    privileges.map(p => (
                                        <span key={p} className="px-2 py-0.5 bg-background text-[10px] rounded border border-border capitalize">
                                            {p.replace('_', ' ')}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">Acesso básico</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                        {isAdmin
                            ? "Agora tens acesso total a todos os recursos da aplicação."
                            : "Tens acesso personalizado aos módulos necessários para a tua função."}
                    </p>
                </div>

                <DialogFooter className="sm:justify-center">
                    <Button
                        onClick={handleAcknowledge}
                        disabled={isUpdating}
                        className="w-full sm:w-auto"
                    >
                        {isUpdating ? "Confirmando..." : "Entendido"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
