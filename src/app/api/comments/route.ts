import { createComment, extractMentions } from '@/lib/collaboration';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { leadId, author, content } = await request.json();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const mentions = extractMentions(content);

    const { data, error } = await supabase.from('comments').insert({
      lead_id: leadId,
      author,
      content,
      mentions,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ comment: data?.[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create comment' }),
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { leadId: string } }
) {
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

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('lead_id', params.leadId)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ comments: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch comments' }),
      { status: 500 }
    );
  }
}
