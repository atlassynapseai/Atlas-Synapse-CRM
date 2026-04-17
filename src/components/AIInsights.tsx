import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Zap, TrendingUp, AlertTriangle, Brain } from 'lucide-react';
import { toast } from 'sonner';

interface AIInsight {
  leadId: string;
  score: number;
  reasoning: string;
  factors: string[];
  actions?: string[];
  churnRisk?: number;
  dealProbability?: number;
}

export const AIInsights: React.FC<{ leads: any[] }> = ({ leads }) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [churnData, setChurnData] = useState<any[]>([]);
  const [dealData, setDealData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (leads.length === 0) return;
    loadInsights();
  }, [leads.length]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const [churnRes, dealRes] = await Promise.all([
        fetch('/api/predict-churn'),
        fetch('/api/deal-probability'),
      ]);

      if (churnRes.ok) {
        const churnJson = await churnRes.json();
        setChurnData(churnJson.predictions || []);
      }

      if (dealRes.ok) {
        const dealJson = await dealRes.json();
        setDealData(dealJson.deals || []);
      }
    } catch (error) {
      console.error('Error loading AI insights:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  const highRiskLeads = churnData.slice(0, 3);
  const hotDeals = dealData.slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Churn Risk */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 border border-red-500/20 hover:border-red-500/40 transition-all rounded-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h3 className="font-bold text-sm text-red-400">At-Risk Leads</h3>
        </div>
        <div className="space-y-2">
          {highRiskLeads.length > 0 ? (
            highRiskLeads.map((risk: any) => (
              <div
                key={risk.leadId}
                className="text-xs bg-red-500/5 rounded p-2 border border-red-500/10"
              >
                <div className="font-semibold text-red-300">Risk: {risk.riskScore}%</div>
                <div className="text-red-200/70 text-[10px] mt-1">
                  {risk.signals?.[0] || 'Inactive lead'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400">No high-risk leads</div>
          )}
        </div>
      </motion.div>

      {/* Hot Deals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 border border-green-500/20 hover:border-green-500/40 transition-all rounded-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-green-400" />
          <h3 className="font-bold text-sm text-green-400">Hot Deals</h3>
        </div>
        <div className="space-y-2">
          {hotDeals.length > 0 ? (
            hotDeals.map((deal: any) => (
              <div
                key={deal.leadId}
                className="text-xs bg-green-500/5 rounded p-2 border border-green-500/10"
              >
                <div className="font-semibold text-green-300">
                  Win: {deal.winProbability}%
                </div>
                <div className="text-green-200/70 text-[10px] mt-1">
                  {deal.indicators?.[0] || 'Qualified lead'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400">No qualified deals</div>
          )}
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 border border-blue-500/20 hover:border-blue-500/40 transition-all rounded-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-blue-400" />
          <h3 className="font-bold text-sm text-blue-400">AI Intelligence</h3>
        </div>
        <div className="space-y-2 text-xs">
          <div className="text-slate-300">
            📊 {leads.length} total leads analyzed
          </div>
          <div className="text-slate-300">
            ⚡ {churnData.filter((c: any) => c.riskScore > 70).length} high-risk
          </div>
          <div className="text-slate-300">
            🎯 {dealData.filter((d: any) => d.winProbability > 70).length} hot opportunities
          </div>
        </div>
      </motion.div>
    </div>
  );
};
