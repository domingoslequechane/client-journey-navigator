import { z } from 'zod';

export const clientSchema = z.object({
  companyName: z
    .string()
    .min(2, { message: 'Nome da empresa deve ter no mínimo 2 caracteres' })
    .max(100, { message: 'Nome da empresa deve ter no máximo 100 caracteres' }),
  contactName: z
    .string()
    .min(2, { message: 'Nome do contato deve ter no mínimo 2 caracteres' })
    .max(100, { message: 'Nome do contato deve ter no máximo 100 caracteres' }),
  email: z
    .string()
    .email({ message: 'E-mail inválido' })
    .max(255, { message: 'E-mail muito longo' })
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(8, { message: 'Telefone deve ter no mínimo 8 caracteres' })
    .max(20, { message: 'Telefone muito longo' })
    .regex(/^[\+]?[0-9\s\-\(\)]+$/, { message: 'Formato de telefone inválido' }),
  website: z
    .string()
    .max(200, { message: 'Website muito longo' })
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(300, { message: 'Endereço muito longo' })
    .optional()
    .or(z.literal('')),
  monthlyBudget: z
    .number()
    .min(0, { message: 'Orçamento não pode ser negativo' })
    .max(1000000000, { message: 'Orçamento excede o limite' })
    .optional(),
  paidTrafficBudget: z
    .number()
    .min(0, { message: 'Orçamento não pode ser negativo' })
    .max(1000000000, { message: 'Orçamento excede o limite' })
    .optional(),
  notes: z
    .string()
    .max(2000, { message: 'Observações devem ter no máximo 2000 caracteres' })
    .optional()
    .or(z.literal('')),
  source: z.string().optional(),
  currentStage: z.string().optional(),
  qualification: z.enum(['cold', 'warm', 'hot', 'qualified']).optional(),
  bantBudget: z.number().min(0).max(10).optional(),
  bantAuthority: z.number().min(0).max(10).optional(),
  bantNeed: z.number().min(0).max(10).optional(),
  bantTimeline: z.number().min(0).max(10).optional(),
  services: z.array(z.string()).optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
