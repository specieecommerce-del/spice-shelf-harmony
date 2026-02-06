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
  transaction_nsu: string | null;
  invoice_slug: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const pagseguroToken = Deno.env.get('PAGSEGURO_TOKEN');
    const pagseguroEmail = Deno.env.get('PAGSEGURO_EMAIL');

    console.log('=== VERIFICAÇÃO AUTOMÁTICA DE PAGAMENTOS ===');
    console.log('Horário:', new Date().toISOString());
    console.log('PagSeguro configurado:', !!(pagseguroToken && pagseguroEmail));

    // Buscar pedidos pendentes (últimas 72h)
    const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_nsu, total_amount, payment_method, customer_name, customer_email, customer_phone, created_at, items, transaction_nsu, invoice_slug')
      .in('status', ['pending', 'pending_pix', 'pending_boleto'])
      .gte('created_at', cutoffDate)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Erro ao buscar pedidos:', fetchError);
      throw fetchError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('Nenhum pedido pendente');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum pedido pendente', verified: 0, confirmed: 0, still_pending: 0, results: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontrados ${pendingOrders.length} pedidos pendentes`);

    let confirmedCount = 0;
    let stillPendingCount = 0;
    const results: Array<{ order_nsu: string; status: string; source?: string; message?: string }> = [];

    for (const order of pendingOrders as PendingOrder[]) {
      try {
        console.log(`Verificando pedido: ${order.order_nsu} (${order.payment_method || 'desconhecido'})`);
        
        let confirmed = false;
        let source = '';

        // 1) Verificar via PagSeguro API
        if (pagseguroToken && pagseguroEmail) {
          const pgResult = await checkPagSeguro(pagseguroEmail, pagseguroToken, order);
          if (pgResult.confirmed) {
            confirmed = true;
            source = 'pagseguro_api';
          }
        }

        // 2) Se não confirmou via PagSeguro, verificar se já existe registro de pagamento aprovado
        if (!confirmed) {
          const approvedResult = await checkApprovedPayments(supabase, order);
          if (approvedResult.confirmed) {
            confirmed = true;
            source = approvedResult.source || 'database_match';
          }
        }

        if (confirmed) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'paid',
              paid_amount: order.total_amount,
              confirmation_mode: 'automatic',
              confirmation_source: source,
              pix_confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`Erro ao confirmar pedido ${order.order_nsu}:`, updateError);
            results.push({ order_nsu: order.order_nsu, status: 'error', message: updateError.message });
          } else {
            console.log(`✅ Pedido ${order.order_nsu} CONFIRMADO via ${source}`);
            confirmedCount++;
            results.push({ order_nsu: order.order_nsu, status: 'confirmed', source });

            // Enviar notificações em background
            sendNotifications(supabase, order).catch(err => console.error('Erro notificações:', err));
          }
        } else {
          stillPendingCount++;
          results.push({ order_nsu: order.order_nsu, status: 'still_pending' });

          const hoursOld = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
          if (hoursOld > 24) {
            console.log(`⚠️ Pedido ${order.order_nsu} pendente há ${hoursOld.toFixed(1)}h`);
          }
        }
      } catch (orderError) {
        console.error(`Erro ao processar ${order.order_nsu}:`, orderError);
        results.push({
          order_nsu: order.order_nsu,
          status: 'error',
          message: orderError instanceof Error ? orderError.message : 'Erro desconhecido'
        });
      }
    }

    // Salvar timestamp da última verificação
    await supabase
      .from('store_settings')
      .upsert({
        key: 'last_auto_verification',
        value: {
          timestamp: new Date().toISOString(),
          verified: pendingOrders.length,
          confirmed: confirmedCount,
          still_pending: stillPendingCount,
        },
      }, { onConflict: 'key' });

    console.log('=== RESUMO ===');
    console.log(`Verificados: ${pendingOrders.length} | Confirmados: ${confirmedCount} | Pendentes: ${stillPendingCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        verified: pendingOrders.length,
        confirmed: confirmedCount,
        still_pending: stillPendingCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na verificação:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno', error: error instanceof Error ? error.message : 'Desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Verificar pagamento via PagSeguro API
async function checkPagSeguro(email: string, token: string, order: PendingOrder): Promise<{ confirmed: boolean }> {
  try {
    // Buscar transação por referência (order_nsu)
    const url = `https://ws.pagseguro.uol.com.br/v3/transactions?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&reference=${encodeURIComponent(order.order_nsu)}&initialDate=${encodeURIComponent(order.created_at.substring(0, 19) + '.000-03:00')}`;
    
    console.log(`PagSeguro: consultando referência ${order.order_nsu}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/xml' },
    });

    if (!response.ok) {
      console.log(`PagSeguro: HTTP ${response.status} para ${order.order_nsu}`);
      return { confirmed: false };
    }

    const xmlText = await response.text();
    
    // Parse simples do XML para encontrar status da transação
    // Status 3 = Paga, 4 = Disponível
    const statusMatch = xmlText.match(/<status>(\d+)<\/status>/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      if (status === 3 || status === 4) {
        console.log(`PagSeguro: Pagamento CONFIRMADO para ${order.order_nsu} (status=${status})`);
        return { confirmed: true };
      }
      console.log(`PagSeguro: status=${status} para ${order.order_nsu} (não confirmado)`);
    }
    
    return { confirmed: false };
  } catch (error) {
    console.log(`PagSeguro: erro ao verificar ${order.order_nsu}:`, error);
    return { confirmed: false };
  }
}

// Verificar se há pagamentos aprovados no banco de dados
async function checkApprovedPayments(supabase: any, order: PendingOrder): Promise<{ confirmed: boolean; source?: string }> {
  try {
    // Verificar se existe algum pedido duplicado já pago com mesmo valor e período próximo
    // Isso pega pagamentos confirmados via webhook que podem ter sido registrados com ID diferente
    const { data: paidOrders } = await supabase
      .from('orders')
      .select('id, order_nsu, confirmation_source')
      .eq('status', 'paid')
      .eq('total_amount', order.total_amount)
      .gte('created_at', order.created_at)
      .limit(1);

    // Não confirmar baseado apenas em valor igual - precisa de match mais forte
    // Verificar via transaction_nsu se disponível
    if (order.transaction_nsu) {
      const { data: matchedOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('transaction_nsu', order.transaction_nsu)
        .eq('status', 'paid')
        .limit(1);

      if (matchedOrders && matchedOrders.length > 0) {
        return { confirmed: true, source: 'transaction_nsu_match' };
      }
    }

    return { confirmed: false };
  } catch (error) {
    console.log('Erro ao verificar pagamentos aprovados:', error);
    return { confirmed: false };
  }
}

// Enviar notificações após confirmação
async function sendNotifications(supabase: any, order: PendingOrder): Promise<void> {
  try {
    if (order.customer_email) {
      const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      await supabase.functions.invoke('send-order-emails', {
        body: {
          orderNsu: order.order_nsu,
          customerName: order.customer_name || 'Cliente',
          customerEmail: order.customer_email,
          totalAmount: order.total_amount / 100,
          items: Array.isArray(items) ? items.map((item: any) => ({
            name: item.name || item.product_name,
            price: (item.price || 0) / 100,
            quantity: item.quantity || 1,
          })) : [],
        },
      });
      console.log(`📧 Email enviado para: ${order.customer_email}`);
    }

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
