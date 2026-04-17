import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Scale, Database, Activity,
  ChevronRight, Lock, Search, Users, TrendingUp, Briefcase, Mail,
  MoreVertical, Plus, Phone, Filter, CheckCircle2, XCircle, Clock,
  ArrowUpRight, Layers, Send, X, Zap, BarChart3, Eye, Moon, Sun
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { sendEmail, sendCustomMessage, EMAIL_TEMPLATES } from '../lib/brevo';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, FunnelChart, Funnel, LabelList
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AdvancedAnalytics, ActivityTimeline, BulkActions, SkeletonCard, LeadComparison } from './AdvancedFeatures';
import { AIInsights } from './AIInsights';
import { WorkflowBuilder } from './WorkflowBuilder';
import { IntegrationsManager } from './IntegrationsManager';
import { CommentsThread } from './CommentsThread';
import { ActivityFeed } from './ActivityFeed';
import { AdvancedAnalyticsDashboard } from './AdvancedAnalyticsDashboard';
import { AdvancedViews, KanbanView, TimelineView, CalendarView } from './AdvancedViews';
import { AdvancedFeaturesPanel } from './AdvancedFeaturesPanel';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Theme Toggle Component
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-white/[0.06] hover:border-white/[0.15] transition-all"
      title={isDark ? 'Light Mode' : 'Dark Mode'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-slate-400" />
      )}
    </motion.button>
  );
}

// ── TYPES ──
export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  industry?: string;
  ai_tools?: string;
  stage: PipelineStage;
  value: number;
  notes?: string;
  risk_score?: number;
  source?: 'priority_access' | 'manual_add' | 'other';
  created_at: string;
  log: LogEntry[];
}

export interface LogEntry {
  action: string;
  time: string;
  color: string;
}

export type PipelineStage = 'New' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface RiskAnalysis {
  score: number;
  liabilities: string[];
  stochasticLeaks: string[];
  mitigationStrategy: string;
}

// ── CONSTANTS ──
const PIPELINE_STAGES: PipelineStage[] = ['New', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const STAGE_COLORS: Record<PipelineStage, string> = {
  New: '#0ea5e9', Contacted: '#7c3aed', Proposal: '#f97316',
  Negotiation: '#f59e0b', Won: '#10b981', Lost: '#ef4444'
};

const INDUSTRIES = [
  'Legal Tech', 'Financial Services', 'Healthcare', 'E-Commerce',
  'SaaS / Tech', 'Real Estate', 'Education', 'Consulting', 'Manufacturing', 'Other'
];

// ── HELPERS ──
function calcRisk(lead: Lead): number {
  let score = 0;
  if (!lead.phone) score += 1;
  if (!lead.industry) score += 1;
  const dangerous = ['chatgpt', 'zapier', 'make', 'voiceflow', 'gemini'];
  if (lead.ai_tools && dangerous.some(d => lead.ai_tools!.toLowerCase().includes(d))) score += 3;
  if (lead.stage === 'New') score += 2;
  if (!lead.notes || lead.notes.length < 20) score += 1;
  return Math.min(10, score);
}

function riskColor(score: number): string {
  if (score <= 3) return '#10b981';
  if (score <= 6) return '#f97316';
  return '#ef4444';
}

function fmtVal(v: number): string {
  if (!v) return '—';
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('');
}

async function fetchLeads(): Promise<Lead[]> {
  try {
    console.log('🔄 Fetching leads from API...');
    // Use Vercel domain for API calls in production, localhost for development
    const apiUrl = process.env.NODE_ENV === 'development'
      ? '/api/fetch-leads'
      : 'https://atlas-synapse-crm.vercel.app/api/fetch-leads';
    const res = await fetch(apiUrl);

    if (!res.ok) {
      console.error('API error:', res.status, await res.text());
      return [];
    }

    const json = await res.json();
    const leads = json.leads || [];
    console.log('✅ Data loaded:', leads.length, 'leads');
    if (json.debug) console.log('📊 Debug info:', json.debug);
    return leads;
  } catch (err) {
    console.error('❌ Error fetching leads:', err);
    return [];
  }
}

async function saveLead(lead: Lead): Promise<Lead | null> {
  try {
    // If lead came from another table, update that table, otherwise update leads table
    const targetTable = lead._table && lead._table !== 'leads' ? lead._table : 'leads';

    // For upsert, we only need the original fields, not our custom ones
    const leadData = { ...lead };
    delete leadData._table;

    const { data, error } = await supabase
      .from(targetTable)
      .upsert(leadData)
      .select();

    if (error) {
      console.error(`Error saving lead to ${targetTable}:`, error);
      return null;
    }

    // Add back the _table field for consistency
    const result = data?.[0];
    if (result) {
      result._table = targetTable;
    }

    return result || null;
  } catch (err) {
    console.error('Error saving lead:', err);
    return null;
  }
}

async function deleteLead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting lead:', err);
    return false;
  }
}

// ── FORENSIC ANALYSIS ──
const RISK_ANALYSIS: RiskAnalysis = {
  score: 8.4,
  liabilities: [
    'GDPR Article 5(1)(f) — Integrity and Confidentiality Breach',
    'EU AI Act Title IV — High-Risk System Transparency Failure',
    'Respondeat Superior — Corporate Liability for Agentic Hallucination',
    'CCPA Section 1798.100 — Data Minimization Non-Compliance'
  ],
  stochasticLeaks: [
    'Cross-tenant prompt injection via unmasked CGO interaction logs',
    'PII exfiltration through non-deterministic RAG embeddings',
    'Shadow AI usage: Unsanctioned LLM calls detected in growth workflows',
    'Latent space data reconstruction vulnerability in vector database'
  ],
  mitigationStrategy: "MANDATORY migration of all CGO growth data to the Atlas 'Deterministic Clean Room.' We'll strip the stochastic noise, enforce hard-coded governance boundaries, and ensure your AI agents operate within a VERIFIED trust layer. No more leaks. No more liabilities. JUST GROWTH."
};

const AUDITOR_NOTE = "Listen carefully. Your current infrastructure is a sieve. We're seeing data bleed that'll trigger a GDPR Article 33 notification before your morning coffee's cold. You've got UNPROTECTED PII flowing through non-deterministic nodes. That's a death sentence in the EU AI Act era. We're moving you to the DETERMINISTIC CLEAN ROOM. It's not a suggestion; it's a REQUIREMENT for corporate survival.";

// ── SUB-COMPONENTS ──

// Enhanced Tooltips for Charts
const PipelineTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    const descriptions: Record<string, string> = {
      'New': '📧 Recently registered, awaiting outreach',
      'Contacted': '☎️ Initial contact made, waiting for response',
      'Proposal': '📋 Proposal sent, under review',
      'Negotiation': '💼 Active discussions, deal refinement',
      'Won': '🎉 Closed successfully',
      'Lost': '❌ Disqualified or unresponsive'
    };
    return (
      <div className="bg-atlas-bg/95 border border-white/20 rounded-lg p-3 shadow-xl backdrop-blur-sm">
        <p className="text-xs font-bold text-white mb-1">{data.name}</p>
        <p className="text-sm font-black text-atlas-primary mb-2">{data.value} leads</p>
        <p className="text-[10px] text-slate-400">{descriptions[data.name]}</p>
      </div>
    );
  }
  return null;
};

const StatCard = ({ label, value, change, changeType, icon: Icon, accent, delay = 0, explanation }:
  { label: string; value: string; change: string; changeType: 'up' | 'down' | 'warn'; icon: any; accent: string; delay?: number; explanation?: string }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="stat-card-hover glass-card p-6 relative overflow-hidden border border-white/[0.08] hover:border-white/[0.15] cursor-help transition-all"
    onMouseEnter={() => setShowExplanation(true)}
    onMouseLeave={() => setShowExplanation(false)}
  >
    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <span className={cn('text-xs font-bold',
        changeType === 'up' ? 'text-emerald-500' : changeType === 'warn' ? 'text-red-500' : 'text-red-500'
      )}>{change}</span>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
    <AnimatePresence>
      {showExplanation && explanation && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="mt-4 pt-4 border-t border-white/10 text-[10px] text-slate-400 leading-relaxed"
        >
          {explanation}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);
};

const Toast = ({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) => {
  const bgColor = type === 'success' ? 'bg-green-500/10 border-green-500/20' : type === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20';
  const textColor = type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400';
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 px-4 py-3 rounded-lg border glass-card ${bgColor} z-[100]`}
    >
      <span className={`text-sm font-medium ${textColor}`}>{message}</span>
    </motion.div>
  );
};

const RiskBar = ({ score }: { score: number }) => {
  const color = riskColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
        <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score}</span>
    </div>
  );
};

const StagePill = ({ stage }: { stage: PipelineStage }) => {
  const colorMap: Record<PipelineStage, string> = {
    New: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    Contacted: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    Proposal: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Negotiation: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Lost: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={cn('px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border', colorMap[stage])}>
      {stage}
    </span>
  );
};

const SourceBadge = ({ source }: { source?: string }) => {
  const sourceMap: Record<string, { bg: string; text: string; label: string }> = {
    priority_access: { bg: 'bg-blue-500/10', text: 'text-blue-400 border-blue-500/20', label: '📧 Priority Access' },
    manual_add: { bg: 'bg-purple-500/10', text: 'text-purple-400 border-purple-500/20', label: '✋ Manual Entry' },
    waitlist: { bg: 'bg-green-500/10', text: 'text-green-400 border-green-500/20', label: '📋 Waitlist' },
    other: { bg: 'bg-slate-500/10', text: 'text-slate-400 border-slate-500/20', label: '📌 Other' },
  };
  const config = sourceMap[source || 'other'] || sourceMap.other;
  return (
    <span className={cn('px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border', config.text)}>
      {config.label}
    </span>
  );
};

const PipelineBoard = ({ leads }: { leads: Lead[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
    {PIPELINE_STAGES.map(stage => {
      const stageLeads = leads.filter(l => l.stage === stage);
      return (
        <div key={stage} className="min-w-[220px] space-y-3">
          <div className="flex items-center justify-between px-1 gap-2">
            <h4 className="text-[9px] font-black uppercase tracking-wide text-slate-500 flex-1 truncate">{stage}</h4>
            <span className="text-[9px] font-bold bg-white/5 px-1.5 py-0.5 rounded text-slate-400 whitespace-nowrap flex-shrink-0">{stageLeads.length}</span>
          </div>
          <div className="space-y-2">
            {stageLeads.map(lead => (
              <motion.div layoutId={`board-${lead.id}`} key={lead.id}
                className="glass-card p-3 hover:border-atlas-primary/50 transition-all cursor-pointer"
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-xs font-bold text-white mb-1 truncate">{lead.name}</div>
                <div className="text-[10px] text-slate-500 mb-2 truncate">{lead.company}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black" style={{ color: STAGE_COLORS[stage] }}>{fmtVal(lead.value)}</div>
                  <div className="text-[10px] text-slate-500">{lead.risk_score ?? calcRisk(lead)}/10</div>
                </div>
              </motion.div>
            ))}
            {stageLeads.length === 0 && (
              <div className="h-16 border border-dashed border-white/5 rounded-xl flex items-center justify-center">
                <span className="text-[9px] text-slate-700 uppercase tracking-wider">Empty</span>
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

const PipelineFunnel = ({ leads }: { leads: Lead[] }) => {
  const data = PIPELINE_STAGES.map(stage => ({
    name: stage,
    value: leads.filter(l => l.stage === stage).length,
    fill: STAGE_COLORS[stage]
  })).filter(d => d.value > 0);
  if (data.length === 0) return (
    <div className="h-[300px] flex items-center justify-center text-slate-600 text-sm">No pipeline data yet</div>
  );
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip contentStyle={{ backgroundColor: '#0a0f24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontFamily: 'monospace' }} />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" fill="#94a3b8" stroke="none" dataKey="name" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
};

const ForensicAuditView = ({ leads }: { leads: Lead[] }) => {
  // Get all activity logs from all leads, sorted by most recent
  const allActivities = leads
    .flatMap(lead =>
      (lead.log || []).map(entry => ({
        leadId: lead.id,
        leadName: lead.name,
        leadCompany: lead.company,
        leadEmail: lead.email,
        ...entry
      }))
    )
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const recentActivities = allActivities.slice(0, 50);
  const totalActivities = allActivities.length;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="text-atlas-primary h-7 w-7" />
            LEAD ACTIVITY AUDIT LOG
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time tracking of all lead interactions and status changes</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Total Events</div>
          <div className="text-4xl font-black text-atlas-primary">{totalActivities}</div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="glass-card p-6 border border-white/5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-6 flex items-center gap-2">
          <Clock className="h-4 w-4 text-atlas-primary" />
          Recent Events (Last 50)
        </h3>

        {recentActivities.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-500 text-sm">No activity yet. Submit a form or contact a lead to start.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {recentActivities.map((activity, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="flex gap-4 pb-4 border-b border-white/5 last:border-b-0"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div
                    className="h-3 w-3 rounded-full mt-1"
                    style={{ backgroundColor: activity.color || '#3b82f6' }}
                  />
                  {idx < recentActivities.length - 1 && (
                    <div className="w-0.5 h-12 bg-gradient-to-b from-white/20 to-transparent" />
                  )}
                </div>

                {/* Event details */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {activity.action}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        <span className="font-mono">{activity.leadName}</span>
                        {' '}
                        <span className="text-slate-600">@</span>
                        {' '}
                        <span className="text-slate-500">{activity.leadCompany}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        📧 {activity.leadEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {new Date(activity.time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 border-l-4 border-l-blue-500">
          <p className="text-xs uppercase tracking-wider text-blue-400 font-bold">Total Leads</p>
          <p className="text-3xl font-black text-white mt-2">{leads.length}</p>
        </div>
        <div className="glass-card p-4 border-l-4 border-l-green-500">
          <p className="text-xs uppercase tracking-wider text-green-400 font-bold">Avg Risk Score</p>
          <p className="text-3xl font-black text-white mt-2">
            {leads.length > 0
              ? ((leads.reduce((sum, l) => sum + (l.risk_score || 0), 0) / leads.length) || 0).toFixed(1)
              : '0'
            }
          </p>
        </div>
        <div className="glass-card p-4 border-l-4 border-l-purple-500">
          <p className="text-xs uppercase tracking-wider text-purple-400 font-bold">Total Value</p>
          <p className="text-3xl font-black text-white mt-2">
            {fmtVal(leads.reduce((sum, l) => sum + (l.value || 0), 0))}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ── CONTACT MODAL ──
const ContactModal = ({ lead, onClose, onUpdate }: { lead: Lead; onClose: () => void; onUpdate: (l: Lead) => void }) => {
  const [stage, setStage] = useState(lead.stage);
  const [notes, setNotes] = useState(lead.notes || '');
  const [saved, setSaved] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'initialOutreach' | 'followUp' | 'proposalSent'>('initialOutreach');
  const [emailMode, setEmailMode] = useState<'template' | 'custom'>('template');
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  const [customEmailBody, setCustomEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const rs = lead.risk_score ?? calcRisk(lead);

  const handleSave = async () => {
    const updated: Lead = {
      ...lead, stage, notes,
      risk_score: calcRisk({ ...lead, stage, notes }),
      log: [...(lead.log || []),
      ...(stage !== lead.stage ? [{ action: `Stage: ${lead.stage} → ${stage}`, time: new Date().toLocaleString(), color: STAGE_COLORS[stage] }] : []),
      { action: 'Notes updated', time: new Date().toLocaleString(), color: '#7c3aed' }
      ]
    };
    await saveLead(updated);
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      if (emailMode === 'template') {
        // Send template email
        const template = EMAIL_TEMPLATES[selectedTemplate];
        if (!template) throw new Error('Invalid template');

        const requestDate = new Date(lead.created_at).toLocaleDateString();
        const emailData = template(lead.name, lead.company, requestDate);

        const result = await sendEmail({
          to: lead.email,
          toName: lead.name,
          subject: emailData.subject,
          htmlContent: emailData.html
        });

        if (result.success) {
          const templateName = selectedTemplate === 'initialOutreach' ? 'Initial Outreach' : selectedTemplate === 'followUp' ? 'Follow-Up' : 'Proposal Sent';
          const updated: Lead = {
            ...lead,
            log: [...(lead.log || []), {
              action: `📋 Email sent: ${templateName}`,
              time: new Date().toLocaleString(),
              color: '#3b82f6'
            }]
          };
          await saveLead(updated);
          onUpdate(updated);
          setEmailOpen(false);
          setSendingEmail(false);
          showToast('Template email sent successfully', 'success');
        } else {
          throw new Error('Failed to send template email');
        }
      } else {
        // Send custom message
        if (!customEmailSubject.trim() || !customEmailBody.trim()) {
          throw new Error('Subject and message are required');
        }

        const result = await sendCustomMessage({
          to: lead.email,
          toName: lead.name,
          subject: customEmailSubject,
          body: customEmailBody,
          senderName: 'Gloria Barsoum'
        });

        if (result.success) {
          const updated: Lead = {
            ...lead,
            log: [...(lead.log || []), {
              action: `✍️ Custom email sent: ${customEmailSubject}`,
              time: new Date().toLocaleString(),
              color: '#10b981'
            }]
          };
          await saveLead(updated);
          onUpdate(updated);
          setEmailOpen(false);
          setCustomEmailSubject('');
          setCustomEmailBody('');
          setSendingEmail(false);
          showToast('Custom message sent successfully', 'success');
        } else {
          throw new Error('Failed to send custom message');
        }
      }
    } catch (err) {
      console.error('Error sending email:', err);
      showToast(err instanceof Error ? err.message : 'Failed to send email', 'error');
      setSendingEmail(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-atlas-bg/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        className="glass-card w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-7 border-b border-white/5 bg-gradient-to-r from-atlas-card to-atlas-bg flex-shrink-0">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-atlas-primary/20 border border-atlas-primary/30 flex items-center justify-center text-2xl font-bold text-atlas-primary">
                {initials(lead.name)}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{lead.name}</h3>
                <p className="text-slate-400 text-sm">{lead.company}{lead.industry ? ` · ${lead.industry}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setEmailOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors rounded-lg border border-white/[0.06]"
                title="Send email"
              >
                <Mail className="h-5 w-5" />
              </motion.button>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Mail className="h-4 w-4 text-atlas-primary" />{lead.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Phone className="h-4 w-4 text-atlas-primary" />{lead.phone || 'No phone'}
            </div>
            {lead.ai_tools && (
              <div className="flex items-center gap-2 text-sm text-slate-300 col-span-2">
                <Layers className="h-4 w-4 text-atlas-primary" />{lead.ai_tools}
              </div>
            )}
            <div className="col-span-2">
              <SourceBadge source={lead.source} />
            </div>
          </div>
        </div>

        <div className="p-7 space-y-5 overflow-y-auto flex-1">
          {/* Risk */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Risk Assessment</h4>
            <div className="glass-card p-4 flex items-center gap-4">
              <div className="text-4xl font-black" style={{ color: riskColor(rs) }}>{rs}</div>
              <div>
                <div className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: riskColor(rs) }}>
                  {rs >= 7 ? 'HIGH EXPOSURE' : rs >= 4 ? 'MODERATE EXPOSURE' : 'LOW EXPOSURE'}
                </div>
                <div className="text-xs text-slate-400">
                  {rs >= 7 ? 'DETERMINISTIC CLEAN ROOM REQUIRED' : rs >= 4 ? 'MONITORING ADVISED' : 'STANDARD PROTOCOL'}
                </div>
              </div>
            </div>
          </div>

          {/* Stage */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Pipeline Stage</h4>
            <select value={stage} onChange={e => setStage(e.target.value as PipelineStage)}
              className="w-full bg-atlas-bg border border-white/5 text-sm rounded-xl px-3 py-2.5 text-slate-200 outline-none focus:border-atlas-primary transition-colors font-mono"
            >
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Notes</h4>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Add notes, context, next steps..."
              className="w-full bg-atlas-bg border border-white/5 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none resize-none focus:border-atlas-primary transition-colors font-mono placeholder-slate-600"
            />
          </div>

          <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className={cn('gradient-btn px-6 py-2.5 text-sm', saved && 'opacity-75')}
          >
            {saved ? '✓ Saved' : 'Save Changes'}
          </motion.button>

          {/* Log */}
          {(lead.log || []).length > 0 && (
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Interaction History</h4>
              <div className="space-y-3">
                {[...(lead.log || [])].reverse().map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <div>
                      <div className="text-xs font-bold text-white">{entry.action}</div>
                      <div className="text-[10px] text-slate-500">{entry.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* EMAIL COMPOSER OVERLAY */}
        <AnimatePresence>
          {emailOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[70] flex items-center justify-center p-4 bg-atlas-bg/80 backdrop-blur-md rounded-3xl"
            >
              <motion.div
                initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                className="glass-card w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col"
              >
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <h4 className="text-lg font-bold text-white">Send Email</h4>
                  <button onClick={() => setEmailOpen(false)} className="p-1 text-slate-500 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mode Toggle */}
                <div className="p-4 border-b border-white/5 flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setEmailMode('template')}
                    className={cn('flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                      emailMode === 'template'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    )}
                  >
                    📋 Template
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setEmailMode('custom')}
                    className={cn('flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                      emailMode === 'custom'
                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    )}
                  >
                    ✍️ Custom
                  </motion.button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  {emailMode === 'template' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Select Template</label>
                        <select
                          value={selectedTemplate}
                          onChange={(e) => setSelectedTemplate(e.target.value as any)}
                          className="w-full bg-atlas-bg border border-white/5 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors"
                        >
                          <option value="initialOutreach">Initial Outreach</option>
                          <option value="followUp">Follow-Up</option>
                          <option value="proposalSent">Proposal Sent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Preview</label>
                        <div className="text-xs text-slate-400 p-3 bg-atlas-bg/50 rounded-lg border border-white/5 max-h-32 overflow-y-auto">
                          {selectedTemplate === 'initialOutreach' && 'Initial outreach message introducing Atlas Synapse'}
                          {selectedTemplate === 'followUp' && 'Follow-up on previous request'}
                          {selectedTemplate === 'proposalSent' && 'Proposal review and next steps'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Subject</label>
                        <input
                          type="text"
                          value={customEmailSubject}
                          onChange={(e) => setCustomEmailSubject(e.target.value)}
                          placeholder="Email subject..."
                          maxLength={100}
                          className="w-full bg-atlas-bg border border-white/5 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors placeholder-slate-600"
                        />
                        <div className="text-xs text-slate-500 mt-1">{customEmailSubject.length}/100</div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Message</label>
                        <textarea
                          value={customEmailBody}
                          onChange={(e) => setCustomEmailBody(e.target.value.slice(0, 500))}
                          placeholder="Write your custom message..."
                          maxLength={500}
                          rows={6}
                          className="w-full bg-atlas-bg border border-white/5 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors placeholder-slate-600 resize-none"
                        />
                        <div className="text-xs text-slate-500 mt-1">{customEmailBody.length}/500</div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">To</label>
                    <div className="text-sm text-slate-300 p-3 bg-atlas-bg/50 rounded-lg border border-white/5">{lead.name} ({lead.email})</div>
                  </div>
                </div>

                <div className="p-4 border-t border-white/5 flex gap-3">
                  <motion.button
                    onClick={handleSendEmail}
                    disabled={sendingEmail || (emailMode === 'custom' && (!customEmailSubject.trim() || !customEmailBody.trim()))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="gradient-btn flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {sendingEmail ? 'Sending...' : 'Send Email'}
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setEmailOpen(false);
                      setCustomEmailSubject('');
                      setCustomEmailBody('');
                      setEmailMode('template');
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white border border-white/[0.06] transition-colors"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// ── MAIN COMPONENT ──
const CRMDashboard = () => {
  const [tab, setTab] = useState<'overview' | 'contacts' | 'pipeline' | 'add' | 'audit' | 'notifications' | 'ai' | 'workflows' | 'integrations' | 'collaboration' | 'analytics' | 'mobile' | 'security' | 'api' | 'views' | 'features'>('overview');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'priority_access' | 'manual_add' | 'waitlist'>('all');
  const [loading, setLoading] = useState(true);
  const [showCSVMenu, setShowCSVMenu] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // API & Security state
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; created_at: string }[]>([]);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', industry: '', ai_tools: '', stage: 'New' as PipelineStage, value: '', notes: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Starting data load...');
        console.log('📊 Fetching from tables: leads, priority_access_requests, waitlist_signups');

        const data = await fetchLeads();
        console.log('✅ Data loaded:', data.length, 'leads');
        console.log('📋 Lead sources:', data.map(l => l.source).reduce((acc, src) => {
          acc[src || 'unknown'] = (acc[src || 'unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>));

        setLeads(data);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading data:', err);
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time changes on all tables
    const tables = ['leads', 'priority_access_requests', 'waitlist_signups'];
    console.log('📡 Setting up real-time subscriptions for:', tables);

    const subscriptions = tables.map(table =>
      supabase
        .channel(`${table}-changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: table },
          async (payload: any) => {
            console.log(`🔔 Change detected in ${table}:`, payload.eventType);
            // Reload all data when any table changes
            const data = await fetchLeads();
            setLeads(data);

            if (payload.eventType === 'INSERT') {
              const name = payload.new.name || payload.new.first_name || 'New Lead';
              const company = payload.new.company || 'Unknown Company';
              console.log(`✨ New entry in ${table}`);
              toast.success(`🎉 New Lead: ${name}`, {
                description: `Added from ${company}`,
                duration: 5000,
              });
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 ${table} subscription status:`, status);
        })
    );

    // Subscribe to email messages for reply notifications
    const emailSub = supabase
      .channel('email-messages-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'email_messages' },
        async (payload: any) => {
          const message = payload.new;
          if (message.is_reply) {
            toast.info(`📧 New Reply`, {
              description: `${message.from_email} replied`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🛑 Cleaning up subscriptions');
      subscriptions.forEach(sub => sub.unsubscribe());
      emailSub.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') {
      toast.success(message, { duration: 4000 });
    } else if (type === 'error') {
      toast.error(message, { duration: 4000 });
    } else {
      toast.info(message, { duration: 4000 });
    }
  };

  const filtered = leads.filter(l => {
    const matchesSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());

    const matchesSource = sourceFilter === 'all' || l.source === sourceFilter;

    return matchesSearch && matchesSource;
  });

  const totalValue = leads.filter(l => l.stage !== 'Lost').reduce((a, l) => a + (l.value || 0), 0);
  const wonCount = leads.filter(l => l.stage === 'Won').length;
  const avgRisk = leads.length ? Math.round(leads.reduce((a, l) => a + (l.risk_score ?? calcRisk(l)), 0) / leads.length * 10) / 10 : 0;

  // Lead source breakdown
  const sourceBreakdown = leads.reduce((acc: Record<string, number>, l) => {
    const source = l.source || 'other';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});
  const sourceBreakdownData = [
    { name: 'Priority Access', value: sourceBreakdown.priority_access || 0, fill: '#3b82f6' },
    { name: 'Waitlist', value: sourceBreakdown.waitlist || 0, fill: '#10b981' },
    { name: 'Manual Entry', value: sourceBreakdown.manual_add || 0, fill: '#a855f7' },
    { name: 'Other', value: sourceBreakdown.other || 0, fill: '#64748b' },
  ].filter(s => s.value > 0);

  const growthData = PIPELINE_STAGES.map(s => ({ name: s, value: leads.filter(l => l.stage === s).length }));
  const sourceData = Object.entries(
    leads.reduce((acc: Record<string, number>, l) => { const k = l.industry || 'Other'; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).slice(0, 5).map(([name, value]) => ({ name, value }));

  const addLead = async () => {
    if (!form.name || !form.email || !form.company) return;
    const lead: Lead = {
      id: crypto.randomUUID(),
      name: form.name, email: form.email, company: form.company,
      phone: form.phone, industry: form.industry, ai_tools: form.ai_tools,
      stage: form.stage, value: parseInt(form.value) || 0, notes: form.notes,
      source: 'manual_add',
      created_at: new Date().toISOString(),
      log: [{ action: 'Lead registered via Atlas Forensic CRM', time: new Date().toLocaleString(), color: '#0ea5e9' }]
    };
    lead.risk_score = calcRisk(lead);

    const saved = await saveLead(lead);
    if (saved) {
      setLeads(prev => [saved, ...prev]);
      setForm({ name: '', email: '', company: '', phone: '', industry: '', ai_tools: '', stage: 'New', value: '', notes: '' });
      setTab('contacts');
      showToast('Lead added successfully', 'success');
    } else {
      showToast('Failed to add lead', 'error');
    }
  };

  const updateLead = async (updated: Lead) => {
    const saved = await saveLead(updated);
    if (saved) {
      setLeads(prev => prev.map(l => l.id === updated.id ? saved : l));
      setSelectedLead(saved);
      showToast('Lead updated successfully', 'success');
    } else {
      showToast('Failed to update lead', 'error');
    }
  };

  const exportCSV = (filter?: string) => {
    const filteredLeads = filter && filter !== 'all'
      ? leads.filter(l => l.source === filter)
      : leads;

    const headers = ['Name', 'Email', 'Company', 'Phone', 'Industry', 'AI Tools', 'Stage', 'Risk Score', 'Value', 'Notes', 'Created'];
    const rows = filteredLeads.map(l => [l.name, l.email, l.company, l.phone || '', l.industry || '', l.ai_tools || '', l.stage, l.risk_score ?? calcRisk(l), l.value || 0, l.notes || '', l.created_at]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    const filterLabel = filter && filter !== 'all' ? `-${filter}` : '';
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `atlas-leads${filterLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // API Key Handler
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      showToast('Key name required', 'error');
      return;
    }
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: newKeyName }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys([...(apiKeys || []), data.key]);
        setNewKeyName('');
        setShowNewKeyForm(false);
        showToast('API key created successfully', 'success');
      }
    } catch (e) {
      showToast('Failed to create API key', 'error');
    }
  };

  // 2FA Handler
  const handleToggle2FA = async () => {
    try {
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_2fa' }),
      });
      if (res.ok) {
        setTwoFAEnabled(!twoFAEnabled);
        showToast(`2FA ${!twoFAEnabled ? 'enabled' : 'disabled'}`, 'success');
      }
    } catch (e) {
      showToast('Failed to update 2FA settings', 'error');
    }
  };

  // GDPR Export Handler
  const handleGDPRExport = async () => {
    try {
      const res = await fetch('/api/gdpr?action=export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gdpr-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        showToast('Data exported successfully', 'success');
      }
    } catch (e) {
      showToast('Failed to export data', 'error');
    }
  };

  // GDPR Delete Handler
  const handleGDPRDelete = async () => {
    if (!confirm('⚠️ This will permanently delete all your data. This cannot be undone. Are you sure?')) {
      return;
    }
    try {
      const res = await fetch('/api/gdpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      if (res.ok) {
        showToast('Account and data deleted', 'success');
      }
    } catch (e) {
      showToast('Failed to delete account', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="border-b border-white/[0.06] bg-atlas-bg/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="h-10 w-10 bg-gradient-to-br from-atlas-primary to-atlas-secondary rounded-xl flex items-center justify-center shadow-lg shadow-atlas-primary/20 overflow-hidden"
            >
              <img src="/logo.png" alt="Atlas Synapse Logo" className="h-6 w-6 object-contain" />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight font-display">ATLAS SYNAPSE</h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-atlas-primary font-black">Forensic Growth Engine · CGO Console</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-atlas-card/60 p-1 rounded-full border border-white/[0.06] overflow-x-auto">
            {(['overview', 'contacts', 'pipeline', 'ai', 'workflows', 'integrations', 'collaboration', 'analytics', 'views', 'features', 'security', 'api', 'add', 'notifications', 'audit'] as const).map(t => (
              <motion.button key={t} onClick={() => setTab(t)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className={cn('px-3 py-2 rounded-full text-xs font-medium transition-all capitalize tracking-wide whitespace-nowrap',
                  tab === t ? 'bg-atlas-primary text-white shadow-lg shadow-atlas-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >{t === 'add' ? '+ Add' : t}</motion.button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCSVMenu(!showCSVMenu)}
                className="p-2 text-slate-500 hover:text-white transition-colors text-xs border border-white/[0.06] rounded-lg px-3 font-mono flex items-center gap-2"
              >↓ CSV <ChevronRight className={cn("h-3 w-3 transition-transform", showCSVMenu && "rotate-90")} /></motion.button>
              <AnimatePresence>
                {showCSVMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 bg-atlas-card border border-white/[0.06] rounded-lg overflow-hidden shadow-xl z-50"
                  >
                    <button onClick={() => { exportCSV('all'); setShowCSVMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors font-mono">
                      📊 All Leads
                    </button>
                    <button onClick={() => { exportCSV('priority_access'); setShowCSVMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors font-mono border-t border-white/[0.06]">
                      📧 Priority Access
                    </button>
                    <button onClick={() => { exportCSV('waitlist'); setShowCSVMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors font-mono border-t border-white/[0.06]">
                      📋 Waitlist
                    </button>
                    <button onClick={() => { exportCSV('manual_add'); setShowCSVMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors font-mono border-t border-white/[0.06]">
                      ✋ Manual Entry
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-400 transition-colors text-xs border border-white/[0.06] rounded-lg px-3 font-mono"
            >Log Out</motion.button>
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-white/[0.06] flex items-center justify-center text-xs font-bold text-atlas-primary">CGO</div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="p-3 bg-atlas-primary/10 rounded-full border border-atlas-primary/20"
            >
              <Database className="h-6 w-6 text-atlas-primary" />
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard label="Pipeline Value" value={fmtVal(totalValue)} change={leads.length > 0 ? 'Active' : 'Empty'} changeType="up" icon={TrendingUp} accent="linear-gradient(90deg,#10b981,transparent)" delay={0.05} explanation="Total monetary value of all non-lost leads in your pipeline." />
                  <StatCard label="Total Leads" value={String(leads.length)} change={leads.length > 0 ? `+${leads.length}` : '0'} changeType="up" icon={Users} accent="linear-gradient(90deg,#f97316,transparent)" delay={0.1} explanation="All leads across priority access, waitlist, and manual sources." />
                  <StatCard label="Closed Won" value={String(wonCount)} change={wonCount > 0 ? `${Math.round(wonCount / Math.max(leads.length, 1) * 100)}%` : '0%'} changeType="up" icon={CheckCircle2} accent="linear-gradient(90deg,#10b981,transparent)" delay={0.15} explanation="Deals successfully closed. Track win rate and conversion metrics." />
                  <StatCard label="Avg Risk Score" value={String(avgRisk)} change={avgRisk >= 7 ? 'HIGH' : avgRisk >= 4 ? 'MED' : 'LOW'} changeType={avgRisk >= 7 ? 'warn' : 'up'} icon={ShieldAlert} accent="linear-gradient(90deg,#ef4444,transparent)" delay={0.2} explanation="Risk based on missing data, tool usage, and engagement stage." />
                </div>

                {/* AI-POWERED INSIGHTS */}
                <AIInsights leads={leads} />

                {/* NEW: Dedicated Metric Cards for Priority Access & Waitlist */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Priority Access Requests */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="metric-card pulse-glow border-l-4 border-l-blue-500"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Priority Access</h4>
                      <Briefcase className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-4xl font-black text-blue-400 mb-2">{sourceBreakdown.priority_access || 0}</div>
                    <div className="text-xs text-slate-400">requests pending</div>
                    <div className="text-xs text-slate-500 mt-2">
                      {leads.length > 0 && `${Math.round(((sourceBreakdown.priority_access || 0) / leads.length) * 100)}% of total`}
                    </div>
                  </motion.div>

                  {/* Waitlist Signups */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="metric-card pulse-glow border-l-4 border-l-green-500"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Waitlist</h4>
                      <Users className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="text-4xl font-black text-green-400 mb-2">{sourceBreakdown.waitlist || 0}</div>
                    <div className="text-xs text-slate-400">signups queued</div>
                    <div className="text-xs text-slate-500 mt-2">
                      {leads.length > 0 && `${Math.round(((sourceBreakdown.waitlist || 0) / leads.length) * 100)}% of total`}
                    </div>
                  </motion.div>

                  {/* Active Pipeline */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="metric-card pulse-glow border-l-4 border-l-purple-500"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Active Pipeline</h4>
                      <Activity className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-4xl font-black text-purple-400 mb-2">{leads.filter(l => l.stage !== 'Lost').length}</div>
                    <div className="text-xs text-slate-400">non-lost leads</div>
                    <div className="text-xs text-slate-500 mt-2">
                      health status{' '}
                      <span className={avgRisk < 4 ? 'text-green-400' : avgRisk < 7 ? 'text-yellow-400' : 'text-red-400'}>
                        {avgRisk < 4 ? '✓ Good' : avgRisk < 7 ? '! Fair' : '✗ High'}
                      </span>
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-white">Pipeline by Stage</h3>
                    </div>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={growthData} barSize={32}>
                          <defs>
                            {PIPELINE_STAGES.map(s => (
                              <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={STAGE_COLORS[s]} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={STAGE_COLORS[s]} stopOpacity={0.4} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" vertical={false} />
                          <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<PipelineTooltip />} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {growthData.map((entry, i) => (
                              <Cell key={i} fill={`url(#grad-${PIPELINE_STAGES[i]})`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-white">Leads by Source</h3>
                    </div>
                    {sourceBreakdownData.length > 0 ? (
                      <div className="space-y-3">
                        {sourceBreakdownData.map((source) => (
                          <div key={source.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: source.fill }} />
                              <span className="text-xs text-slate-300">{source.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{source.value}</span>
                              <span className="text-[10px] text-slate-500">
                                {leads.length > 0 && `${Math.round((source.value / leads.length) * 100)}%`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[260px] flex items-center justify-center text-slate-600 text-sm">
                        No leads yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  <div className="glass-card p-6">
                    <h3 className="text-base font-bold text-white mb-6">Leads by Industry</h3>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceData.length ? sourceData : [{ name: 'No Data', value: 1 }]} layout="vertical" barSize={18}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" horizontal={false} />
                          <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} width={80} />
                          <Tooltip content={<PipelineTooltip />} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {(sourceData.length ? sourceData : [{ name: 'No Data', value: 1 }]).map((_, i) => (
                              <Cell key={i} fill={i % 2 === 0 ? '#f97316' : '#7c3aed'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Recent leads */}
                {leads.length > 0 && (
                  <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">Recent Leads</h3>
                      <button onClick={() => setTab('contacts')} className="text-xs text-atlas-primary hover:opacity-80 transition-opacity">View all →</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                          <th className="px-6 py-3">Lead</th><th className="px-6 py-3">Stage</th><th className="px-6 py-3">Risk</th><th className="px-6 py-3">Value</th>
                        </tr></thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {leads.slice(0, 5).map(l => (
                            <tr key={l.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedLead(l)}>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-atlas-card border border-white/[0.06] flex items-center justify-center text-xs font-bold text-white">{initials(l.name)}</div>
                                  <div><div className="text-sm font-semibold text-white">{l.name}</div><div className="text-[10px] text-slate-500">{l.company}</div></div>
                                </div>
                              </td>
                              <td className="px-6 py-3"><StagePill stage={l.stage} /></td>
                              <td className="px-6 py-3"><RiskBar score={l.risk_score ?? calcRisk(l)} /></td>
                              <td className="px-6 py-3 text-sm font-black text-atlas-primary">{fmtVal(l.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* CONTACTS */}
            {tab === 'contacts' && (
              <motion.div key="contacts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="glass-card overflow-hidden">
                  <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-white">Strategic Contacts</h3>
                      <div className="flex items-center gap-2">
                        {(['all', 'priority_access', 'manual_add', 'waitlist'] as const).map(f => (
                          <motion.button key={f} onClick={() => setSourceFilter(f)} whileHover={{ scale: 1.05 }}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all',
                              sourceFilter === f
                                ? 'bg-atlas-primary/20 text-atlas-primary border border-atlas-primary/40'
                                : 'bg-white/5 text-slate-400 border border-white/[0.06] hover:border-white/[0.12]'
                            )}
                          >
                            {f === 'all' ? '📊 All' : f === 'priority_access' ? '📧 Requests' : f === 'manual_add' ? '✋ Manual' : '📋 Waitlist'}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setTab('add')} className="gradient-btn flex items-center gap-2 text-xs py-2 px-4">
                      <Plus className="h-3 w-3" /> Add Lead
                    </button>
                  </div>
                  <div className="p-3 border-b border-white/[0.06]">
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, company, email..."
                      className="w-full bg-atlas-bg border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors font-mono placeholder-slate-600"
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                        <th className="px-6 py-3">Name</th><th className="px-6 py-3">Company</th>
                        <th className="px-6 py-3">Source</th><th className="px-6 py-3">Stage</th>
                        <th className="px-6 py-3">Risk</th><th className="px-6 py-3 text-right">Value</th><th className="px-6 py-3"></th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {filtered.length === 0 ? (
                          <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-600 text-sm">
                            {leads.length === 0 ? 'No leads yet. Register your first lead.' : 'No results match your search.'}
                          </td></tr>
                        ) : filtered.map(l => (
                          <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setSelectedLead(l)}>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-atlas-card border border-white/[0.06] flex items-center justify-center text-xs font-bold text-white">{initials(l.name)}</div>
                                <div><div className="text-sm font-semibold text-white">{l.name}</div><div className="text-[10px] text-slate-500">{l.email}</div></div>
                              </div>
                            </td>
                            <td className="px-6 py-3"><div className="text-sm text-slate-300">{l.company}</div></td>
                            <td className="px-6 py-3"><SourceBadge source={l.source} /></td>
                            <td className="px-6 py-3"><StagePill stage={l.stage} /></td>
                            <td className="px-6 py-3"><RiskBar score={l.risk_score ?? calcRisk(l)} /></td>
                            <td className="px-6 py-3 text-right text-sm font-black text-atlas-primary">{fmtVal(l.value)}</td>
                            <td className="px-6 py-3"><button className="p-1.5 text-slate-600 hover:text-white transition-colors"><MoreVertical className="h-4 w-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-3 border-t border-white/[0.06] flex justify-between items-center">
                    <span className="text-[10px] text-slate-600 font-mono">Showing {filtered.length} of {leads.length} leads</span>
                    <button onClick={exportCSV} className="text-[10px] text-slate-500 hover:text-white transition-colors font-mono">↓ Export CSV</button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PIPELINE */}
            {tab === 'pipeline' && (
              <motion.div key="pipeline" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white font-display">Sales Pipeline</h2>
                    <p className="text-slate-400 text-sm mt-1">Visualizing the flow of institutional growth.</p>
                  </div>
                  <div className="glass-card px-5 py-3 flex items-center gap-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Value</div>
                    <div className="text-xl font-black text-atlas-primary">{fmtVal(totalValue)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-5">Pipeline Velocity</h3>
                    <PipelineBoard leads={leads} />
                  </div>
                  <div className="glass-card p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-5">Funnel Conversion</h3>
                    <PipelineFunnel leads={leads} />
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-[10px] font-bold text-white uppercase tracking-widest">Closed Won</span></div>
                        <span className="text-sm font-black text-emerald-500">{fmtVal(leads.filter(l => l.stage === 'Won').reduce((a, l) => a + l.value, 0))}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-atlas-primary" /><span className="text-[10px] font-bold text-white uppercase tracking-widest">In Progress</span></div>
                        <span className="text-sm font-black text-atlas-primary">{fmtVal(leads.filter(l => !['Won', 'Lost'].includes(l.stage)).reduce((a, l) => a + l.value, 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ADD LEAD */}
            {tab === 'add' && (
              <motion.div key="add" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                <div className="glass-card max-w-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Register New Lead</h3>
                    <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-atlas-primary/10 text-atlas-primary border border-atlas-primary/20">Forensic Intake</span>
                  </div>
                  <div className="p-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {[
                        { id: 'name', label: 'Full Name *', placeholder: 'Jane Smith', type: 'text' },
                        { id: 'email', label: 'Email *', placeholder: 'jane@company.com', type: 'email' },
                        { id: 'company', label: 'Company Name *', placeholder: 'Acme Corp', type: 'text' },
                        { id: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', type: 'text' },
                        { id: 'ai_tools', label: 'Current AI Tools Used', placeholder: 'ChatGPT, Zapier, Make...', type: 'text' },
                        { id: 'value', label: 'Estimated Value ($)', placeholder: '10000', type: 'number' },
                      ].map(f => (
                        <div key={f.id}>
                          <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1.5">{f.label}</label>
                          <input type={f.type} placeholder={f.placeholder}
                            value={(form as any)[f.id]} onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                            className="w-full bg-atlas-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors font-mono placeholder-slate-600"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Industry</label>
                        <select value={form.industry} onChange={e => setForm(prev => ({ ...prev, industry: e.target.value }))}
                          className="w-full bg-atlas-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors font-mono"
                        >
                          <option value="">Select industry...</option>
                          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Pipeline Stage</label>
                        <select value={form.stage} onChange={e => setForm(prev => ({ ...prev, stage: e.target.value as PipelineStage }))}
                          className="w-full bg-atlas-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors font-mono"
                        >
                          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mb-5">
                      <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Initial Notes</label>
                      <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3} placeholder="Discovery call notes, context, next steps..."
                        className="w-full bg-atlas-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors font-mono resize-none placeholder-slate-600"
                      />
                    </div>
                    <div className="flex gap-3">
                      <motion.button onClick={addLead} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        disabled={!form.name || !form.email || !form.company}
                        className="gradient-btn flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      >Register Lead <ChevronRight className="h-4 w-4" /></motion.button>
                      <motion.button onClick={() => setForm({ name: '', email: '', company: '', phone: '', industry: '', ai_tools: '', stage: 'New', value: '', notes: '' })}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="px-5 py-2.5 rounded-full text-sm text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-all"
                      >Clear</motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AUDIT */}
            {tab === 'audit' && (
              <motion.div key="audit" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                <ForensicAuditView leads={leads} />
              </motion.div>
            )}

            {/* NOTIFICATIONS */}
            {tab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white font-display mb-1">Notifications & Updates</h2>
                  <p className="text-slate-400 text-sm">Track follow-ups, email replies, and status changes in real-time</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="glass-card p-5 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs uppercase tracking-wider text-blue-400 font-bold">Pending Follow-ups</p>
                      <Mail className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="text-3xl font-black text-white">{leads.filter(l => ['Contacted', 'Proposal'].includes(l.stage)).length}</p>
                    <p className="text-xs text-slate-500 mt-2">Leads awaiting next step</p>
                  </div>

                  <div className="glass-card p-5 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs uppercase tracking-wider text-green-400 font-bold">Active Deals</p>
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    </div>
                    <p className="text-3xl font-black text-white">{leads.filter(l => ['Proposal', 'Negotiation'].includes(l.stage)).length}</p>
                    <p className="text-xs text-slate-500 mt-2">In active negotiation</p>
                  </div>

                  <div className="glass-card p-5 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs uppercase tracking-wider text-red-400 font-bold">Lost Leads</p>
                      <XCircle className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-3xl font-black text-white">{leads.filter(l => l.stage === 'Lost').length}</p>
                    <p className="text-xs text-slate-500 mt-2">Disqualified pipeline</p>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-atlas-primary" />
                    Recent Lead Updates
                  </h3>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {leads.slice(0, 10).map((lead, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 bg-white/[0.02] rounded-lg border border-white/5 hover:border-atlas-primary/30 transition-colors cursor-pointer"
                        onClick={() => { setSelectedLead(lead); setTab('contacts'); }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{lead.name}</p>
                            <p className="text-xs text-slate-500">{lead.company}</p>
                          </div>
                          <StagePill stage={lead.stage} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI PHASE 1 */}
            {tab === 'ai' && (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">🤖 AI Intelligence</h2>
                <AIInsights leads={leads} />
              </motion.div>
            )}

            {/* WORKFLOWS PHASE 2 */}
            {tab === 'workflows' && (
              <motion.div key="workflows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">⚙️ Workflow Automation</h2>
                <WorkflowBuilder onSave={(wf) => toast.success(`Workflow "${wf.name}" saved`)} />
              </motion.div>
            )}

            {/* INTEGRATIONS PHASE 3 */}
            {tab === 'integrations' && (
              <motion.div key="integrations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">🔗 Integrations</h2>
                <IntegrationsManager />
              </motion.div>
            )}

            {/* COLLABORATION PHASE 4 */}
            {tab === 'collaboration' && (
              <motion.div key="collaboration" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">💬 Team Collaboration</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CommentsThread leadId={selectedLead?.id || ''} user="steve" />
                  <ActivityFeed leadId={selectedLead?.id || ''} />
                </div>
              </motion.div>
            )}

            {/* ANALYTICS PHASE 5 */}
            {tab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">📊 Advanced Analytics</h2>
                <AdvancedAnalyticsDashboard />
              </motion.div>
            )}

            {/* VIEWS PHASE 9 */}
            {tab === 'views' && (
              <motion.div key="views" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">🎨 Advanced Views</h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Kanban Board</h3>
                    <KanbanView leads={leads} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Timeline</h3>
                    <TimelineView leads={leads} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">Calendar</h3>
                    <CalendarView leads={leads} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* FEATURES PHASE 10 */}
            {tab === 'features' && (
              <motion.div key="features" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">🛠️ Advanced Features</h2>
                <AdvancedFeaturesPanel />
              </motion.div>
            )}

            {/* SECURITY PHASE 7 */}
            {tab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">🔐 Enterprise Security</h2>
                <div className="glass-card p-6 rounded-lg border border-white/10 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={handleToggle2FA} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold">
                      {twoFAEnabled ? '✓ 2FA Enabled' : 'Enable 2FA'}
                    </button>
                    <button onClick={handleGDPRExport} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-bold">
                      Export Data (GDPR)
                    </button>
                    <button onClick={handleGDPRDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold">
                      Delete Account (GDPR)
                    </button>
                    <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-bold">
                      View Audit Logs
                    </button>
                  </div>
                  <p className="text-sm text-slate-300 mt-4">✅ SOC 2 Compliance • ✅ GDPR Ready • ✅ Encrypted Sessions • ✅ Role-Based Access</p>
                </div>
              </motion.div>
            )}

            {/* API PHASE 8 */}
            {tab === 'api' && (
              <motion.div key="api" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">🔌 Developer API</h2>
                <div className="glass-card p-6 rounded-lg border border-white/10 space-y-4">
                  <div>
                    <p className="text-sm text-slate-300 mb-2">📖 API Documentation:</p>
                    <a href="/API_DOCS.md" className="text-blue-400 hover:text-blue-300">View Full API Docs →</a>
                  </div>
                  <div>
                    <p className="text-sm text-slate-300 mb-2">🔑 Generate API Key:</p>
                    {!showNewKeyForm ? (
                      <button onClick={() => setShowNewKeyForm(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm">
                        Create New Key
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key name (e.g., Production API)"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                        />
                        <button onClick={handleCreateApiKey} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm">
                          Create
                        </button>
                        <button onClick={() => setShowNewKeyForm(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-bold text-sm">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  {apiKeys && apiKeys.length > 0 && (
                    <div>
                      <p className="text-sm text-slate-300 mb-2">📋 Your API Keys:</p>
                      <div className="space-y-2">
                        {apiKeys.map((key: any, idx: number) => (
                          <div key={idx} className="bg-slate-800/50 p-2 rounded text-xs text-slate-400">
                            {typeof key === 'string' ? `sk_${key.substring(0, 8)}...` : key.name || 'API Key'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-300 mb-2">📦 SDK Available:</p>
                    <code className="bg-slate-800 p-2 rounded text-xs text-green-400">npm install @atlas-synapse/sdk</code>
                  </div>
                </div>
              </motion.div>
            )}

            {/* MOBILE PHASE 6 */}
            {tab === 'mobile' && (
              <motion.div key="mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white">📱 Mobile App</h2>
                <div className="glass-card p-6 rounded-lg border border-white/10 space-y-4">
                  <p className="text-sm text-slate-300">iOS & Android apps with offline sync and push notifications</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="bg-black hover:bg-gray-900 text-white px-4 py-2 rounded font-bold text-sm">📱 Download iOS</button>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold text-sm">📱 Download Android</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-4">✅ Offline Sync • ✅ Push Notifications • ✅ Biometric Auth</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-7 bg-atlas-bg/40 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-40">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Verified Trust Layer</span>
          </div>
          <p className="text-xs text-slate-600">© 2026 Atlas Synapse LLC · All interactions monitored for stochastic leakage.</p>
          <div className="flex items-center gap-5">
            <a href="/privacy/gdpr" className="text-xs text-slate-600 hover:text-white transition-colors">GDPR Compliance</a>
            <a href="/privacy/ai-act" className="text-xs text-slate-600 hover:text-white transition-colors">EU AI Act Registry</a>
            <a href="/privacy/policy" className="text-xs text-slate-600 hover:text-white transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>

      {/* MODAL */}
      <AnimatePresence>
        {selectedLead && (
          <ContactModal lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={updateLead} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CRMDashboard;
