import { supabase } from './client';
import { sanitizeInput } from '@/lib/sanitize';

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' ? sanitizeObject(item as Record<string, unknown>) : item
      );
    } else if (typeof value === 'object') {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

export const secureInsert = async (
  table: string,
  data: Record<string, unknown>
) => {
  const sanitized = sanitizeObject(data);
  return (supabase as any).from(table).insert(sanitized);
};

export const secureUpdate = async (
  table: string,
  data: Record<string, unknown>,
  filters: Record<string, unknown>
) => {
  const sanitized = sanitizeObject(data);
  let query = (supabase as any).from(table).update(sanitized);
  
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  
  return query;
};

export const secureUpsert = async (
  table: string,
  data: Record<string, unknown>
) => {
  const sanitized = sanitizeObject(data);
  return (supabase as any).from(table).upsert(sanitized);
};