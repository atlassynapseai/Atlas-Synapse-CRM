import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, BarChart3, MapPin, Download } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Lead {
  id: string;
  name: string;
  stage: string;
  value: number;
  source?: string;
  created_at: string;
}

export const AdvancedAnalyticsDashboard: React.FC<{ leads: Lead[] }> = ({ leads }) => {
  if (!leads || leads.length === 0) {
    return <div className="text-center text-slate-400 py-8">No leads data</div>;
  }

  // Calculate metrics
  const wonDeals = leads.filter((l) => l.stage === 'Won');
  const lostDeals = leads.filter((l) => l.stage === 'Lost');
  const activeDealValues = leads
    .filter((l) => l.stage !== 'Lost' && l.stage !== 'Won')
    .map((l) => l.value || 0);

  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const wonValue = wonDeals.reduce((sum, l) => sum + (l.value || 0), 0);
  const avgDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;
  const closingRate = leads.length > 0 ? (wonDeals.length / leads.length) * 100 : 0;
  const churnRate = leads.length > 0 ? (lostDeals.length / leads.length) * 100 : 0;

  // Territory breakdown by source
  const territoryMap: Record<string, any> = {};
  leads.forEach((lead) => {
    const source = lead.source || 'other';
    if (!territoryMap[source]) {
      territoryMap[source] = {
        name: source.replace(/_/g, ' '),
        deals: 0,
        value: 0,
        closedDeals: 0,
      };
    }
    territoryMap[source].deals += 1;
    territoryMap[source].value += lead.value || 0;
    if (lead.stage === 'Won') {
      territoryMap[source].closedDeals += 1;
    }
  });

  const territories = Object.values(territoryMap)
    .map((t: any) => ({
      ...t,
      closeRate: ((t.closedDeals / t.deals) * 100).toFixed(1),
    }))
    .sort((a: any, b: any) => b.value - a.value);

  // Monthly activity data
  const monthlyData = [];
  const thisMonth = new Date();

  for (let i = 2; i >= 0; i--) {
    const date = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });

    const monthLeads = leads.filter((l) => {
      const leadDate = new Date(l.created_at);
      return leadDate.getMonth() === date.getMonth() && leadDate.getFullYear() === date.getFullYear();
    });

    monthlyData.push({
      month: monthName,
      leads: monthLeads.length,
      closed: monthLeads.filter((l) => l.stage === 'Won').length,
      value: monthLeads.reduce((sum, l) => sum + (l.value || 0), 0),
    });
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-lg border border-emerald-500/20"
        >
          <p className="text-xs text-emerald-400 font-bold uppercase">
            Pipeline Value
          </p>
          <p className="text-2xl font-bold text-white mt-2">
            ${(totalValue / 1000).toFixed(0)}K
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 rounded-lg border border-blue-500/20"
        >
          <p className="text-xs text-blue-400 font-bold uppercase">
            Avg Deal Size
          </p>
          <p className="text-2xl font-bold text-white mt-2">
            ${Math.round(avgDealSize / 1000)}K
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 rounded-lg border border-green-500/20"
        >
          <p className="text-xs text-green-400 font-bold uppercase">
            Closing Rate
          </p>
          <p className="text-2xl font-bold text-white mt-2">
            {closingRate.toFixed(1)}%
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 rounded-lg border border-orange-500/20"
        >
          <p className="text-xs text-orange-400 font-bold uppercase">
            Churn Rate
          </p>
          <p className="text-2xl font-bold text-white mt-2">
            {churnRate.toFixed(1)}%
          </p>
        </motion.div>
      </div>

      {/* Territory Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-lg border border-white/10"
      >
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-purple-400" />
          Territory Performance
        </h3>
        <div className="space-y-2">
          {territories.map((t: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white capitalize">{t.name}</p>
                <p className="text-xs text-slate-400">{t.deals} deals</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-400">${(t.value / 1000).toFixed(0)}K</p>
                <p className="text-xs text-slate-400">{t.closeRate}% close</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Monthly Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 rounded-lg border border-white/10"
      >
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          Monthly Activity
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
            />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
