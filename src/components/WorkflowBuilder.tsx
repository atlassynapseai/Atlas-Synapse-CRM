import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Play, Save } from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowStep {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  name: string;
  config: Record<string, any>;
  nextStepId?: string;
}

interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  active: boolean;
  createdAt: string;
}

const ACTION_TYPES = [
  { type: 'send_email', label: '📧 Send Email' },
  { type: 'send_slack', label: '💬 Send Slack' },
  { type: 'create_task', label: '✓ Create Task' },
  { type: 'update_field', label: '🔄 Update Field' },
];

const CONDITION_FIELDS = ['stage', 'status', 'value', 'source'];

export const WorkflowBuilder: React.FC<{
  workflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
}> = ({ workflow, onSave }) => {
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps || []);
  const [name, setName] = useState(workflow?.name || '');

  const addStep = (type: 'trigger' | 'action' | 'condition') => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      type,
      name: type === 'trigger' ? 'Trigger' : type === 'action' ? 'Action' : 'Condition',
      config: {},
    };

    if (steps.length > 0) {
      setSteps((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].nextStepId = newStep.id;
        updated.push(newStep);
        return updated;
      });
    } else {
      setSteps([newStep]);
    }
  };

  const updateStep = (
    stepId: string,
    updates: Partial<WorkflowStep>
  ) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    );
  };

  const deleteStep = (stepId: string) => {
    setSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== stepId);
      // Reconnect workflow
      if (filtered.length > 0) {
        for (let i = 0; i < filtered.length - 1; i++) {
          filtered[i].nextStepId = filtered[i + 1].id;
        }
        filtered[filtered.length - 1].nextStepId = undefined;
      }
      return filtered;
    });
  };

  const save = () => {
    if (!name) {
      toast.error('Workflow needs a name');
      return;
    }

    const workflow: Workflow = {
      id: `wf_${Date.now()}`,
      name,
      steps,
      active: true,
      createdAt: new Date().toISOString(),
    };

    onSave?.(workflow);
    toast.success(`Workflow "${name}" saved`);
  };

  return (
    <div className="bg-slate-900/50 rounded-lg p-6 border border-white/10">
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-400 uppercase">
          Workflow Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Auto-email new leads"
          className="w-full mt-2 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="space-y-3 mb-6">
        {steps.map((step, idx) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-800/50 border border-slate-700 rounded p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400">
                Step {idx + 1} • {step.type.toUpperCase()}
              </span>
              <button
                onClick={() => deleteStep(step.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              value={step.name}
              onChange={(e) => updateStep(step.id, { name: e.target.value })}
              placeholder="Step name"
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white placeholder-slate-500 mb-3 focus:outline-none"
            />

            {step.type === 'action' && (
              <select
                value={step.config.actionType || ''}
                onChange={(e) =>
                  updateStep(step.id, {
                    config: { ...step.config, actionType: e.target.value },
                  })
                }
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white mb-2 focus:outline-none"
              >
                <option value="">Select action type</option>
                {ACTION_TYPES.map((a) => (
                  <option key={a.type} value={a.type}>
                    {a.label}
                  </option>
                ))}
              </select>
            )}

            {step.type === 'condition' && (
              <div className="space-y-2">
                <select
                  value={step.config.field || ''}
                  onChange={(e) =>
                    updateStep(step.id, {
                      config: { ...step.config, field: e.target.value },
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
                >
                  <option value="">Select field</option>
                  {CONDITION_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Value to check"
                  value={step.config.value || ''}
                  onChange={(e) =>
                    updateStep(step.id, {
                      config: { ...step.config, value: e.target.value },
                    })
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => addStep('trigger')}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/40 rounded text-xs font-bold text-blue-400 hover:bg-blue-600/30 transition"
        >
          <Plus className="h-4 w-4" />
          Trigger
        </button>
        <button
          onClick={() => addStep('condition')}
          className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 border border-amber-500/40 rounded text-xs font-bold text-amber-400 hover:bg-amber-600/30 transition"
        >
          <Plus className="h-4 w-4" />
          Condition
        </button>
        <button
          onClick={() => addStep('action')}
          className="flex items-center gap-2 px-3 py-2 bg-green-600/20 border border-green-500/40 rounded text-xs font-bold text-green-400 hover:bg-green-600/30 transition"
        >
          <Plus className="h-4 w-4" />
          Action
        </button>
        <button
          onClick={save}
          className="ml-auto flex items-center gap-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-xs font-bold text-white hover:bg-slate-600 transition"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  );
};
