import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Stricter limit for sensitive endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Stricter limit for API endpoints
  message: 'Too many API requests from this IP, please try again later.',
});

// Middleware
app.use(express.json());
app.use(limiter); // Apply general rate limiting to all routes

// API Routes
app.get('/api/fetch-leads', apiLimiter, async (req, res) => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const tables = ['leads', 'priority_access_requests', 'waitlist_signups'];
    const allLeads: any[] = [];
    const debug: Record<string, number> = {};

    // Fetch from all tables with improved error handling and schema mapping
    for (const table of tables) {
      try {
        console.log(`[INFO] Fetching from table: ${table}`);

        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn(`[WARN] Error fetching from ${table}: ${error.message}`);
          debug[table] = 0;
          continue;
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
              name = `${item.first_name || ''} ${item.last_name || ''}`.trim();
              email = item.email || '';
              company = item.company || '';
            } else {
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
