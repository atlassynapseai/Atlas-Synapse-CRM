import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);
    const { data: leads } = await supabase.from('leads').select('*');
    
    const action = req.query.action || 'churn';
    
    if (action === 'churn') {
      const predictions = leads?.map((l: any) => ({ leadId: l.id, riskScore: Math.round(Math.random() * 100), signals: [] })) || [];
      return res.json({ predictions: predictions.sort((a: any, b: any) => b.riskScore - a.riskScore) });
    } else if (action === 'deals') {
      const deals = leads?.map((l: any) => ({ leadId: l.id, winProbability: Math.round(Math.random() * 100), indicators: [] })) || [];
      return res.json({ deals: deals.sort((a: any, b: any) => b.winProbability - a.winProbability) });
    }
    return res.json({ data: leads });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
