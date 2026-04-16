import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[ERROR] Missing Supabase credentials');
      return res.status(500).json({ error: 'Missing Supabase credentials' });
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

        if (error) {
          console.error(`[ERROR] Table ${table}:`, error);
          continue;
        }

        if (data) {
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
        console.error(`[ERROR] Exception fetching from table ${table}:`, err);
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

    console.log(`[SUCCESS] Fetched ${sorted.length} leads`);
    return res.status(200).json({ leads: sorted });
  } catch (error) {
    console.error('[ERROR] Unexpected error fetching leads:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
}
