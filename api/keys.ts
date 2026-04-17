import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    const { action, name } = await request.json();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (action === 'create') {
      // Generate cryptographically secure API key
      const apiKey = `atlas_${randomBytes(24).toString('hex')}`;

      const { data, error } = await supabase.from('api_keys').insert({
        name,
        key: apiKey,
        created_at: new Date().toISOString(),
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ apiKey, name }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'list') {
      const { data, error } = await supabase.from('api_keys').select('name, created_at');

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500 }
        );
      }

      return new Response(JSON.stringify({ keys: data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400 }
    );
  } catch (error) {
    console.error('API key error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to manage API keys' }),
      { status: 500 }
    );
  }
}

// Validate API key middleware
export function validateAPIKey(apiKey: string): boolean {
  // In production: lookup in database
  return apiKey.startsWith('atlas_');
}
