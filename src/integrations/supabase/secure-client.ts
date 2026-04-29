import { supabase } from './client';
import { sanitizeObject } from '@/lib/sanitize';

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