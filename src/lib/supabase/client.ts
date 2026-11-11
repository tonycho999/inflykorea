import { createBrowserClient } from '@supabase/ssr';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

export function createClient() {
  if (!isSupabaseReady) throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
