import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BankTransaction {
  date: string;
  amount: number;
  description: string;
  type: 'credit' | 'debit';
  reference?: string;
}

interface PendingOrder {
  id: string;
  order_nsu: string;
  total_amount: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_at: string;
  items: any;
}

interface ReconciliationResult {
  order_nsu: string;
  order_amount: number;
  matched_transaction: BankTransaction | null;
  status: 'matched' | 'not_found' | 'amount_mismatch';
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { transactions, autoConfirm = false } = await req.json();

    console.log('=== PROCESSAMENTO DE EXTRATO BANCÁRIO ===');
    console.log('Transações recebidas:', transactions?.length || 0);
    console.log('Auto-confirmar:', autoConfirm);

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Nenhuma transação fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter only credit transactions (payments received)
    const creditTransactions: BankTransaction[] = transactions.filter(
      (t: BankTransaction) => t.type === 'credit' && t.amount > 0
    );

    console.log('Transações de crédito:', creditTransactions.length);

    // Fetch pending orders
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_nsu, total_amount, customer_name, customer_email, customer_phone, created_at, items')
      .in('status', ['pending', 'pending_pix', 'pending_boleto'])
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Erro ao buscar pedidos:', ordersError);
      throw ordersError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum pedido pendente para reconciliar',
          matched: 0,
          pending: 0,
          transactions_processed: creditTransactions.length,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pedidos pendentes:', pendingOrders.length);

    const results: ReconciliationResult[] = [];
    let matchedCount = 0;
    let confirmedCount = 0;

    // Match transactions to orders
    for (const order of pendingOrders as PendingOrder[]) {
      const orderAmountInReais = order.total_amount / 100;
      
      // Find matching transaction by amount (with tolerance of R$0.01)
      const matchingTransaction = creditTransactions.find(t => {
        const amountMatch = Math.abs(t.amount - orderAmountInReais) < 0.02;
        const orderDate = new Date(order.created_at);
        const transactionDate = new Date(t.date);
        
        // Transaction must be after order creation
        const dateValid = transactionDate >= orderDate;
        
        // Check if description contains order reference or PIX keywords
        const descriptionMatch = 
          t.description.toLowerCase().includes('pix') ||
          t.description.toLowerCase().includes(order.order_nsu.toLowerCase()) ||
          (order.customer_name && t.description.toLowerCase().includes(order.customer_name.toLowerCase()));
        
        return amountMatch && dateValid;
      });

      if (matchingTransaction) {
        matchedCount++;
        
        // Calculate confidence score
        let confidence = 70; // Base confidence for amount match
        if (matchingTransaction.description.toLowerCase().includes('pix')) confidence += 15;
        if (matchingTransaction.description.toLowerCase().includes(order.order_nsu.toLowerCase())) confidence += 15;
        if (order.customer_name && matchingTransaction.description.toLowerCase().includes(order.customer_name.toLowerCase())) confidence += 10;

        results.push({
          order_nsu: order.order_nsu,
          order_amount: orderAmountInReais,
          matched_transaction: matchingTransaction,
          status: 'matched',
          confidence: Math.min(confidence, 100),
        });

        // Auto-confirm if enabled and confidence is high enough
        if (autoConfirm && confidence >= 70) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'paid',
              paid_amount: order.total_amount,
              confirmation_mode: 'bank_statement',
              confirmation_source: 'extrato_bancario',
              pix_confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (!updateError) {
            confirmedCount++;
            console.log(`✅ Pedido ${order.order_nsu} CONFIRMADO via extrato (confiança: ${confidence}%)`);
            
            // Send notifications
            await sendNotifications(supabase, order);
          } else {
            console.error(`Erro ao confirmar pedido ${order.order_nsu}:`, updateError);
          }
        }

        // Remove matched transaction to avoid double matching
        const index = creditTransactions.indexOf(matchingTransaction);
        if (index > -1) {
          creditTransactions.splice(index, 1);
        }
      } else {
        results.push({
          order_nsu: order.order_nsu,
          order_amount: orderAmountInReais,
          matched_transaction: null,
          status: 'not_found',
          confidence: 0,
        });
      }
    }

    console.log('=== RESUMO DA RECONCILIAÇÃO ===');
    console.log(`Pedidos verificados: ${pendingOrders.length}`);
    console.log(`Correspondências encontradas: ${matchedCount}`);
    console.log(`Pagamentos confirmados: ${confirmedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        transactions_processed: transactions.length,
        orders_checked: pendingOrders.length,
        matched: matchedCount,
        confirmed: confirmedCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erro ao processar extrato',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendNotifications(supabase: any, order: PendingOrder): Promise<void> {
  try {
    // Send email
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

    // Send WhatsApp
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
