import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateSupabaseCredentials } from './supabaseEnv';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const envCheck = validateSupabaseCredentials(rawUrl, rawAnonKey);

export const supabaseConfigError: string | null = envCheck.error;

export const supabase: SupabaseClient | null =
  envCheck.url && envCheck.anonKey
    ? createClient(envCheck.url, envCheck.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      supabaseConfigError ??
        'Supabase client is not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}
