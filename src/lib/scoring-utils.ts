/**
 * Multi-Factor Lead Scoring System
 * Industry-standard scoring for churn risk and deal win probability
 * Based on Salesforce Einstein, HubSpot, Pipedrive models
 */

interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  industry?: string;
  stage: 'New' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  value?: number;
  status?: string;
  source?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  budget?: string;
  timeline?: string;
  interaction_count?: number;
  last_contact?: string;
}

interface EmailStats {
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}

interface ScoringBreakdown {
  recency?: number;
  engagement?: number;
  stale?: number;
  status?: number;
  email?: number;
  qualification?: number;
  value?: number;
  velocity?: number;
  stage?: number;
  source?: number;
}

interface ChurnRiskResult {
  leadId: string;
  riskScore: number;
  signals: string[];
  breakdown: ScoringBreakdown;
  daysInactive: number;
  lastInteraction?: string;
}

interface WinProbabilityResult {
  leadId: string;
  winProbability: number;
  indicators: string[];
  breakdown: ScoringBreakdown;
  dealValue: number;
  stage: string;
  daysInPipeline: number;
}

/**
 * Calculate engagement metrics from lead history
 */
export function calculateEngagementMetrics(
  lead: Lead,
  allLeads: Lead[]
): {
  interactionCount: number;
  daysSinceContact: number;
  leadAge: number;
  recentInteractions: number; // last 14 days
  recentEngagementRate: number; // interactions per month
} {
  const now = new Date();
  const leadCreated = new Date(lead.created_at);
  const leadAge = Math.floor((now.getTime() - leadCreated.getTime()) / (1000 * 60 * 60 * 24));

  const lastContact = lead.last_contact ? new Date(lead.last_contact) : leadCreated;
  const daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

  const interactionCount = lead.interaction_count || 0;

  // Calculate recent interactions (last 14 days)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentInteractions = lead.last_contact && new Date(lead.last_contact) > twoWeeksAgo ? (interactionCount > 0 ? 1 : 0) : 0;

  // Calculate average engagement rate across all leads
  const totalInteractions = allLeads.reduce((sum, l) => sum + (l.interaction_count || 0), 0);
  const avgInteractions = totalInteractions / Math.max(1, allLeads.length);
  const recentEngagementRate = leadAge > 0 ? (interactionCount / Math.max(1, leadAge / 30)) : 0;

  return {
    interactionCount,
    daysSinceContact,
    leadAge,
    recentInteractions,
    recentEngagementRate,
  };
}

/**
 * CHURN RISK SCORE - Industry-standard multi-factor model
 * Higher score = higher risk of churn
 */
export function calculateChurnRisk(
  lead: Lead,
  allLeads: Lead[],
  emailStats?: EmailStats
): ChurnRiskResult {
  const metrics = calculateEngagementMetrics(lead, allLeads);
  const signals: string[] = [];
  const breakdown: ScoringBreakdown = {};

  // 1. RECENCY DECAY (35% weight) - Days since last contact
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

  // 2. ENGAGEMENT GAP (25% weight) - Compare recent vs average
  const platformAvgInteractions = 2.5; // per month
  const avgEngagementRate = allLeads.reduce((sum, l) => sum + (l.interaction_count || 0), 0) / Math.max(1, allLeads.length);
  const engagementGap = Math.max(0, 1 - (metrics.recentEngagementRate / Math.max(platformAvgInteractions, avgEngagementRate)));
  let engagementScore = engagementGap * 100;
  if (metrics.interactionCount < 3 && metrics.leadAge > 30) {
    signals.push(`Low engagement (${metrics.interactionCount} interactions)`);
  }
  breakdown.engagement = engagementScore * 0.25;

  // 3. STALE LEAD PENALTY (20% weight)
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

  // 4. STATUS SIGNALS (10% weight)
  let statusScore = 0;
  if (lead.status === 'not_interested') {
    statusScore = 50;
    signals.push('Marked as not interested');
  } else if (lead.status === 'qualified') {
    statusScore = Math.max(0, -20); // negative reduces risk, but min 0
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

  // 5. EMAIL HEALTH (10% weight)
  let emailScore = 0;
  if (emailStats) {
    const bounceRate = emailStats.sent > 0 ? emailStats.bounced / emailStats.sent : 0;
    const replyRate = emailStats.sent > 0 ? emailStats.replied / emailStats.sent : 0;
    const openRate = emailStats.sent > 0 ? emailStats.opened / emailStats.sent : 0;

    if (bounceRate > 0.3) {
      emailScore = 100;
      signals.push(`High bounce rate (${Math.round(bounceRate * 100)}%)`);
    } else if (replyRate === 0 && emailStats.sent > 3) {
      emailScore = 60;
      signals.push(`No email replies (${emailStats.sent} emails sent)`);
    } else if (openRate < 0.2 && emailStats.sent > 3) {
      emailScore = 40;
      signals.push(`Low email open rate (${Math.round(openRate * 100)}%)`);
    } else {
      emailScore = Math.max(0, 100 - replyRate * 50 - openRate * 50);
    }
  }
  breakdown.email = emailScore * 0.1;

  // Calculate final churn risk
  const churnRisk = Math.round(breakdown.recency! + breakdown.engagement! + breakdown.stale! + breakdown.status! + breakdown.email!);

  return {
    leadId: lead.id,
    riskScore: Math.max(0, Math.min(100, churnRisk)),
    signals,
    breakdown,
    daysInactive: metrics.daysSinceContact,
    lastInteraction: lead.last_contact,
  };
}

/**
 * DEAL WIN PROBABILITY - Industry-standard multi-factor model
 * Higher score = higher likelihood to close
 */
export function calculateWinProbability(lead: Lead, allLeads: Lead[], emailStats?: EmailStats): WinProbabilityResult {
  const metrics = calculateEngagementMetrics(lead, allLeads);
  const indicators: string[] = [];
  const breakdown: ScoringBreakdown = {};

  // 1. QUALIFICATION SIGNALS (25% weight)
  let baseScore = 30; // all deals start at 30%
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

  // 2. DEAL VALUE & SIZE (20% weight)
  const dealValues = allLeads
    .filter((l) => l.value && l.value > 0)
    .map((l) => l.value!)
    .sort((a, b) => a - b);
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

  // 3. ENGAGEMENT VELOCITY (20% weight)
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

  // 4. STAGE PROGRESSION (15% weight)
  const stageScores: Record<string, number> = {
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

  // 5. LEAD SOURCE QUALITY (12% weight)
  const sourceQuality: Record<string, number> = {
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

  // 6. EMAIL ENGAGEMENT (8% weight)
  let emailScore = 20;
  if (emailStats) {
    const bounceRate = emailStats.sent > 0 ? emailStats.bounced / emailStats.sent : 0;
    const replyRate = emailStats.sent > 0 ? emailStats.replied / emailStats.sent : 0;
    const openRate = emailStats.sent > 0 ? emailStats.opened / emailStats.sent : 0;

    if (bounceRate > 0.3) {
      emailScore = 10;
    } else if (replyRate > 0.5) {
      emailScore = 90;
      indicators.push(`High engagement (${Math.round(replyRate * 100)}% reply rate)`);
    } else if (replyRate > 0.2) {
      emailScore = 75;
      indicators.push(`Good engagement (${Math.round(replyRate * 100)}% reply rate)`);
    } else if (openRate > 0.6) {
      emailScore = 60;
      indicators.push(`Email interest (${Math.round(openRate * 100)}% open rate)`);
    } else if (openRate > 0.3) {
      emailScore = 40;
    } else {
      emailScore = 20;
    }
  }
  breakdown.email = emailScore * 0.08;

  // Calculate final win probability
  const totalWinProb =
    breakdown.qualification! + breakdown.value! + breakdown.velocity! + breakdown.stage! + breakdown.source! + breakdown.email!;

  // Round to nearest 5 for cleaner UI
  const winProbability = Math.round(totalWinProb / 5) * 5;

  const now = new Date();
  const created = new Date(lead.created_at);
  const daysInPipeline = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  return {
    leadId: lead.id,
    winProbability: Math.max(0, Math.min(100, winProbability)),
    indicators,
    breakdown,
    dealValue,
    stage: lead.stage,
    daysInPipeline,
  };
}

/**
 * Generate AI-powered next actions based on scoring
 */
export function generateNextActions(lead: Lead, riskScore: number, winProb: number): string[] {
  const actions: string[] = [];

  // High churn risk actions
  if (riskScore > 70) {
    actions.push('Send personalized re-engagement email');
    actions.push('Schedule follow-up call to understand blockers');
    if (lead.stage === 'New') {
      actions.push('Try alternative decision maker or contact');
    } else {
      actions.push('Check in on proposal/negotiation status');
    }
  }

  // High win probability actions
  if (winProb > 75) {
    actions.push('Prepare close-stage documentation');
    actions.push('Schedule stakeholder confirmation call');
    if (lead.stage === 'Proposal') {
      actions.push('Send demo or deep-dive session invite');
    } else if (lead.stage === 'Negotiation') {
      actions.push('Negotiate final terms and timeline');
    }
  }

  // Stage-specific actions
  if (lead.stage === 'New' && winProb < 50) {
    actions.push('Qualify lead with discovery questions');
    actions.push('Assess budget and timeline fit');
  }

  if (lead.stage === 'Contacted' && winProb > 40) {
    actions.push('Send tailored proposal based on needs');
    actions.push('Schedule product demo');
  }

  // Default actions if none generated
  if (actions.length === 0) {
    actions.push('Continue regular follow-up');
    actions.push('Monitor engagement and stage progression');
    actions.push('Prepare next touchpoint');
  }

  return actions.slice(0, 3); // Return top 3 actions
}
