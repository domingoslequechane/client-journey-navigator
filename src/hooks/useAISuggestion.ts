import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

export interface AISuggestion {
  type: 'call' | 'email' | 'meeting' | 'followup';
  message: string;
  clientId: string;
  clientName: string;
  priority: 'high' | 'medium' | 'low';
  conversionChance: number;
  action: string;
}

interface UseAISuggestionResult {
  suggestion: AISuggestion | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

const CACHE_KEY = 'ai_suggestion_cache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CachedSuggestion {
  suggestion: AISuggestion;
  timestamp: number;
}

function getCachedSuggestion(): AISuggestion | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedSuggestion = JSON.parse(cached);
    const now = Date.now();
    
    if (now - parsed.timestamp < CACHE_DURATION_MS) {
      return parsed.suggestion;
    }
    
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedSuggestion(suggestion: AISuggestion): void {
  try {
    const cached: CachedSuggestion = {
      suggestion,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore cache errors
  }
}

export function useAISuggestion(clients: Client[]): UseAISuggestionResult {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSuggestion = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCachedSuggestion();
      if (cached) {
        setSuggestion(cached);
        setLastUpdated(new Date());
        return;
      }
    }

    if (clients.length === 0) {
      setSuggestion(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const priorityClients = clients
        .filter(c => ['prospeccao', 'reuniao', 'contratacao'].includes(c.current_stage))
        .sort((a, b) => {
          const qualOrder = { hot: 0, qualified: 1, warm: 2, cold: 3 };
          return (qualOrder[a.qualification as keyof typeof qualOrder] || 4) - 
                 (qualOrder[b.qualification as keyof typeof qualOrder] || 4);
        })
        .slice(0, 10);

      if (priorityClients.length === 0) {
        setSuggestion(null);
        setIsLoading(false);
        return;
      }

      const clientsData = priorityClients.map(c => ({
        id: c.id,
        company_name: c.company_name,
        contact_name: c.contact_name,
        qualification: c.qualification,
        current_stage: c.current_stage,
        bant_budget: c.bant_budget,
        bant_authority: c.bant_authority,
        bant_need: c.bant_need,
        bant_timeline: c.bant_timeline,
        updated_at: c.updated_at,
        source: c.source,
        monthly_budget: c.monthly_budget,
      }));

      const { data, error: fnError } = await supabase.functions.invoke('generate-ai-suggestion', {
        body: { clients: clientsData }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.suggestion) {
        setSuggestion(data.suggestion);
        setCachedSuggestion(data.suggestion);
        setLastUpdated(new Date());
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        setSuggestion(null);
      }
    } catch (err) {
      console.error('Error fetching AI suggestion:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar sugestão');
      setSuggestion(null);
    } finally {
      setIsLoading(false);
    }
  }, [clients]);

  useEffect(() => {
    if (clients.length > 0) {
      fetchSuggestion();
    }
  }, [clients.length]);

  const refetch = useCallback(async () => {
    await fetchSuggestion(true);
  }, [fetchSuggestion]);

  return { suggestion, isLoading, error, refetch, lastUpdated };
}
