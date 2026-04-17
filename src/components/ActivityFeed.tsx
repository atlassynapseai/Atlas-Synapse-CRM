import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Clock } from 'lucide-react';

interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: Record<string, any>;
}

export const ActivityFeed: React.FC<{ leadId: string }> = ({ leadId }) => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    loadActivities();
  }, [leadId]);

  const loadActivities = async () => {
    try {
      const response = await fetch(`/api/activity?leadId=${leadId}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm text-white flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Activity Timeline
      </h3>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-xs text-slate-500">No activities yet</p>
        ) : (
          activities.map((activity, idx) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
            >
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">
                  {activity.action}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  by {activity.actor}
                </p>
                <p className="text-[10px] text-slate-600 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
