// Financial Module Types

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'transfer' | 'mpesa' | 'emola' | 'cash' | 'cheque' | 'other';
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'cancelled';
export type GoalType = 'monthly' | 'quarterly' | 'yearly';

export interface FinanceCategory {
  id: string;
  organizationId: string;
  name: string;
  type: TransactionType;
  color?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  organizationId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  clientId?: string;
  clientName?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceProject {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  clientId?: string;
  clientName?: string;
  budget: number;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceGoal {
  id: string;
  organizationId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  goalType: GoalType;
  year: number;
  month?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeGrowth: number;
  expenseGrowth: number;
  transactionCount: number;
  clientCount: number;
  projectCount: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

// Form types for creating/updating
export interface TransactionFormData {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  clientId?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface ProjectFormData {
  name: string;
  description?: string;
  clientId?: string;
  budget: number;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
}

export interface GoalFormData {
  name: string;
  targetAmount: number;
  goalType: GoalType;
  year: number;
  month?: number;
}

export interface CategoryFormData {
  name: string;
  type: TransactionType;
  color?: string;
}

// Filter types
export interface TransactionFilters {
  type?: TransactionType | 'all';
  categoryId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ProjectFilters {
  status?: ProjectStatus | 'all';
  clientId?: string;
  search?: string;
}

// Payment method labels
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Transferência',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  cash: 'Dinheiro',
  cheque: 'Cheque',
  other: 'Outro',
};

// Project status labels
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planeamento',
  in_progress: 'Em Progresso',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

// Goal type labels
export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

// Default category colors
export const DEFAULT_CATEGORY_COLORS = [
  '#22c55e', // green
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];
