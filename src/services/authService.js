import { supabase } from '@/lib/supabaseClient';

export const authService = {
  getSession: () => supabase.auth.getSession(),
  signOut: () => supabase.auth.signOut(),
};
