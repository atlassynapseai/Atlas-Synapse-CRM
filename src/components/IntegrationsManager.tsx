import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Slack, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_INTEGRATIONS = [
  { id: 'slack', name: 'Slack', icon: '💬', field: 'webhook_url' },
  { id: 'stripe', name: 'Stripe', icon: '💳', field: 'api_key' },
  { id: 'google_calendar', name: 'Google Calendar', icon: '📅', field: 'access_token' },
  { id: 'zapier', name: 'Zapier', icon: '⚡', field: 'webhook_url' },
];

export const IntegrationsManager: React.FC = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const saveIntegration = async (provider: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          credentials: credentials[provider] || {},
          enabled: true,
        }),
      });

      if (response.ok) {
        toast.success(`${provider} connected`);
        setEditingId(null);
        loadIntegrations();
      }
    } catch (error) {
      toast.error('Failed to save integration');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const existing = integrations.find((i) => i.provider === integration.id);
          const isEditing = editingId === integration.id;

          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-4 border rounded-lg transition-all ${existing?.enabled
                  ? 'border-green-500/30'
                  : 'border-white/10'
                }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      {integration.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {existing?.enabled ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-400" />
                          Connected
                        </span>
                      ) : (
                        <span>Not connected</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder={`Enter ${integration.field}`}
                    value={credentials[integration.id] || ''}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        [integration.id]: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={() => saveIntegration(integration.id)}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded transition"
                  >
                    {loading ? 'Saving...' : 'Connect'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingId(integration.id)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded transition"
                >
                  {existing?.enabled ? 'Reconnect' : 'Connect'}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
