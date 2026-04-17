import { exportUserData, deleteUserData } from '@/lib/enterprise-security';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action');

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or action' }),
        { status: 400 }
      );
    }

    if (action === 'export') {
      const userData = await exportUserData(userId);
      return new Response(JSON.stringify(userData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="data-export-${userId}.json"`,
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400 }
    );
  } catch (error) {
    console.error('GDPR error:', error);
    return new Response(
      JSON.stringify({ error: 'GDPR operation failed' }),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { action, userId } = await request.json();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    if (action === 'delete') {
      const success = await deleteUserData(userId);

      if (success) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', userId);
      }

      return new Response(
        JSON.stringify({ success }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400 }
    );
  } catch (error) {
    console.error('GDPR deletion error:', error);
    return new Response(
      JSON.stringify({ error: 'Deletion failed' }),
      { status: 500 }
    );
  }
}
