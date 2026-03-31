import { useState } from 'react';
import { useFinances } from '@/hooks/useFinances';
import { Trash2, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

export function CategoriesTab() {
  const { organizationId: orgId } = useOrganization();
  const { categories, createCategory, deleteCategory } = useFinances();
  const [newRevenueName, setNewRevenueName] = useState('');
  const [newExpenseName, setNewExpenseName] = useState('');

  const revenues = categories.filter(c => c.type === 'RECEITA');
  const expenses = categories.filter(c => c.type === 'DESPESA');

  const handleAddCategory = async (name: string, type: 'RECEITA' | 'DESPESA') => {
    if (!name.trim() || !orgId) return;
    
    await createCategory.mutateAsync({
      name: name.trim(),
      type,
      organization_id: orgId
    });

    if (type === 'RECEITA') setNewRevenueName('');
    else setNewExpenseName('');
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory.mutateAsync(id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex gap-3 text-sm text-primary">
        <Info className="h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Listamos abaixo alguns tipos essenciais de entradas e saídas de dinheiro na sua empresa.</p>
          <p className="opacity-80">Importante: você pode excluir e incluir novos tipos, rolando a página até o final da lista.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* REVENUE COLUMN */}
        <div className="border rounded-2xl overflow-hidden shadow-sm bg-card transition-all hover:shadow-md">
          <div className="bg-emerald-600 py-2 px-4 text-center">
            <h3 className="text-white font-bold text-lg">Receitas</h3>
          </div>
          <div className="divide-y">
            {revenues.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 h-[44px] hover:bg-muted/50 transition-colors group">
                <span className="text-sm font-medium">{cat.name}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso removerá a categoria "{cat.name}". Se houver lançamentos vinculados a ela, a exclusão será impedida para proteger seus dados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            
            {/* Quick Add Revenue */}
            <div className="p-3 bg-muted/20">
              <div className="flex gap-2">
                <Input 
                  placeholder="Novo tipo de receita..." 
                  value={newRevenueName}
                  onChange={(e) => setNewRevenueName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory(newRevenueName, 'RECEITA')}
                  className="h-9 text-sm"
                />
                <Button 
                  size="icon" 
                  className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleAddCategory(newRevenueName, 'RECEITA')}
                  disabled={!newRevenueName.trim() || createCategory.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* EXPENSE COLUMN */}
        <div className="border rounded-2xl overflow-hidden shadow-sm bg-card transition-all hover:shadow-md">
          <div className="bg-rose-700 py-2 px-4 text-center">
            <h3 className="text-white font-bold text-lg">Despesas</h3>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {expenses.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-4 h-[44px] hover:bg-muted/50 transition-colors group">
                <span className="text-sm font-medium">{cat.name}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso removerá a categoria "{cat.name}". Se houver lançamentos vinculados a ela, a exclusão será impedida para proteger seus dados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            
            {/* Quick Add Expense */}
            <div className="p-3 bg-muted/20">
              <div className="flex gap-2">
                <Input 
                  placeholder="Novo tipo de despesa..." 
                  value={newExpenseName}
                  onChange={(e) => setNewExpenseName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory(newExpenseName, 'DESPESA')}
                  className="h-9 text-sm"
                />
                <Button 
                  size="icon" 
                  className="h-9 w-9 bg-rose-700 hover:bg-rose-800"
                  onClick={() => handleAddCategory(newExpenseName, 'DESPESA')}
                  disabled={!newExpenseName.trim() || createCategory.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
