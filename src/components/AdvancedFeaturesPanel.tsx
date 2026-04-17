import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, FileText, MapPin, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export const AdvancedFeaturesPanel: React.FC = () => {
  const [tabs, setTabs] = useState<'fields' | 'contracts' | 'territories' | 'docs'>(
    'fields'
  );
  const [loading, setLoading] = useState(false);

  const loadData = async (resource: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/advanced-features?resource=${resource}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Loaded ${resource}:`, data);
      }
    } catch (error) {
      toast.error(`Failed to load ${resource}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTabs('fields')}
          className={`px-3 py-2 rounded text-xs font-bold ${tabs === 'fields'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300'
            }`}
        >
          Custom Fields
        </button>
        <button
          onClick={() => setTabs('contracts')}
          className={`px-3 py-2 rounded text-xs font-bold ${tabs === 'contracts'
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300'
            }`}
        >
          <FileCheck className="h-4 w-4 inline mr-1" />
          Contracts
        </button>
        <button
          onClick={() => setTabs('territories')}
          className={`px-3 py-2 rounded text-xs font-bold ${tabs === 'territories'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-slate-300'
            }`}
        >
          <MapPin className="h-4 w-4 inline mr-1" />
          Territories
        </button>
        <button
          onClick={() => setTabs('docs')}
          className={`px-3 py-2 rounded text-xs font-bold ${tabs === 'docs'
              ? 'bg-orange-600 text-white'
              : 'bg-slate-700 text-slate-300'
            }`}
        >
          <FileText className="h-4 w-4 inline mr-1" />
          Documents
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 rounded-lg p-6 border border-slate-700"
      >
        {tabs === 'fields' && (
          <div>
            <h3 className="font-bold text-white mb-4">Custom Fields</h3>
            <p className="text-sm text-slate-300 mb-4">
              Define custom fields for your leads and deals
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm"
              onClick={() => loadData('fields')}
            >
              <Plus className="h-4 w-4" />
              New Field
            </button>
          </div>
        )}

        {tabs === 'contracts' && (
          <div>
            <h3 className="font-bold text-white mb-4">Contracts</h3>
            <p className="text-sm text-slate-300 mb-4">
              Manage contracts, terms, and renewals
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-sm"
              onClick={() => loadData('contracts')}
            >
              <Plus className="h-4 w-4" />
              New Contract
            </button>
          </div>
        )}

        {tabs === 'territories' && (
          <div>
            <h3 className="font-bold text-white mb-4">Territories</h3>
            <p className="text-sm text-slate-300 mb-4">
              Organize teams by regions and sales territories
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-sm"
              onClick={() => loadData('territories')}
            >
              <Plus className="h-4 w-4" />
              New Territory
            </button>
          </div>
        )}

        {tabs === 'docs' && (
          <div>
            <h3 className="font-bold text-white mb-4">Documents</h3>
            <p className="text-sm text-slate-300 mb-4">
              Store and manage documents associated with deals
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold text-sm"
              onClick={() => loadData('documents')}
            >
              <Plus className="h-4 w-4" />
              Upload Document
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
