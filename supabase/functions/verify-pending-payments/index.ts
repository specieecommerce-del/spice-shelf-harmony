import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingOrder {
  id: string;
  order_nsu: string;
  total_amount: number;
  payment_method: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_at: string;
  items: any;
}

interface VerificationResult {
  order_nsu: string;
  status: 'confirmed' | 'still_pending' | 'error';
  source?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== VERIFICAÇÃO PERIÓDICA DE PAGAMENTOS ===');
    console.log('Horário:', new Date().toISOString());

    // Buscar todos os pedidos pendentes
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_nsu, total_amount, payment_method, customer_name, customer_email, customer_phone, created_at, items')
      .in('status', ['pending', 'pending_pix', 'pending_boleto'])
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Erro ao buscar pedidos pendentes:', fetchError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao buscar pedidos', error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('Nenhum pedido pendente encontrado');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum pedido pendente',
          verified: 0,
          confirmed: 0,
          still_pending: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontrados ${pendingOrders.length} pedidos pendentes`);

    const results: VerificationResult[] = [];
    let confirmedCount = 0;
    let stillPendingCount = 0;

    // Processar cada pedido pendente
    for (const order of pendingOrders as PendingOrder[]) {
      try {
        console.log(`Verificando pedido: ${order.order_nsu}`);
        
        // Aqui seria a chamada para as APIs de verificação dos gateways
        // Por enquanto, vamos verificar se há alguma atualização via outros meios
        
        const verificationResult = await verificarPagamento(supabase, order);
        
        if (verificationResult.confirmed) {
          // Confirmar o pagamento
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'paid',
              paid_amount: order.total_amount,
              confirmation_mode: 'periodic',
              confirmation_source: verificationResult.source,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`Erro ao atualizar pedido ${order.order_nsu}:`, updateError);
            results.push({
              order_nsu: order.order_nsu,
              status: 'error',
              message: updateError.message
            });
          } else {
            console.log(`✅ Pedido ${order.order_nsu} CONFIRMADO via verificação periódica`);
            confirmedCount++;
            results.push({
              order_nsu: order.order_nsu,
              status: 'confirmed',
              source: verificationResult.source
            });

            // Enviar notificações
            await enviarNotificacoes(supabase, order);
          }
        } else {
          stillPendingCount++;
          results.push({
            order_nsu: order.order_nsu,
            status: 'still_pending'
          });
          
          // Verificar se o pedido está muito antigo (mais de 24h)
          const orderAge = Date.now() - new Date(order.created_at).getTime();
          const hoursOld = orderAge / (1000 * 60 * 60);
          
          if (hoursOld > 24) {
            console.log(`⚠️ Pedido ${order.order_nsu} pendente há ${hoursOld.toFixed(1)} horas`);
          }
        }
      } catch (orderError) {
        console.error(`Erro ao processar pedido ${order.order_nsu}:`, orderError);
        results.push({
          order_nsu: order.order_nsu,
          status: 'error',
          message: orderError instanceof Error ? orderError.message : 'Erro desconhecido'
        });
      }
    }

    // Registrar log de verificação
    console.log('=== RESUMO DA VERIFICAÇÃO ===');
    console.log(`Total verificados: ${pendingOrders.length}`);
    console.log(`Confirmados: ${confirmedCount}`);
    console.log(`Ainda pendentes: ${stillPendingCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        verified: pendingOrders.length,
        confirmed: confirmedCount,
        still_pending: stillPendingCount,
        results: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na verificação periódica:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno', error: error instanceof Error ? error.message : 'Desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função para verificar pagamento em múltiplas fontes
async function verificarPagamento(
  supabase: any, 
  order: PendingOrder
): Promise<{ confirmed: boolean; source?: string }> {
  
  // Lista de fontes ativas para verificação
  const fontesAtivas = [
    { name: 'gateway_api', check: checkGatewayAPI },
    // Futuras fontes:
    // { name: 'banco_api', check: checkBancoAPI },
    // { name: 'open_finance', check: checkOpenFinance },
  ];

  for (const fonte of fontesAtivas) {
    try {
      const isConfirmed = await fonte.check(supabase, order);
      if (isConfirmed) {
        return { confirmed: true, source: fonte.name };
      }
    } catch (error) {
      console.log(`Erro ao verificar fonte ${fonte.name}:`, error);
    }
  }

  return { confirmed: false };
}

// Verificação via API do Gateway
async function checkGatewayAPI(supabase: any, order: PendingOrder): Promise<boolean> {
  // Aqui seria a chamada para a API do gateway para verificar status
  // Por enquanto, retorna false (implementação futura com APIs reais)
  
  // Exemplo de como seria:
  // const infinitePayApiKey = Deno.env.get('INFINITEPAY_API_KEY');
  // if (infinitePayApiKey && order.order_nsu.startsWith('CARD_')) {
  //   const response = await fetch(`https://api.infinitepay.io/v1/orders/${order.order_nsu}`, {
  //     headers: { 'Authorization': `Bearer ${infinitePayApiKey}` }
  //   });
  //   const data = await response.json();
  //   return data.status === 'paid';
  // }
  
  return false;
}

// Enviar notificações após confirmação
async function enviarNotificacoes(supabase: any, order: PendingOrder): Promise<void> {
  try {
    // Enviar email
    if (order.customer_email) {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      
      await supabase.functions.invoke('send-order-emails', {
        body: {
          orderNsu: order.order_nsu,
          customerName: order.customer_name || 'Cliente',
          customerEmail: order.customer_email,
          totalAmount: order.total_amount / 100,
          items: items.map((item: any) => ({
            name: item.name || item.product_name,
            price: (item.price || 0) / 100,
            quantity: item.quantity || 1,
          })),
        },
      });
      console.log(`📧 Email enviado para: ${order.customer_email}`);
    }

    // Enviar WhatsApp
    if (order.customer_phone) {
      await supabase.functions.invoke('order-alert-whatsapp', {
        body: {
          orderNsu: order.order_nsu,
          customerName: order.customer_name || 'Cliente',
          customerPhone: order.customer_phone,
          totalAmount: order.total_amount,
          status: 'paid',
        },
      });
      console.log(`📱 WhatsApp enviado para: ${order.customer_phone}`);
    }
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
  }
}
