import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, TrendingUp, Target, AlertCircle, CheckCircle,
  Clock, User, Mail, Phone, Star, Copy, X, Filter, Download
} from 'lucide-react';

// ── ACTIVITY TIMELINE ──
export const ActivityTimeline = ({ activities }: { activities: any[] }) => {
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {activities.map((activity, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3 stagger-item"
          >
            <div className="relative flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-atlas-primary/20 border border-atlas-primary/40 flex items-center justify-center">
                <Activity className="h-4 w-4 text-atlas-primary" />
              </div>
              {i < activities.length - 1 && (
                <div className="h-6 w-0.5 bg-gradient-to-b from-atlas-primary/40 to-transparent my-1" />
              )}
            </div>
            <div className="flex-1 pt-1">
              <p className="text-xs font-bold text-white">{activity.action}</p>
              <p className="text-[10px] text-slate-500">{activity.time}</p>
            </div>
            <div className="pulse-indicator" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ── ADVANCED ANALYTICS ──
export const AdvancedAnalytics = ({ leads }: { leads: any[] }) => {
  const metrics = [
    {
      label: 'Conversion Rate',
      value: leads.length > 0 ? `${Math.round((leads.filter(l => l.stage === 'Won').length / leads.length) * 100)}%` : '0%',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      change: '+12% from last month'
    },
    {
      label: 'Avg Deal Size',
      value: leads.length > 0 ? `$${Math.round(leads.reduce((a, l) => a + l.value, 0) / leads.length / 1000)}K` : '$0',
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      change: '+8% growth'
    },
    {
      label: 'Sales Velocity',
      value: `${Math.round(leads.filter(l => l.stage !== 'New').length / Math.max(leads.length, 1) * 100)}%`,
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      change: 'Moving fast'
    },
    {
      label: 'Risk Assessment',
      value: Math.round(leads.reduce((a, l) => a + (l.risk_score || 0), 0) / Math.max(leads.length, 1)),
      icon: AlertCircle,
      color: 'from-orange-500 to-red-500',
      change: 'Monitor closely'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <AnimatePresence>
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5 hover-lift group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-br ${metric.color} bg-opacity-10`}>
                  <Icon className="h-5 w-5" style={{
                    color: metric.color.includes('green') ? '#10b981' :
                           metric.color.includes('blue') ? '#3b82f6' :
                           metric.color.includes('purple') ? '#8b5cf6' : '#f97316'
                  }} />
                </div>
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="text-slate-500 group-hover:text-atlas-primary transition-colors"
                >
                  <Star className="h-4 w-4 cursor-pointer" />
                </motion.div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{metric.label}</p>
              <p className="text-2xl font-black text-white mb-2">{metric.value}</p>
              <p className="text-[10px] text-sky-400">{metric.change}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// ── BULK ACTIONS ──
export const BulkActions = ({
  selectedLeads,
  onBulkMove,
  onBulkDelete,
  onClose
}: {
  selectedLeads: string[];
  onBulkMove: (stage: string) => void;
  onBulkDelete: () => void;
  onClose: () => void;
}) => {
  const [action, setAction] = useState<'move' | 'delete' | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed bottom-6 left-6 right-6 z-40"
    >
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-atlas-primary/20 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-atlas-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{selectedLeads.length} leads selected</p>
            <p className="text-xs text-slate-400">Choose an action to proceed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setAction(action === 'move' ? null : 'move')}
            className="px-3 py-2 text-xs font-bold bg-atlas-primary/20 hover:bg-atlas-primary/30 text-atlas-primary rounded-lg transition-colors"
          >
            Move
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setAction(action === 'delete' ? null : 'delete')}
            className="px-3 py-2 text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Delete
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ── SKELETON CARD ──
export const SkeletonCard = () => (
  <div className="glass-card p-6 space-y-4">
    <div className="skeleton h-8 w-32" />
    <div className="space-y-2">
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-4/5" />
    </div>
    <div className="flex gap-2">
      <div className="skeleton h-6 w-16 rounded-full" />
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  </div>
);

// ── STAT CARD WITH ANIMATION ──
export const AnimatedStatCard = ({
  label,
  value,
  change,
  icon: Icon,
  color
}: {
  label: string;
  value: string | number;
  change?: string;
  icon: any;
  color: string;
}) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="glass-card p-6 badge-glow"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-${color}-500/20`}>
        <Icon className={`h-5 w-5 text-${color}-400`} />
      </div>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
        <Activity className="h-4 w-4 text-atlas-primary opacity-50" />
      </motion.div>
    </div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</p>
    <p className="text-3xl font-black text-white mb-1 bounce-in">{value}</p>
    {change && <p className="text-xs text-slate-400">{change}</p>}
  </motion.div>
);

// ── LEAD COMPARISON ──
export const LeadComparison = ({ lead1, lead2, onClose }: { lead1: any; lead2: any; onClose: () => void }) => {
  const fields = ['email', 'company', 'phone', 'industry', 'ai_tools', 'value', 'stage'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Lead Comparison</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-4">
          <h4 className="font-bold text-white text-sm">{lead1.name}</h4>
          {fields.map(field => (
            <div key={field}>
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{field}</p>
              <p className="text-xs text-slate-300">{lead1[field] || '—'}</p>
            </div>
          ))}
        </div>

        <div className="border-l border-r border-white/[0.06] px-6">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-4">Differences</p>
          <div className="space-y-4">
            {fields.map(field => {
              const same = lead1[field] === lead2[field];
              return (
                <div key={field} className="h-8 flex items-center">
                  {same ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-white text-sm">{lead2.name}</h4>
          {fields.map(field => (
            <div key={field}>
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{field}</p>
              <p className="text-xs text-slate-300">{lead2[field] || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ActivityTimeline;