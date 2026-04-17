import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { motion } from 'motion/react';
import { Lock, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import CRMDashboard from './components/CRMDashboard';
import Auth from './components/Auth';

// Allowed emails for CRM access
const ALLOWED_EMAILS = [
  'steve.george@atlassynapseai.com',
  'gloriabarsoum@atlassynapseai.com',
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        setIsAuthorized(ALLOWED_EMAILS.includes(session.user.email));
      }
      setLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        setIsAuthorized(ALLOWED_EMAILS.includes(session.user.email));
      } else {
        setIsAuthorized(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-atlas-bg">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-atlas-primary/20 rounded-full" />
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return <Auth />;
  }

  // Authenticated but not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-atlas-bg to-atlas-card p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8 border border-white/[0.06] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-6">
              <Lock className="h-8 w-8 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-400 mb-6">
              Your account ({session.user?.email}) does not have access to the CRM.
            </p>
            <p className="text-xs text-slate-500 mb-8">
              Only authorized team members can access this application.
            </p>

            <motion.button
              onClick={handleSignOut}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full gradient-btn py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Authorized - show dashboard
  return <CRMDashboard />;
}

export default App;

