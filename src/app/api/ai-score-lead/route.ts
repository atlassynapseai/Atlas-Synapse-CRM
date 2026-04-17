import { scoreLeadWithAI, generateNextActions } from '@/lib/ai-scoring';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { status: 404 }
      );
    }

    const [scoring, actions] = await Promise.all([
      scoreLeadWithAI(lead),
      generateNextActions(lead),
    ]);

    return new Response(
      JSON.stringify({ scoring, actions }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error scoring lead:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to score lead' }),
      { status: 500 }
    );
  }
}
