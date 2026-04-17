import { processIntegrationEvent, handleStripeWebhook, handleZapierWebhook } from '@/lib/integrations';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';
    const provider = request.headers.get('x-provider') || '';

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400 }
      );
    }

    // Route to specific handler
    if (provider === 'stripe') {
      await handleStripeWebhook(data);
    } else if (provider === 'zapier') {
      await handleZapierWebhook(data);
    }

    // Log webhook event
    await supabase.from('webhook_logs').insert({
      provider,
      event: data.type || data.event || 'unknown',
      payload: data,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500 }
    );
  }
}
