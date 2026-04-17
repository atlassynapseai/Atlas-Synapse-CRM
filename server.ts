import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(express.json());

// API Routes
app.get('/api/fetch-leads', async (req, res) => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const tables = ['leads', 'priority_access', 'waitlist', 'requests', 'request_priority_access'];
    const allLeads: any[] = [];
    const debug: Record<string, number> = {};

    // Fetch from all tables
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`Error fetching from ${table}:`, error.message);
          debug[table] = 0;
        } else if (data) {
          debug[table] = data.length;
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

    return res.status(200).json({ leads: sorted, debug });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Serve static files from dist (for production)
app.use(express.static(path.join(__dirname, 'dist')));

// Serve frontend on all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
