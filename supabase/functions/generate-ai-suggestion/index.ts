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

function extractJsonFromResponse(content: string): AISuggestion {
  // Step 1: Try direct parse
  try {
    return JSON.parse(content);
  } catch { /* continue */ }

  // Step 2: Extract from markdown code blocks (```json ... ```)
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch { /* continue */ }
  }

  // Step 3: Find JSON object pattern in mixed text
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Try to repair truncated JSON by balancing braces
      let repaired = jsonMatch[0];
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
        return JSON.parse(repaired);
      } catch { /* continue */ }
    }
  }

  throw new Error('Could not extract valid JSON from AI response');
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

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${geminiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Gemini API error:', response.status, errorText);
      throw new Error(`Google Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    console.log('Gemini response:', content);

    const suggestion: AISuggestion = extractJsonFromResponse(content);

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-ai-suggestion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, suggestion: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
