import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const leadId = url.searchParams.get('leadId');

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Missing leadId' }),
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ activities: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch activities' }),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { leadId, action, actor, details } = await request.json();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase.from('activity_logs').insert({
      lead_id: leadId,
      action,
      actor,
      details,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ activity: data?.[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create activity' }),
      { status: 500 }
    );
  }
}
