import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PixPayment {
  txid: string;
  valor: number;
  horario: string;
  pagador?: {
    nome?: string;
    cpf?: string;
  };
  endToEndId?: string;
}

interface BankConnection {
  bank_id: string;
  enabled: boolean;
  pix_key?: string;
  access_token?: string;
  refresh_token?: string;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== VERIFICAÇÃO AUTOMÁTICA DE PAGAMENTOS PIX ===');
    console.log('Horário:', new Date().toISOString());

    // Buscar configuração de conexão bancária
    const { data: settingsData, error: settingsError } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'bank_connections')
      .maybeSingle();

    if (settingsError || !settingsData) {
      console.log('Nenhuma conexão bancária configurada');
      return new Response(
        JSON.stringify({ success: true, message: 'Sem conexão bancária', verified: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connections = settingsData.value as Record<string, BankConnection>;
    const activeConnection = Object.values(connections).find(c => c.status === 'connected' && c.enabled);

    if (!activeConnection) {
      console.log('Nenhuma conexão bancária ativa');
      return new Response(
        JSON.stringify({ success: true, message: 'Sem conexão ativa', verified: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixKey = activeConnection.pix_key;
    console.log(`Verificando pagamentos para chave PIX: ${pixKey?.substring(0, 4)}...`);

    // Buscar pedidos pendentes de PIX
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['pending_pix', 'pending'])
      .eq('payment_method', 'pix')
      .order('created_at', { ascending: false })
      .limit(50);

    if (ordersError) {
      throw ordersError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('Nenhum pedido PIX pendente');
      return new Response(
        JSON.stringify({ success: true, message: 'Sem pedidos pendentes', verified: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontrados ${pendingOrders.length} pedidos pendentes`);

    let confirmedCount = 0;
    const results: Array<{ order_nsu: string; status: string; message?: string }> = [];

    // Verificar cada pedido pendente
    for (const order of pendingOrders) {
      try {
        // Simular verificação de pagamento via API bancária
        // Em produção, aqui seria a chamada para a API do banco via Open Finance
        const paymentConfirmed = await checkPaymentReceived(
          pixKey!,
          order.total_amount / 100, // converter centavos para reais
          order.order_nsu,
          order.created_at
        );

        if (paymentConfirmed) {
          // Confirmar o pagamento
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'paid',
              paid_amount: order.total_amount,
              confirmation_mode: 'automatic',
              confirmation_source: 'bank_api',
              pix_confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`Erro ao confirmar pedido ${order.order_nsu}:`, updateError);
            results.push({ order_nsu: order.order_nsu, status: 'error', message: updateError.message });
          } else {
            console.log(`✅ Pedido ${order.order_nsu} CONFIRMADO automaticamente!`);
            confirmedCount++;
            results.push({ order_nsu: order.order_nsu, status: 'confirmed' });

            // Enviar notificações
            await sendNotifications(supabase, order);
          }
        } else {
          // Verificar se o pedido é muito antigo (> 24h)
          const orderAge = Date.now() - new Date(order.created_at).getTime();
          const hoursOld = orderAge / (1000 * 60 * 60);

          if (hoursOld > 24) {
            console.log(`⚠️ Pedido ${order.order_nsu} pendente há ${hoursOld.toFixed(1)} horas`);
          }

          results.push({ order_nsu: order.order_nsu, status: 'pending' });
        }
      } catch (orderError) {
        console.error(`Erro ao verificar pedido ${order.order_nsu}:`, orderError);
        results.push({
          order_nsu: order.order_nsu,
          status: 'error',
          message: orderError instanceof Error ? orderError.message : 'Erro desconhecido'
        });
      }
    }

    // Registrar log da verificação
    console.log('=== RESUMO ===');
    console.log(`Verificados: ${pendingOrders.length}`);
    console.log(`Confirmados: ${confirmedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        verified: pendingOrders.length,
        confirmed: confirmedCount,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na verificação:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erro na verificação',
        error: error instanceof Error ? error.message : 'Desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função para verificar se um pagamento foi recebido
async function checkPaymentReceived(
  pixKey: string,
  expectedAmount: number,
  orderNsu: string,
  orderDate: string
): Promise<boolean> {
  // Em produção, isso seria uma chamada real para a API do banco via Open Finance
  // Por enquanto, simula uma verificação básica
  
  console.log(`Verificando pagamento para ${orderNsu}: R$ ${expectedAmount.toFixed(2)}`);
  
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // TODO: Implementar integração real com APIs bancárias
  // - Open Finance / PIX API
  // - Webhooks bancários
  // - Consulta de extratos
  
  // Por enquanto, sempre retorna false (pendente)
  // Em produção, isso consultaria a API do banco
  return false;
}

// Enviar notificações após confirmação
async function sendNotifications(supabase: any, order: any): Promise<void> {
  try {
    // Enviar email
    if (order.customer_email) {
      await supabase.functions.invoke('send-order-emails', {
        body: {
          orderNsu: order.order_nsu,
          customerName: order.customer_name || 'Cliente',
          customerEmail: order.customer_email,
          totalAmount: order.total_amount / 100,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
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
