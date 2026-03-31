import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isNewLogin: boolean;
  clearNewLoginFlag: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => {
    // Check if we have a recorded session to avoid initial flicker
    // This makes the UI feel "static" and avoids the loading screen on focus/restore
    return !sessionStorage.getItem('last_processed_session_token');
  });
  const [isNewLogin, setIsNewLogin] = useState(() => {
    return sessionStorage.getItem('is_new_login') === 'true';
  });
  const loginRecordedRef = useRef<string | null>(null);

  const recordLogin = async (userId: string, provider: string = 'email') => {
    // Prevent duplicate login records in same session
    if (loginRecordedRef.current === userId) return;
    loginRecordedRef.current = userId;

    try {
      await supabase.from('login_history').insert({
        user_id: userId,
        provider,
        user_agent: navigator.userAgent,
      } as any);
    } catch (error) {
      console.error('Error recording login:', error);
    }
  };

  const clearNewLoginFlag = () => {
    setIsNewLogin(false);
    sessionStorage.setItem('is_new_login', 'false');
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Record login and set new login flag on SIGNED_IN event
        if (event === 'SIGNED_IN' && session?.user) {
          const provider = session.user.app_metadata?.provider || 'email';
          recordLogin(session.user.id, provider);

          // Only set isNewLogin if this specific session hasn't been processed yet
          // This prevents redirection on page refresh
          const lastSessionToken = sessionStorage.getItem('last_processed_session_token');
          if (lastSessionToken !== session.access_token) {
            setIsNewLogin(true);
            sessionStorage.setItem('is_new_login', 'true');
            sessionStorage.setItem('last_processed_session_token', session.access_token);
          }
        }

        // Reset ref on sign out
        if (event === 'SIGNED_OUT') {
          loginRecordedRef.current = null;
          setIsNewLogin(false);
          sessionStorage.removeItem('is_new_login');
          sessionStorage.removeItem('last_processed_session_token');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        sessionStorage.setItem('last_processed_session_token', session.access_token);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Clear local state immediately to avoid redirect/race conditions
      setUser(null);
      setSession(null);
      sessionStorage.removeItem('is_new_login');
      sessionStorage.removeItem('last_processed_session_token');
      loginRecordedRef.current = null;
      
      // Perform Supabase signout - global: true ensures all sessions are cleared
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: reload the whole window to ensure clean state if errors occur
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, isNewLogin, clearNewLoginFlag }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
