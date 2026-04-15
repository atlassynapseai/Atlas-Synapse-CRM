import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Scale, Database, Activity,
  ChevronRight, Lock, Search, Users, TrendingUp, Briefcase, Mail,
  MoreVertical, Plus, Phone, Filter, CheckCircle2, XCircle, Clock,
  ArrowUpRight, Layers
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, FunnelChart, Funnel, LabelList
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

function saveLeads(leads: Lead[]) {
  localStorage.setItem('atlas_crm_leads_v3', JSON.stringify(leads));
}

function loadLeads(): Lead[] {
  try {
    return JSON.parse(localStorage.getItem('atlas_crm_leads_v3') || '[]');
  } catch { return []; }
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

const StatCard = ({ label, value, change, changeType, icon: Icon, accent }:
  { label: string; value: string; change: string; changeType: 'up' | 'down' | 'warn'; icon: any; accent: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-6 relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-white/5 rounded-lg">
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <span className={cn('text-xs font-bold',
        changeType === 'up' ? 'text-emerald-500' : changeType === 'warn' ? 'text-red-500' : 'text-red-500'
      )}>{change}</span>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
  </motion.div>
);

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

const PipelineBoard = ({ leads }: { leads: Lead[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
    {PIPELINE_STAGES.map(stage => {
      const stageLeads = leads.filter(l => l.stage === stage);
      return (
        <div key={stage} className="min-w-[180px] space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stage}</h4>
            <span className="text-[10px] font-bold bg-white/5 px-1.5 py-0.5 rounded text-slate-400">{stageLeads.length}</span>
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

const ForensicAuditView = () => {
  const score = RISK_ANALYSIS.score;
  const scoreColor = score > 7 ? '#ef4444' : score > 4 ? '#f97316' : '#10b981';
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldAlert className="text-atlas-primary h-7 w-7" />
            FORENSIC AUDIT: STOCHASTIC LEAK ANALYSIS
          </h2>
          <p className="text-slate-400 text-sm mt-1">Lead Forensic Auditor: Julius @ Atlas Synapse</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Risk Score</div>
          <div className="text-5xl font-black" style={{ color: scoreColor }}>{score.toFixed(1)}<span className="text-2xl text-slate-600">/10</span></div>
        </div>
      </div>
      <div className="glass-card p-6 bg-red-500/5 border-red-500/20">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-red-400 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> AUDITOR'S MANDATORY DIRECTIVE
        </h3>
        <p className="text-base font-medium text-slate-100 leading-relaxed">"{AUDITOR_NOTE}"</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-6 border-l-4 border-l-red-500">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 mb-4 flex items-center gap-2">
            <Scale className="h-4 w-4" /> LEGAL LIABILITIES IDENTIFIED
          </h3>
          <ul className="space-y-3">
            {RISK_ANALYSIS.liabilities.map((lib, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
                <div className="mt-2 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                {lib}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-atlas-primary">
          <h3 className="text-sm font-bold uppercase tracking-wider text-atlas-primary mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4" /> STOCHASTIC LEAK VECTORS
          </h3>
          <ul className="space-y-3">
            {RISK_ANALYSIS.stochasticLeaks.map((leak, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
                <div className="mt-2 h-1.5 w-1.5 rounded-full bg-atlas-primary shrink-0" />
                {leak}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="glass-card p-8 bg-gradient-to-br from-atlas-card to-atlas-bg border-atlas-secondary/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
          <Lock className="text-atlas-secondary h-6 w-6" /> DETERMINISTIC CLEAN ROOM: INITIATION
        </h3>
        <div className="bg-atlas-bg/60 p-4 rounded-xl border border-white/5 mb-6">
          <p className="text-sm font-semibold text-atlas-primary uppercase tracking-widest mb-2">Final Mitigation Directive:</p>
          <p className="text-slate-200 text-sm leading-relaxed">{RISK_ANALYSIS.mitigationStrategy}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="gradient-btn w-full flex items-center justify-center gap-2 group py-3"
        >
          INITIATE TRANSFER TO DETERMINISTIC CLEAN ROOM
          <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>
    </motion.div>
  );
};

// ── CONTACT MODAL ──
const ContactModal = ({ lead, onClose, onUpdate }: { lead: Lead; onClose: () => void; onUpdate: (l: Lead) => void }) => {
  const [stage, setStage] = useState(lead.stage);
  const [notes, setNotes] = useState(lead.notes || '');
  const [saved, setSaved] = useState(false);
  const rs = lead.risk_score ?? calcRisk(lead);

  const handleSave = () => {
    const updated = {
      ...lead, stage, notes,
      risk_score: calcRisk({ ...lead, stage, notes }),
      log: [...(lead.log || []),
        ...(stage !== lead.stage ? [{ action: `Stage: ${lead.stage} → ${stage}`, time: new Date().toLocaleString(), color: STAGE_COLORS[stage] }] : []),
        { action: 'Notes updated', time: new Date().toLocaleString(), color: '#7c3aed' }
      ]
    };
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white">
              <XCircle className="h-6 w-6" />
            </button>
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
      </motion.div>
    </motion.div>
  );
};

// ── MAIN COMPONENT ──
const CRMDashboard = () => {
  const [tab, setTab] = useState<'overview' | 'contacts' | 'pipeline' | 'add' | 'audit'>('overview');
  const [leads, setLeads] = useState<Lead[]>(loadLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');

  // Form state
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', industry: '', ai_tools: '', stage: 'New' as PipelineStage, value: '', notes: '' });

  useEffect(() => { saveLeads(leads); }, [leads]);

  const filtered = leads.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.name.toLowerCase().includes(s) || l.company.toLowerCase().includes(s) || l.email.toLowerCase().includes(s);
  });

  const totalValue = leads.filter(l => l.stage !== 'Lost').reduce((a, l) => a + (l.value || 0), 0);
  const wonCount = leads.filter(l => l.stage === 'Won').length;
  const avgRisk = leads.length ? Math.round(leads.reduce((a, l) => a + (l.risk_score ?? calcRisk(l)), 0) / leads.length * 10) / 10 : 0;

  const growthData = PIPELINE_STAGES.map(s => ({ name: s, value: leads.filter(l => l.stage === s).length }));
  const sourceData = Object.entries(
    leads.reduce((acc: Record<string, number>, l) => { const k = l.industry || 'Other'; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).slice(0, 5).map(([name, value]) => ({ name, value }));

  const addLead = () => {
    if (!form.name || !form.email || !form.company) return;
    const lead: Lead = {
      id: Date.now().toString(),
      name: form.name, email: form.email, company: form.company,
      phone: form.phone, industry: form.industry, ai_tools: form.ai_tools,
      stage: form.stage, value: parseInt(form.value) || 0, notes: form.notes,
      created_at: new Date().toISOString(),
      log: [{ action: 'Lead registered via Atlas Forensic CRM', time: new Date().toLocaleString(), color: '#0ea5e9' }]
    };
    lead.risk_score = calcRisk(lead);
    setLeads(prev => [lead, ...prev]);
    setForm({ name: '', email: '', company: '', phone: '', industry: '', ai_tools: '', stage: 'New', value: '', notes: '' });
    setTab('contacts');
  };

  const updateLead = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Company', 'Phone', 'Industry', 'AI Tools', 'Stage', 'Risk Score', 'Value', 'Notes', 'Created'];
    const rows = leads.map(l => [l.name, l.email, l.company, l.phone || '', l.industry || '', l.ai_tools || '', l.stage, l.risk_score ?? calcRisk(l), l.value || 0, l.notes || '', l.created_at]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `atlas-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <header className="border-b border-white/[0.06] bg-atlas-bg/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gradient-to-br from-atlas-primary to-atlas-secondary rounded-xl flex items-center justify-center shadow-lg shadow-atlas-primary/20">
              <Database className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight font-display">ATLAS SYNAPSE</h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-atlas-primary font-black">Forensic Growth Engine · CGO Console</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-atlas-card/60 p-1 rounded-full border border-white/[0.06]">
            {(['overview', 'contacts', 'pipeline', 'add', 'audit'] as const).map(t => (
              <motion.button key={t} onClick={() => setTab(t)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className={cn('px-5 py-2 rounded-full text-xs font-medium transition-all capitalize tracking-wide',
                  tab === t ? 'bg-atlas-primary text-white shadow-lg shadow-atlas-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >{t === 'add' ? '+ Add Lead' : t}</motion.button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={exportCSV}
              className="p-2 text-slate-500 hover:text-white transition-colors text-xs border border-white/[0.06] rounded-lg px-3 font-mono"
            >↓ CSV</motion.button>
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-white/[0.06] flex items-center justify-center text-xs font-bold text-atlas-primary">CGO</div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard label="Pipeline Value" value={fmtVal(totalValue)} change={leads.length > 0 ? 'Active' : 'Empty'} changeType="up" icon={TrendingUp} accent="linear-gradient(90deg,#10b981,transparent)" />
                <StatCard label="Total Leads" value={String(leads.length)} change={leads.length > 0 ? `+${leads.length}` : '0'} changeType="up" icon={Users} accent="linear-gradient(90deg,#f97316,transparent)" />
                <StatCard label="Closed Won" value={String(wonCount)} change={wonCount > 0 ? `${Math.round(wonCount / Math.max(leads.length, 1) * 100)}% rate` : '0%'} changeType="up" icon={CheckCircle2} accent="linear-gradient(90deg,#10b981,transparent)" />
                <StatCard label="Avg Risk Score" value={String(avgRisk)} change={avgRisk >= 7 ? 'CRITICAL' : avgRisk >= 4 ? 'MODERATE' : 'LOW'} changeType={avgRisk >= 7 ? 'warn' : 'up'} icon={ShieldAlert} accent="linear-gradient(90deg,#ef4444,transparent)" />
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
                        <Tooltip contentStyle={{ backgroundColor: '#0a0f24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontFamily: 'monospace', fontSize: '11px' }} />
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
                  <h3 className="text-base font-bold text-white mb-6">Leads by Industry</h3>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sourceData.length ? sourceData : [{ name: 'No Data', value: 1 }]} layout="vertical" barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" horizontal={false} />
                        <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: '#0a0f24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontFamily: 'monospace', fontSize: '11px' }} />
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
                    <div className="flex items-center gap-1.5 bg-atlas-bg border border-white/[0.06] rounded-lg px-2.5 py-1">
                      <Filter className="h-3 w-3 text-slate-500" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">All</span>
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
                      <th className="px-6 py-3">AI Tools</th><th className="px-6 py-3">Stage</th>
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
                          <td className="px-6 py-3"><div className="text-xs text-slate-500 max-w-[100px] truncate">{l.ai_tools || '—'}</div></td>
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
              <ForensicAuditView />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] py-7 bg-atlas-bg/40 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-40">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Verified Trust Layer v2.4.1</span>
          </div>
          <p className="text-xs text-slate-600">© 2026 Atlas Synapse LLC · All interactions monitored for stochastic leakage.</p>
          <div className="flex items-center gap-5">
            {['GDPR Compliance', 'EU AI Act Registry', 'Privacy Policy'].map(l => (
              <a key={l} href="#" className="text-xs text-slate-600 hover:text-white transition-colors">{l}</a>
            ))}
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
