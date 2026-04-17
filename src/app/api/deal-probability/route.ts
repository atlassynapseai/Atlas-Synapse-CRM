import { calculateDealProbability } from '@/lib/ai-scoring';
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

    const dealProbabilities = leads.map((lead) =>
      calculateDealProbability(lead, leads)
    );

    // Sort by win probability descending
    const sorted = dealProbabilities.sort((a, b) => b.winProbability - a.winProbability);

    return new Response(JSON.stringify({ deals: sorted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error calculating deal probability:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate deal probability' }),
      { status: 500 }
    );
  }
}
