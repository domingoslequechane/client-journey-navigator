 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useOrganizationCurrency } from '@/hooks/useOrganizationCurrency';
 
 interface QuickFinanceStats {
   monthlyIncome: number;
   monthlyExpenses: number;
   netBalance: number;
   loading: boolean;
 }
 
 export function useQuickFinanceStats(): QuickFinanceStats {
   const [stats, setStats] = useState<Omit<QuickFinanceStats, 'loading'>>({
     monthlyIncome: 0,
     monthlyExpenses: 0,
     netBalance: 0,
   });
   const [loading, setLoading] = useState(true);
   const { organizationId } = useOrganizationCurrency();
 
   useEffect(() => {
     if (!organizationId) {
       setLoading(false);
       return;
     }
 
     const fetchStats = async () => {
       try {
         // Get current month range
         const now = new Date();
         const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
         const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
 
         const { data: transactions } = await supabase
           .from('financial_transactions')
           .select('type, amount')
           .eq('organization_id', organizationId)
           .gte('date', startOfMonth)
           .lte('date', endOfMonth);
 
         const income = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
         const expenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
 
         setStats({
           monthlyIncome: income,
           monthlyExpenses: expenses,
           netBalance: income - expenses,
         });
       } catch (error) {
         console.error('Error fetching quick finance stats:', error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchStats();
   }, [organizationId]);
 
   return { ...stats, loading };
 }