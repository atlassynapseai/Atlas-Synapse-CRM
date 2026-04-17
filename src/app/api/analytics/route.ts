import {
  calculatePipelineMetrics,
  analyzeTerritories,
  forecastRevenue,
  generateReport,
} from '@/lib/analytics';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
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

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*');

    if (error || !leads) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch leads' }),
        { status: 500 }
      );
    }

    const metrics = calculatePipelineMetrics(leads);
    const territories = analyzeTerritories(leads);
    const forecasts = forecastRevenue([
      { period: 'Month -3', value: 50000 },
      { period: 'Month -2', value: 60000 },
      { period: 'Month -1', value: 65000 },
    ]);
    const report = generateReport(leads);

    return new Response(
      JSON.stringify({
        metrics,
        territories,
        forecasts,
        report,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating analytics:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate analytics' }),
      { status: 500 }
    );
  }
}
