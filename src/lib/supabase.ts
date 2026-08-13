import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hlpkedejkgrxcicwbmwh.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscGtlZGVqa2dyeGNpY3dibXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MjAxMTIsImV4cCI6MjA5OTE5NjExMn0.U_PizWvr-U34vjozAQRU3UdfQWbYeb-l2swseAy3_Ac';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
  },
});

if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}