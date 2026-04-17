import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[ERROR] Missing Supabase credentials');
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const tables = ['leads', 'priority_access_requests', 'waitlist_signups'];
    const allLeads: any[] = [];
    const debug: Record<string, number> = {};

    // Fetch from all tables
    for (const table of tables) {
      try {
        console.log(`[INFO] Fetching from table: ${table}`);

        // Try with ordering first
        let { data, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn(`[WARN] Order failed for ${table}, retrying without order - Error: ${error.message}`);
          // Fallback: try without ordering
          const fallback = await supabase.from(table).select('*');
          data = fallback.data;
          error = fallback.error;

          if (error) {
            console.error(`[ERROR] Table ${table}: ${error.code} - ${error.message}`);
            debug[table] = -1;
            continue;
          }
        }

        console.log(`[SUCCESS] Table ${table}: ${data?.length || 0} rows`);
        debug[table] = data?.length || 0;

        if (data && Array.isArray(data) && data.length > 0) {
          const sourceMap: Record<string, string> = {
            leads: 'manual_add',
            priority_access_requests: 'priority_access',
            waitlist_signups: 'waitlist',
          };

          const leadsWithSource = data.map((item: any) => {
            // Handle different table schemas
            let name = '';
            let email = '';
            let company = '';

            if (table === 'priority_access_requests') {
              // Combine first_name and last_name
              name = `${item.first_name || ''} ${item.last_name || ''}`.trim();
              email = item.email || '';
              company = item.company || '';
            } else if (table === 'waitlist_signups') {
              name = item.name || '';
              email = item.email || '';
              company = item.company || '';
            } else {
              // leads table
              name = item.name || '';
              email = item.email || '';
              company = item.company || '';
            }

            return {
              id: item.id?.toString() || `${table}-${Math.random()}`,
              name: name || 'Unknown',
              email: email || '',
              company: company || '',
              phone: item.phone || '',
              industry: item.industry || '',
              ai_tools: item.ai_tasks || item.ai_tools || '',
              stage: item.stage || 'New',
              value: item.value || 0,
              notes: item.notes || `From ${table}`,
              source: item.source || sourceMap[table] || 'other',
              created_at: item.created_at || new Date().toISOString(),
              log: item.log || [],
              risk_score: item.risk_score,
              updated_at: item.updated_at,
              status: item.status,
              _table: table,
            };
          });

          allLeads.push(...leadsWithSource);
        }
      } catch (err) {
        console.error(`[ERROR] Exception fetching from table ${table}:`, err);
        debug[table] = -1;
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

    console.log(`[SUCCESS] Fetched ${sorted.length} leads, debug:`, debug);
    return res.status(200).json({ leads: sorted, debug });
  } catch (error) {
    console.error('[ERROR] Unexpected error fetching leads:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
}
