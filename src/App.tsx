import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import CRMDashboard from './components/CRMDashboard';
import Login from './components/Login';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-atlas-bg">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-atlas-primary/20 rounded-full" />
        </div>
      </div>
    );
  }

  return session ? <CRMDashboard /> : <Login />;
}

export default App;

