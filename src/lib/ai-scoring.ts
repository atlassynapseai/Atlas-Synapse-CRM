import Anthropic from '@anthropic-ai/sdk';
import stats from 'simple-statistics';

const client = new Anthropic();

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  source: string;
  status?: string;
  created_at: string;
  interaction_count?: number;
  last_contact?: string;
  budget?: string;
  timeline?: string;
}

interface ScoringResult {
  leadId: string;
  score: number; // 0-100
  reasoning: string;
  factors: string[];
}

interface ChurnRisk {
  leadId: string;
  riskScore: number; // 0-100
  signals: string[];
  daysInactive?: number;
}

interface DealProbability {
  leadId: string;
  winProbability: number; // 0-100
  indicators: string[];
}

// Predictive lead scoring using Claude
export async function scoreLeadWithAI(lead: Lead): Promise<ScoringResult> {
  const leadInfo = `
    Name: ${lead.name}
    Company: ${lead.company}
    Source: ${lead.source}
    Status: ${lead.status || 'unknown'}
    Created: ${lead.created_at}
    Interactions: ${lead.interaction_count || 0}
  `;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Score this lead quality 0-100. Be concise. Format: SCORE: [number] | FACTORS: [factor1, factor2] | REASONING: [brief reason]

${leadInfo}`,
      },
    ],
  });

  const response =
    message.content[0].type === 'text' ? message.content[0].text : '';
  const scoreMatch = response.match(/SCORE:\s*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
  const factorsMatch = response.match(/FACTORS:\s*\[(.*?)\]/);
  const factors = factorsMatch
    ? factorsMatch[1].split(',').map((f) => f.trim())
    : [];

  return {
    leadId: lead.id,
    score,
    reasoning: response,
    factors,
  };
}

// Churn prediction
export async function predictChurn(lead: Lead, allLeads: Lead[]): Promise<ChurnRisk> {
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysSinceContact = lead.last_contact
    ? Math.floor((Date.now() - new Date(lead.last_contact).getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceCreation;

  const avgInteractions =
    stats.mean(allLeads.map((l) => l.interaction_count || 0)) || 1;
  const signals: string[] = [];

  if (daysSinceContact > 30) signals.push('No contact in 30+ days');
  if ((lead.interaction_count || 0) < avgInteractions * 0.5)
    signals.push('Low engagement');
  if (lead.status === 'not_interested') signals.push('Marked not interested');
  if (daysSinceCreation > 90 && (lead.interaction_count || 0) < 3)
    signals.push('Stale lead');

  const riskScore = Math.min(
    100,
    (daysSinceContact / 90) * 50 +
    ((1 - (lead.interaction_count || 0) / (avgInteractions * 2)) * 50)
  );

  return {
    leadId: lead.id,
    riskScore: Math.max(0, Math.round(riskScore)),
    signals,
    daysInactive: daysSinceContact,
  };
}

// Deal win probability
export function calculateDealProbability(lead: Lead, allLeads: Lead[]): DealProbability {
  const indicators: string[] = [];
  let probability = 40; // base

  if (lead.budget) {
    indicators.push(`Budget: ${lead.budget}`);
    probability += 15;
  }
  if (lead.timeline) {
    indicators.push(`Timeline: ${lead.timeline}`);
    probability += 15;
  }
  if (lead.status === 'qualified') {
    indicators.push('Qualified');
    probability += 20;
  }
  if ((lead.interaction_count || 0) > 5) {
    indicators.push('High engagement');
    probability += 15;
  }
  if (lead.source === 'referral') {
    indicators.push('Referral source');
    probability += 10;
  }

  return {
    leadId: lead.id,
    winProbability: Math.min(100, probability),
    indicators,
  };
}

// AI-suggested next actions
export async function generateNextActions(lead: Lead): Promise<string[]> {
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `For this lead, suggest 3 concise next actions. Format as bullet points.

Name: ${lead.name}
Company: ${lead.company}
Source: ${lead.source}
Status: ${lead.status || 'new'}
Days old: ${Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))}`,
      },
    ],
  });

  const response =
    message.content[0].type === 'text' ? message.content[0].text : '';
  const actions = response
    .split('\n')
    .filter((line) => line.trim().startsWith('•') || line.trim().startsWith('-'))
    .map((line) => line.replace(/^[•-]\s*/, '').trim())
    .filter((line) => line.length > 0);

  return actions.slice(0, 3);
}
