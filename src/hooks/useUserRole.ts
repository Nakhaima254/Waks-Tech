import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logError } from '@/lib/errorHandler';

export type AppRole = 'admin' | 'moderator' | 'user';

interface UserRoleState {
  role: AppRole | null;
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useUserRole(): UserRoleState {
  const { user } = useAuth();
  const [state, setState] = useState<UserRoleState>({
    role: null,
    isAdmin: false,
    isModerator: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState({
        role: null,
        isAdmin: false,
        isModerator: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    const fetchRole = async () => {
      try {
        // Use the security definer function to get the user's role
        const { data, error } = await supabase
          .rpc('get_user_role', { _user_id: user.id });

        if (error) throw error;

        const role = data as AppRole | null;
        setState({
          role,
          isAdmin: role === 'admin',
          isModerator: role === 'moderator' || role === 'admin',
          isLoading: false,
          error: null,
        });
      } catch (err) {
        logError('useUserRole', err);
        setState({
          role: null,
          isAdmin: false,
          isModerator: false,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to fetch role'),
        });
      }
    };

    fetchRole();
  }, [user]);

  return state;
}
