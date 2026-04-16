import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
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

    const tables = ['leads', 'priority_access', 'waitlist', 'requests', 'request_priority_access'];
    const allLeads: any[] = [];

    // Fetch from all tables
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const sourceMap: Record<string, string> = {
            leads: 'manual_add',
            priority_access: 'priority_access',
            request_priority_access: 'priority_access',
            waitlist: 'waitlist',
            requests: 'request_priority_access',
          };

          const leadsWithSource = data.map((item) => ({
            ...item,
            source: item.source || sourceMap[table] || 'other',
            _table: table,
          }));

          allLeads.push(...leadsWithSource);
        }
      } catch (err) {
        console.error(`Error fetching from table ${table}:`, err);
      }
    }

    // Deduplicate by email + name
    const seen = new Set<string>();
    const deduplicated = allLeads.filter((lead) => {
      const key = `${lead.email}:${lead.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by created_at descending
    const sorted = deduplicated.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return new Response(JSON.stringify({ leads: sorted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch leads' }),
      { status: 500 }
    );
  }
}
