import { predictChurn } from '@/lib/ai-scoring';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !leads) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads' }),
        { status: 500 }
      );
    }

    const churnPredictions = await Promise.all(
      leads.map((lead) => predictChurn(lead, leads))
    );

    // Sort by risk score descending
    const sorted = churnPredictions.sort((a, b) => b.riskScore - a.riskScore);

    return new Response(JSON.stringify({ predictions: sorted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error predicting churn:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to predict churn' }),
      { status: 500 }
    );
  }
}
