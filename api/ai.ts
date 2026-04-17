import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Import scoring functions (for Node.js runtime)
function calculateEngagementMetrics(
  lead: any,
  allLeads: any[]
): {
  interactionCount: number;
  daysSinceContact: number;
  leadAge: number;
  recentInteractions: number;
  recentEngagementRate: number;
} {
  const now = new Date();
  const leadCreated = new Date(lead.created_at);
  const leadAge = Math.floor((now.getTime() - leadCreated.getTime()) / (1000 * 60 * 60 * 24));

  const lastContact = lead.last_contact ? new Date(lead.last_contact) : leadCreated;
  const daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

  const interactionCount = lead.interaction_count || 0;

  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentInteractions = lead.last_contact && new Date(lead.last_contact) > twoWeeksAgo ? (interactionCount > 0 ? 1 : 0) : 0;

  const totalInteractions = allLeads.reduce((sum: number, l: any) => sum + (l.interaction_count || 0), 0);
  const recentEngagementRate = leadAge > 0 ? (interactionCount / Math.max(1, leadAge / 30)) : 0;

  return { interactionCount, daysSinceContact, leadAge, recentInteractions, recentEngagementRate };
}

function calculateChurnRisk(lead: any, allLeads: any[]): any {
  const metrics = calculateEngagementMetrics(lead, allLeads);
  const signals: string[] = [];
  const breakdown: any = {};

  // 1. RECENCY DECAY (35%)
  let recencyScore = 0;
  if (metrics.daysSinceContact > 90) {
    recencyScore = 100;
    signals.push(`No contact for ${metrics.daysSinceContact} days (critical)`);
  } else {
    recencyScore = (metrics.daysSinceContact / 90) * 100;
    if (metrics.daysSinceContact > 30) {
      signals.push(`No contact for ${metrics.daysSinceContact} days`);
    }
  }
  breakdown.recency = recencyScore * 0.35;

  // 2. ENGAGEMENT GAP (25%)
  const platformAvgInteractions = 2.5;
  const avgEngagementRate = allLeads.reduce((sum: number, l: any) => sum + (l.interaction_count || 0), 0) / Math.max(1, allLeads.length);
  const engagementGap = Math.max(0, 1 - (metrics.recentEngagementRate / Math.max(platformAvgInteractions, avgEngagementRate)));
  let engagementScore = engagementGap * 100;
  if (metrics.interactionCount < 3 && metrics.leadAge > 30) {
    signals.push(`Low engagement (${metrics.interactionCount} interactions)`);
  }
  breakdown.engagement = engagementScore * 0.25;

  // 3. STALE LEAD PENALTY (20%)
  let staleScore = 0;
  if (metrics.leadAge > 90 && metrics.interactionCount < 3) {
    staleScore = 100;
    signals.push('Stale lead (>90 days, low activity)');
  } else if (metrics.leadAge > 60 && metrics.interactionCount < 2) {
    staleScore = 75;
  } else if (metrics.leadAge > 30 && metrics.interactionCount === 0) {
    staleScore = 50;
    signals.push('No interactions in 30+ days');
  }
  breakdown.stale = staleScore * 0.2;

  // 4. STATUS SIGNALS (10%)
  let statusScore = 0;
  if (lead.status === 'not_interested') {
    statusScore = 50;
    signals.push('Marked as not interested');
  } else if (lead.status === 'qualified') {
    statusScore = Math.max(0, -20);
  }
  if (lead.stage === 'Proposal' || lead.stage === 'Negotiation') {
    statusScore = Math.max(0, statusScore - 15);
  }
  if (lead.stage === 'Won') {
    statusScore = 0;
  } else if (lead.stage === 'Lost') {
    statusScore = 100;
  }
  statusScore = Math.max(0, Math.min(100, statusScore));
  breakdown.status = statusScore * 0.1;

  // 5. EMAIL HEALTH (10%) - Placeholder since we need to query email_messages separately
  let emailScore = 0;
  breakdown.email = emailScore * 0.1;

  const churnRisk = Math.round(breakdown.recency + breakdown.engagement + breakdown.stale + breakdown.status + breakdown.email);

  return {
    leadId: lead.id,
    riskScore: Math.max(0, Math.min(100, churnRisk)),
    signals: signals.slice(0, 3),
    breakdown,
    daysInactive: metrics.daysSinceContact,
    lastInteraction: lead.last_contact,
  };
}

function calculateWinProbability(lead: any, allLeads: any[]): any {
  const metrics = calculateEngagementMetrics(lead, allLeads);
  const indicators: string[] = [];
  const breakdown: any = {};

  // 1. QUALIFICATION SIGNALS (25%)
  let baseScore = 30;
  if (lead.status === 'qualified') {
    baseScore += 20;
    indicators.push('Qualified status (+20%)');
  }
  if (lead.budget) {
    baseScore += 15;
    indicators.push('Budget confirmed (+15%)');
  }
  if (lead.timeline) {
    baseScore += 15;
    indicators.push('Timeline specified (+15%)');
  }
  if (lead.industry && lead.industry.length > 0) {
    baseScore += 10;
  }
  if (lead.phone && lead.company) {
    baseScore += 10;
  }
  const qualificationScore = Math.min(100, baseScore);
  breakdown.qualification = qualificationScore * 0.25;

  // 2. DEAL VALUE & SIZE (20%)
  const dealValues = allLeads
    .filter((l: any) => l.value && l.value > 0)
    .map((l: any) => l.value)
    .sort((a: number, b: number) => a - b);
  const medianDealSize = dealValues.length > 0 ? dealValues[Math.floor(dealValues.length / 2)] : 50000;

  let valueTier = 40;
  const dealValue = lead.value || 0;
  if (dealValue === 0) {
    valueTier = 40;
  } else if (dealValue > medianDealSize * 2) {
    valueTier = 90;
    indicators.push(`Large deal ($${dealValue.toLocaleString()})`);
  } else if (dealValue > medianDealSize) {
    valueTier = 70;
    indicators.push(`Medium-large deal ($${dealValue.toLocaleString()})`);
  } else if (dealValue > medianDealSize * 0.5) {
    valueTier = 55;
  } else {
    valueTier = 45;
  }
  breakdown.value = valueTier * 0.2;

  // 3. ENGAGEMENT VELOCITY (20%)
  let velocityScore = 20;
  if (metrics.recentInteractions > 5) {
    velocityScore = 85;
    indicators.push('Very active (5+ interactions in 14 days)');
  } else if (metrics.recentInteractions >= 3) {
    velocityScore = 70;
    indicators.push('Active engagement');
  } else if (metrics.recentInteractions >= 1) {
    velocityScore = 50;
    indicators.push('Some recent activity');
  } else if (metrics.interactionCount > 5) {
    velocityScore = 40;
  }
  breakdown.velocity = velocityScore * 0.2;

  // 4. STAGE PROGRESSION (15%)
  const stageScores: any = {
    New: 30,
    Contacted: 45,
    Proposal: 70,
    Negotiation: 85,
    Won: 100,
    Lost: 0,
  };
  const stageProbability = stageScores[lead.stage] || 30;
  if (lead.stage === 'Proposal' || lead.stage === 'Negotiation') {
    indicators.push(`${lead.stage} stage (+${Math.round(stageProbability * 0.15)}%)`);
  }
  breakdown.stage = stageProbability * 0.15;

  // 5. LEAD SOURCE QUALITY (12%)
  const sourceQuality: any = {
    referral: 80,
    priority_access: 70,
    manual_add: 50,
    waitlist: 45,
  };
  const sourceScore = sourceQuality[lead.source || 'other'] || 40;
  if (sourceScore >= 70) {
    indicators.push(`High-intent source (${lead.source})`);
  }
  breakdown.source = sourceScore * 0.12;

  // 6. EMAIL ENGAGEMENT (8%) - Placeholder
  let emailScore = 20;
  breakdown.email = emailScore * 0.08;

  const totalWinProb = breakdown.qualification + breakdown.value + breakdown.velocity + breakdown.stage + breakdown.source + breakdown.email;
  const winProbability = Math.round(totalWinProb / 5) * 5;

  const now = new Date();
  const created = new Date(lead.created_at);
  const daysInPipeline = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  return {
    leadId: lead.id,
    winProbability: Math.max(0, Math.min(100, winProbability)),
    indicators: indicators.slice(0, 4),
    breakdown,
    dealValue,
    stage: lead.stage,
    daysInPipeline,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: leads } = await supabase.from('leads').select('*');

    if (!leads || leads.length === 0) {
      return res.json({ predictions: [], deals: [] });
    }

    const action = req.query.action || 'churn';

    if (action === 'churn') {
      const predictions = leads.map((l: any) => calculateChurnRisk(l, leads)).sort((a: any, b: any) => b.riskScore - a.riskScore);
      return res.json({ predictions });
    } else if (action === 'deals') {
      const deals = leads.map((l: any) => calculateWinProbability(l, leads)).sort((a: any, b: any) => b.winProbability - a.winProbability);
      return res.json({ deals });
    }

    return res.json({ data: leads });
  } catch (e: any) {
    console.error('AI scoring error:', e);
    return res.status(500).json({ error: e.message });
  }
}
