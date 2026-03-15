import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

function parseUA(ua: string): { browser: string; os: string } {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  return { browser, os };
}
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.user) {
      const currentUA = navigator.userAgent;
      
      // Log sign-in activity
      await supabase.from('account_activity').insert({
        user_id: data.user.id,
        event_type: 'sign_in',
        description: 'Signed in to account',
        user_agent: currentUA,
      });

      // Check if this is a new device by comparing user agents
      const { data: previousSessions } = await supabase
        .from('account_activity')
        .select('user_agent')
        .eq('user_id', data.user.id)
        .eq('event_type', 'sign_in')
        .order('created_at', { ascending: false })
        .limit(50);

      const knownAgents = new Set(
        (previousSessions || [])
          .filter(s => s.user_agent && s.user_agent !== currentUA)
          .map(s => s.user_agent)
      );

      // If there are previous sign-ins but none with this user agent, it's a new device
      const isNewDevice = previousSessions && previousSessions.length > 1 && 
        !knownAgents.has(currentUA) === false ? false :
        previousSessions && previousSessions.length > 1 && 
        ![...knownAgents].some(agent => agent === currentUA);

      // Actually simplify: check if current UA appeared before (excluding the one we just inserted)
      const previousWithSameUA = (previousSessions || []).filter(
        s => s.user_agent === currentUA
      );
      // We just inserted one, so if count is 1, this is the first time
      const isFirstTimeDevice = previousSessions && previousSessions.length > 1 && previousWithSameUA.length <= 1;

      // Upsert trusted device record
      const { browser, os } = parseUA(currentUA);
      await supabase.from('trusted_devices').upsert(
        {
          user_id: data.user.id,
          user_agent: currentUA,
          device_name: `${browser} on ${os}`,
          last_seen_at: new Date().toISOString(),
          is_trusted: !isFirstTimeDevice,
        },
        { onConflict: 'user_id,user_agent' }
      );

      if (isFirstTimeDevice) {
        // Fetch user profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.user.id)
          .single();

        // Send alert (fire and forget)
        supabase.functions.invoke('send-suspicious-activity-alert', {
          body: {
            userEmail: data.user.email,
            userName: profile?.full_name || data.user.email,
            eventType: 'new_device',
            userAgent: currentUA,
            timestamp: new Date().toISOString(),
          },
        }).catch(err => console.error('Failed to send security alert:', err));

        // Log the new device event
        await supabase.from('account_activity').insert({
          user_id: data.user.id,
          event_type: 'new_device',
          description: 'Sign-in from a new device detected',
          user_agent: currentUA,
        });
      }
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
