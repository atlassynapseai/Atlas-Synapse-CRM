import { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess?: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message || 'Authentication failed');
      setLoading(false);
    }
    // Note: App component will detect session change via onAuthStateChange
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-atlas-bg to-atlas-card p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 border border-white/[0.06]">
          {/* Header */}
          <div className="mb-8">
            <div className="h-12 w-12 bg-gradient-to-br from-atlas-primary to-atlas-secondary rounded-xl flex items-center justify-center mb-4">
              <LogIn className="text-white h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Atlas Synapse</h1>
            <p className="text-slate-400 text-sm">Forensic Growth Engine · CGO Console</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="gloria@atlassynapseai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-atlas-bg border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors font-mono placeholder-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-atlas-bg border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-atlas-primary transition-colors font-mono placeholder-slate-600"
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full gradient-btn py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500 text-center">
              Protected login · Supabase Auth
            </p>
          </div>
        </div>

        {/* Background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-atlas-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-atlas-secondary/5 rounded-full blur-3xl" />
        </div>
      </motion.div>
    </div>
  );
}
