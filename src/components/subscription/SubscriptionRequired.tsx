import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, Info, Download } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface SubscriptionRequiredProps {
  feature: string;
  showExportOption?: boolean;
}

export function SubscriptionRequired({ feature, showExportOption = false }: SubscriptionRequiredProps) {
  const { isAdmin } = useUserRole();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Assinatura Necessária</CardTitle>
          <CardDescription className="mt-2">
            Para acessar {feature}, você precisa ter uma assinatura ativa.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {isAdmin ? (
            <>
              <p className="text-sm text-muted-foreground">
                Escolha um plano para desbloquear todas as funcionalidades do sistema.
              </p>
              <Link to="/app/upgrade">
                <Button className="w-full gap-2">
                  <Sparkles className="h-4 w-4" />
                  Ver Planos
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Info className="h-4 w-4" />
              Fale com o administrador da sua organização para assinar um plano.
            </p>
          )}
          
          {showExportOption && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Você ainda pode exportar seus dados existentes
              </p>
              <Link to="/app/clients">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Ir para Clientes
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
