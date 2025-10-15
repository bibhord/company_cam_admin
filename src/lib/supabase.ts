import { createClient } from '@supabase/supabase-js';

// Ensure these environment variables are correctly set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and API key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);