export type TransactionType = 'RECEITA' | 'DESPESA' | 'SALDO INICIAL';
export type ExpenseClassification = 'FIXA' | 'UNICA' | 'VARIAVEL';

export interface FinanceCategory {
  id: string;
  organization_id: string;
  type: 'RECEITA' | 'DESPESA';
  name: string;
  created_at: string;
}

export interface FinanceTransaction {
  id: string;
  organization_id: string;
  type: TransactionType;
  category_id: string | null;
  classification?: ExpenseClassification | null;
  description: string;
  amount: number;
  date: string;
  due_date?: string | null;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined relation
  category?: FinanceCategory | null;
}

export interface MonthlyOverview {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}
