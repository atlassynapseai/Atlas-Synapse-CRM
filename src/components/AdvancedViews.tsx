import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, GripVertical } from 'lucide-react';

// Utility to combine classNames
const cn = (...classes: (string | undefined | boolean)[]) =>
  classes.filter(Boolean).join(' ');

interface Lead {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: string;
}

const STAGES = ['New', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'];

export const KanbanView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  const [boardLeads, setBoardLeads] = useState(leads);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDrop = (newStage: string) => {
    if (!draggedLead) return;
    const updated = boardLeads.map((l) =>
      l.id === draggedLead.id ? { ...l, stage: newStage } : l
    );
    setBoardLeads(updated);
    setDraggedLead(null);
  };

  return (
    <div className="flex overflow-x-auto gap-4 pb-4">
      {STAGES.map((stage) => {
        const stageLeads = boardLeads.filter((l) => l.stage === stage);
        return (
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0 w-72 bg-slate-800/50 rounded-lg p-4 border border-slate-700"
          >
            <h3 className="font-bold text-white mb-4">
              {stage}
              <span className="text-xs text-slate-400 ml-2">({stageLeads.length})</span>
            </h3>

            <div
              onDrop={() => handleDrop(stage)}
              onDragOver={(e) => e.preventDefault()}
              className="space-y-2 min-h-[400px]"
            >
              {stageLeads.map((lead) => (
                <motion.div
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead)}
                  className="bg-slate-700 rounded-lg p-3 cursor-move hover:bg-slate-600 transition border-l-4 border-blue-500"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {lead.name}
                      </p>
                      <p className="text-xs text-slate-400">{lead.company}</p>
                      <p className="text-xs text-green-400 font-bold mt-1">
                        ${(lead.value / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Timeline View - Real-time with actual dates
export const TimelineView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  // Sort by actual lead creation date if available, otherwise by stage progression
  const sorted = [...leads].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime; // Most recent first
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No date';
    const date = new Date(dateStr);
    const today = new Date();
    const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {sorted.map((lead, idx) => (
        <motion.div
          key={lead.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex gap-4"
        >
          <div className="flex-shrink-0 w-24 text-right">
            <p className="text-xs font-bold text-blue-400">{formatDate(lead.created_at)}</p>
            <p className="text-[10px] text-slate-500 mt-1">{lead.stage}</p>
          </div>
          <div className="flex-1">
            <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500 hover:border-green-500 transition">
              <p className="font-semibold text-white">{lead.name}</p>
              <p className="text-sm text-slate-400">{lead.company}</p>
              <p className="text-xs text-green-400 mt-2">${(lead.value / 1000).toFixed(0)}K deal</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Calendar View - Real-time with actual task dates
export const CalendarView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Map leads to calendar dates based on their created_at
  const leadsPerDay: Record<number, Lead[]> = {};
  leads.forEach((lead) => {
    if (lead.created_at) {
      const leadDate = new Date(lead.created_at);
      if (leadDate.getFullYear() === year && leadDate.getMonth() === month) {
        const day = leadDate.getDate();
        if (!leadsPerDay[day]) leadsPerDay[day] = [];
        leadsPerDay[day].push(lead);
      }
    }
  });

  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-slate-300">📅 {monthName}</p>
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
          <div key={dayName} className="text-center font-bold text-slate-400 text-xs py-2">
            {dayName}
          </div>
        ))}
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-slate-900/30 rounded-lg" />
        ))}
        {/* Days with leads */}
        {days.map((day) => {
          const dayLeads = leadsPerDay[day] || [];
          const isToday = day === today.getDate();
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'aspect-square rounded-lg p-2 border transition',
                isToday
                  ? 'bg-blue-600/30 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 border-slate-700 hover:border-blue-500'
              )}
            >
              <p className={cn('text-xs font-bold mb-1', isToday ? 'text-blue-300' : 'text-white')}>
                {day}
              </p>
              <div className="space-y-0.5">
                {dayLeads.slice(0, 2).map((lead, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] bg-green-600 text-white rounded px-1 truncate"
                    title={`${lead.name} - ${lead.stage}`}
                  >
                    {lead.name.split(' ')[0]}
                  </div>
                ))}
                {dayLeads.length > 2 && (
                  <p className="text-[10px] text-slate-400 font-bold">+{dayLeads.length - 2}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 mt-4">
        💡 {Object.values(leadsPerDay).flat().length} tasks this month • {Object.keys(leadsPerDay).length} active days
      </p>
    </div>
  );
};
