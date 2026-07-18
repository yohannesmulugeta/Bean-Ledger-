// @ts-nocheck
import { createClient } from '@supabase/supabase-js';

const viteEnv = import.meta.env || {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL;
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY;

export function readSupabaseJwtRole(value) {
  try {
    const payload = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))).role;
  } catch {
    return null;
  }
}

const supabaseKeyRole = typeof supabaseAnonKey === 'string' ? readSupabaseJwtRole(supabaseAnonKey) : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const frontendEnvValidation = {
  hasSupabaseUrl: Boolean(supabaseUrl),
  hasSupabaseAnonKey: Boolean(supabaseAnonKey),
  hasServiceRoleLikeKey: supabaseKeyRole === 'service_role' || (typeof supabaseAnonKey === 'string' && /service[_-]?role/i.test(supabaseAnonKey)),
  messages: [],
};

if (!frontendEnvValidation.hasSupabaseUrl || !frontendEnvValidation.hasSupabaseAnonKey) {
  frontendEnvValidation.messages.push('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. The demo will use local synthetic fallback data.');
}

if (frontendEnvValidation.hasServiceRoleLikeKey) {
  frontendEnvValidation.messages.push('Do not place Supabase service-role credentials in frontend VITE_ variables.');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Missing Supabase demo environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for live demo Supabase mode. Never use the service-role key in frontend code.');
  }
  return supabase;
}
