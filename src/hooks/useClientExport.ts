import { useCallback } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

export function useClientExport() {
  const exportToCSV = useCallback((clients: Client[], filename: string = 'clientes') => {
    const headers = [
      'Empresa',
      'Contato',
      'Email',
      'Telefone',
      'Website',
      'Endereço',
      'Fonte',
      'Fase',
      'Qualificação',
      'BANT Budget',
      'BANT Authority',
      'BANT Need',
      'BANT Timeline',
      'Orçamento Mensal',
      'Criado em',
    ];

    const rows = clients.map(client => [
      client.company_name,
      client.contact_name,
      client.email || '',
      client.phone || '',
      client.website || '',
      client.address || '',
      client.source || '',
      client.current_stage,
      client.qualification,
      client.bant_budget || 0,
      client.bant_authority || 0,
      client.bant_need || 0,
      client.bant_timeline || 0,
      client.monthly_budget || '',
      new Date(client.created_at).toLocaleDateString('pt-BR'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          const cellStr = String(cell);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  return { exportToCSV };
}
