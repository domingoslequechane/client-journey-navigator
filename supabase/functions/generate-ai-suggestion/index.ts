import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  qualification: string;
  current_stage: string;
  bant_budget: number | null;
  bant_authority: number | null;
  bant_need: number | null;
  bant_timeline: number | null;
  updated_at: string;
  source: string | null;
  monthly_budget: number | null;
}

interface AISuggestion {
  type: 'call' | 'email' | 'meeting' | 'followup';
  message: string;
  clientId: string;
  clientName: string;
  priority: 'high' | 'medium' | 'low';
  conversionChance: number;
  action: string;
}

function extractJsonFromResponse(content: string, clients: Array<{ id: string; company: string }>): AISuggestion {
  const cleanedVariants = [
    content,
    // Strip markdown code blocks
    content.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim(),
  ];

  for (const variant of cleanedVariants) {
    // Try direct parse
    try {
      const parsed = JSON.parse(variant);
      if (parsed && parsed.type) return parsed;
    } catch { /* continue */ }

    // Find JSON object in text
    const jsonMatch = variant.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let candidate = jsonMatch[0];

      // Clean control chars and trailing commas
      candidate = candidate
        .replace(/[\x00-\x1F\x7F]/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      try {
        const parsed = JSON.parse(candidate);
        if (parsed && parsed.type) return parsed;
      } catch {
        // Try to repair by balancing braces/brackets and closing open strings
        let repaired = candidate;

        // Close any unclosed string values by finding last unmatched quote
        let inString = false;
        let lastQuotePos = -1;
        for (let i = 0; i < repaired.length; i++) {
          if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
            inString = !inString;
            lastQuotePos = i;
          }
        }
        if (inString) {
          repaired += '"';
        }

        // Balance braces and brackets
        let braces = 0, brackets = 0;
        for (const char of repaired) {
          if (char === '{') braces++;
          if (char === '}') braces--;
          if (char === '[') brackets++;
          if (char === ']') brackets--;
        }
        while (brackets > 0) { repaired += ']'; brackets--; }
        while (braces > 0) { repaired += '}'; braces--; }

        try {
          const parsed = JSON.parse(repaired);
          if (parsed && parsed.type) return parsed;
        } catch { /* continue */ }
      }
    }
  }

  // Fallback: return a generic suggestion using the first client
  console.warn('Could not parse AI response, returning fallback suggestion. Raw:', content.substring(0, 200));
  const fallbackClient = clients[0] || { id: 'unknown', company: 'Cliente' };
  return {
    type: 'followup',
    clientId: fallbackClient.id,
    clientName: fallbackClient.company,
    message: 'Recomendamos fazer um follow-up com este cliente para manter o relacionamento ativo.',
    priority: 'medium',
    conversionChance: 50,
    action: 'Fazer follow-up',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { clients } = await req.json() as { clients: Client[] };

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({ suggestion: null, message: 'No clients to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const clientsData = clients.slice(0, 10).map(c => {
      const hoursSinceUpdate = Math.floor((now.getTime() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60));
      const bantScore = (c.bant_budget || 0) + (c.bant_authority || 0) + (c.bant_need || 0) + (c.bant_timeline || 0);
      return {
        id: c.id,
        company: c.company_name,
        contact: c.contact_name,
        qualification: c.qualification,
        stage: c.current_stage,
        bantScore,
        hoursSinceUpdate,
        source: c.source,
        monthlyBudget: c.monthly_budget
      };
    });

    const systemPrompt = `Sou a QIA, assistente inteligente de vendas especializada em marketing digital e gestão de agências.
Analise os dados dos clientes e sugira a MELHOR ação a ser tomada agora para maximizar conversões.

Considere:
- Tempo desde última interação (priorize leads sem contato há mais de 24h)
- BANT Score (Budget, Authority, Need, Timeline) - máximo 40 pontos
- Estágio no funil (prospeccao → reuniao → contratacao → producao → trafego → retencao → fidelizacao)
- Qualificação do lead (cold, warm, hot, qualified)
- Origem do lead

Responda APENAS com um JSON válido no formato:
{
  "type": "call" | "email" | "meeting" | "followup",
  "clientId": "id do cliente escolhido",
  "clientName": "nome da empresa",
  "message": "mensagem explicando o motivo da sugestão em português (máx 150 caracteres)",
  "priority": "high" | "medium" | "low",
  "conversionChance": número de 1 a 100,
  "action": "texto do botão de ação em português (ex: Ligar agora, Agendar reunião)"
}`;

    const userPrompt = `Dados dos clientes para análise:\n${JSON.stringify(clientsData, null, 2)}\n\nData/hora atual: ${now.toISOString()}`;

    console.log('Calling Google Gemini API with', clientsData.length, 'clients');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        system_instruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Gemini API error:', response.status, errorText);
      throw new Error(`Google Gemini API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('Gemini full response:', JSON.stringify(data));
      throw new Error('No content in Gemini response');
    }

    console.log('Gemini response:', content);

    const suggestion: AISuggestion = extractJsonFromResponse(content, clientsData);

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-ai-suggestion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, suggestion: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
