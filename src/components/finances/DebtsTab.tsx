import { useFinances } from '@/hooks/useFinances';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Clock, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FinanceTransaction } from '@/types/finance';
import { useState } from 'react';
import { TransactionModal } from './TransactionModal';

export function DebtsTab() {
  const { currencySymbol } = useOrganization();
  const { useDebtsQuery, updateTransaction } = useFinances();
  const { data: debts, isLoading } = useDebtsQuery();
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);

  const formatValue = (v: number) => {
    return `${currencySymbol} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  if (isLoading) return <div className="p-8 text-center">Carregando dívidas...</div>;

  const today = new Date().toISOString().split('T')[0];
  const overdueDebts = debts?.filter(d => (d.due_date || d.date) < today) || [];
  const upcomingDebts = debts?.filter(d => (d.due_date || d.date) >= today) || [];
  
  const totalOverdue = overdueDebts.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalUpcoming = upcomingDebts.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalGeneral = (debts || []).reduce((acc, curr) => acc + Number(curr.amount), 0);

  const handleMarkAsPaid = async (debt: FinanceTransaction) => {
    await updateTransaction.mutateAsync({
      id: debt.id,
      updates: { 
        is_paid: true,
        date: new Date().toISOString().split('T')[0] // Set payment date to today
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Resumo de Dívidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Total Vencido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatValue(totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{overdueDebts.length} conta(s) atrasada(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              A Vencer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatValue(totalUpcoming)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{upcomingDebts.length} conta(s) no prazo</p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Geral Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold opacity-80">
              {formatValue(totalGeneral)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Soma de todas as obrigações</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Contas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Detalhamento de Contas a Pagar</h3>
          <Badge variant="outline" className="px-3 font-mono">{debts?.length || 0} Itens Pendentes</Badge>
        </div>

        {debts?.length === 0 ? (
          <div className="p-12 text-center border rounded-2xl bg-muted/20 border-dashed">
            <Check className="h-12 w-12 text-emerald-500 mx-auto mb-4 opacity-20" />
            <h3 className="text-muted-foreground font-medium">Nenhuma conta pendente!</h3>
            <p className="text-sm text-muted-foreground">Tudo em dia com o seu financeiro.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {debts?.map((debt) => {
              const isOverdue = (debt.due_date || debt.date) < today;
              return (
                <div 
                  key={debt.id}
                  className={`group flex items-center justify-between p-4 bg-white dark:bg-zinc-900/50 rounded-2xl border transition-all hover:shadow-md ${isOverdue ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'hover:border-primary/20'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${isOverdue ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                      {isOverdue ? <AlertCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{debt.description}</span>
                        {debt.classification && (
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0 h-4 bg-muted/50 border-none">
                            {debt.classification}
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0 h-4 animate-pulse">
                            Vencido
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{debt.category?.name || 'Sem Categoria'}</span>
                        <span className="text-[10px] text-muted-foreground/30">•</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Vence em: {format(new Date(debt.due_date || debt.date), "dd 'de' MMM", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isOverdue ? 'text-amber-600' : ''}`}>
                        {formatValue(debt.amount)}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Valor em Aberto</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 px-3 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors"
                        onClick={() => setEditingTransaction(debt)}
                      >
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2"
                        onClick={() => handleMarkAsPaid(debt)}
                        disabled={updateTransaction.isPending}
                      >
                        <Check className="h-4 w-4" />
                        Marcar como Pago
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingTransaction && (
        <TransactionModal
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          transaction={editingTransaction}
        />
      )}
    </div>
  );
}
