import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function assertConfigured(value: string, name: string) {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
}

export function createClient() {
  assertConfigured(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL');
  assertConfigured(supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function createServiceClient() {
  assertConfigured(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL');
  assertConfigured(supabaseServiceRoleKey, 'SUPABASE_SECRET_KEY');

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
