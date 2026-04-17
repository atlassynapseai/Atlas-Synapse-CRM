import React, { useState, useEffect } from 'react';
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

export const AdvancedAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center text-slate-400">No analytics data</div>;
  }

  const { metrics, territories, forecasts } = analytics;

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
            ${(metrics.totalValue / 1000).toFixed(0)}K
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
            ${Math.round(metrics.avgDealSize / 1000)}K
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
            {metrics.closingRate.toFixed(1)}%
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 rounded-lg border border-orange-500/20"
        >
          <p className="text-xs text-orange-400 font-bold uppercase">
            Sales Cycle
          </p>
          <p className="text-2xl font-bold text-white mt-2">
            {metrics.salesCycle} days
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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={territories}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Revenue Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 rounded-lg border border-white/10"
      >
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          Revenue Forecast
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecasts}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="period" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="predicted_revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};
