import { executeWorkflow } from '@/lib/workflow-engine';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { workflowId, leadId } = await request.json();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch workflow and lead
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (wfError || !workflow || leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Workflow or lead not found' }),
        { status: 404 }
      );
    }

    const result = await executeWorkflow(workflow, lead);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to execute workflow' }),
      { status: 500 }
    );
  }
}
