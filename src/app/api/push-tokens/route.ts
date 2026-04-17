import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { token, userId } = await request.json();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Store push token
    const { data, error } = await supabase.from('push_tokens').upsert({
      token,
      user_id: userId,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, token }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error registering push token:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to register token' }),
      { status: 500 }
    );
  }
}
