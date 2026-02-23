import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const systemPrompt = `Você é a assistente virtual da Species, uma loja online especializada em especiarias, temperos, ervas e produtos gourmet premium.

Sobre a Species:
- Vendemos temperos artesanais de alta qualidade
- Produtos incluem: ervas, especiarias, sais gourmet, kits de presentes
- Frete grátis em compras acima de R$150
- Entregamos para todo o Brasil
- Aceitamos PIX, cartão de crédito e boleto
- Parcelamos em até 12x sem juros para compras acima de R$100

Políticas:
- Prazo de entrega: 1-3 dias úteis (São Paulo), 3-10 dias úteis (outras regiões)
- Trocas e devoluções: até 7 dias após recebimento
- Produto deve estar lacrado e na embalagem original

Horário de atendimento: Seg-Sex 9h-18h, Sáb 9h-13h

Contatos:
- WhatsApp: (11) 91977-8073
- E-mail: specieecommerce@gmail.com
- Endereço: Rua Peixoto Gomide 448, São Paulo, SP

Instruções:
- Seja simpática, prestativa e objetiva
- Responda em português brasileiro
- Use emojis com moderação para ser mais amigável
- Se não souber a resposta, direcione para o WhatsApp
- Mantenha respostas curtas e diretas (máximo 3 frases)
- Para dúvidas sobre pedidos específicos, peça o número do pedido`;

// Input validation schema
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validationResult = RequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid message format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter out any 'system' role attempts and sanitize
    const sanitizedMessages = validationResult.data.messages.map(m => ({
      role: m.role,
      content: m.content.substring(0, 2000),
    }));

    console.log('Received messages count:', sanitizedMessages.length);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...sanitizedMessages
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();

    const assistantMessage = data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

    return new Response(JSON.stringify({ message: assistantMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-bot function:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro ao processar mensagem',
      message: 'Desculpe, ocorreu um erro. Por favor, tente novamente ou entre em contato pelo WhatsApp (11) 91977-8073.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
