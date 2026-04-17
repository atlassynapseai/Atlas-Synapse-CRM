import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Missing credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !leads) {
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    const churnPredictions = leads.map((lead: any) => ({
      leadId: lead.id,
      riskScore: Math.round(Math.random() * 100),
      signals: ['Low engagement'],
      daysInactive: Math.floor(Math.random() * 90),
    }));

    return res.status(200).json({ predictions: churnPredictions.sort((a: any, b: any) => b.riskScore - a.riskScore) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
