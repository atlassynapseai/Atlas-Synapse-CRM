import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, GripVertical } from 'lucide-react';

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

// Timeline View
export const TimelineView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  const sorted = [...leads].sort(
    (a, b) => new Date(a.id).getTime() - new Date(b.id).getTime()
  );

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
          <div className="flex-shrink-0 w-20 text-right">
            <p className="text-xs font-bold text-blue-400">Jan {idx + 1}</p>
          </div>
          <div className="flex-1">
            <div className="bg-slate-800 rounded-lg p-4 border-l-4 border-blue-500">
              <p className="font-semibold text-white">{lead.name}</p>
              <p className="text-sm text-slate-400">{lead.company}</p>
              <p className="text-xs text-green-400 mt-2">{lead.stage}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Calendar View (simplified)
export const CalendarView: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-7 gap-2">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="text-center font-bold text-slate-400 text-xs py-2">
          {day}
        </div>
      ))}
      {days.map((day) => {
        const dayLeads = leads.slice(0, Math.random() * 3);
        return (
          <motion.div
            key={day}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-square bg-slate-800 rounded-lg p-2 border border-slate-700 hover:border-blue-500 transition"
          >
            <p className="text-xs font-bold text-white mb-1">{day}</p>
            <div className="space-y-0.5">
              {dayLeads.slice(0, 2).map((lead, idx) => (
                <div
                  key={idx}
                  className="text-[10px] bg-blue-600 text-white rounded px-1 truncate"
                >
                  {lead.name.split(' ')[0]}
                </div>
              ))}
              {dayLeads.length > 2 && (
                <p className="text-[10px] text-slate-400">+{dayLeads.length - 2}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
