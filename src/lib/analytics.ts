import stats from 'simple-statistics';

interface SalesMetric {
  period: string;
  value: number;
  trend: number;
}

interface Territory {
  name: string;
  revenue: number;
  deals: number;
  quota: number;
}

interface Forecast {
  period: string;
  predicted_revenue: number;
  confidence: number;
}

// Calculate sales pipeline metrics
export function calculatePipelineMetrics(leads: any[]): {
  totalValue: number;
  avgDealSize: number;
  closingRate: number;
  salesCycle: number;
} {
  const won = leads.filter((l) => l.stage === 'Won');
  const total = leads.length;

  const values = won.map((l) => l.value || 0);
  const avgDealSize = values.length > 0 ? stats.mean(values) : 0;
  const totalValue = values.reduce((a, b) => a + b, 0);
  const closingRate = total > 0 ? (won.length / total) * 100 : 0;

  return {
    totalValue,
    avgDealSize,
    closingRate,
    salesCycle: 30, // Default 30 days
  };
}

// Territory performance analysis
export function analyzeTerritories(
  leads: any[],
  groupBy = 'source'
): Territory[] {
  const territories: Record<string, Territory> = {};

  leads.forEach((lead) => {
    const key = lead[groupBy] || 'unassigned';
    if (!territories[key]) {
      territories[key] = {
        name: key,
        revenue: 0,
        deals: 0,
        quota: 50000,
      };
    }

    if (lead.stage === 'Won') {
      territories[key].revenue += lead.value || 0;
      territories[key].deals += 1;
    }
  });

  return Object.values(territories).sort((a, b) => b.revenue - a.revenue);
}

// Forecasting using linear regression
export function forecastRevenue(
  historicalData: SalesMetric[]
): Forecast[] {
  if (historicalData.length < 2) return [];

  const x = historicalData.map((_, i) => i);
  const y = historicalData.map((m) => m.value);

  const slope = stats.linearRegressionLine(stats.linearRegression(x, y));
  const forecasts: Forecast[] = [];

  for (let i = 1; i <= 3; i++) {
    const predicted = slope(historicalData.length + i);
    forecasts.push({
      period: `Month +${i}`,
      predicted_revenue: Math.max(0, predicted),
      confidence: 0.85 - i * 0.1,
    });
  }

  return forecasts;
}

// Generate summary report
export function generateReport(leads: any[]): string {
  const metrics = calculatePipelineMetrics(leads);
  const territories = analyzeTerritories(leads);

  return `
SALES PIPELINE REPORT
━━━━━━━━━━━━━━━━━━━
Total Pipeline Value: $${metrics.totalValue.toLocaleString()}
Average Deal Size: $${Math.round(metrics.avgDealSize).toLocaleString()}
Closing Rate: ${metrics.closingRate.toFixed(1)}%
Sales Cycle: ${metrics.salesCycle} days

TOP TERRITORIES
${territories
      .slice(0, 5)
      .map((t) => `${t.name}: $${t.revenue.toLocaleString()} (${t.deals} deals)`)
      .join('\n')}
  `;
}

// Churn rate analysis
export function calculateChurnRate(leads: any[]): number {
  const lostCount = leads.filter((l) => l.stage === 'Lost').length;
  return leads.length > 0 ? (lostCount / leads.length) * 100 : 0;
}
