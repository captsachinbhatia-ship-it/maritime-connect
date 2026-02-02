import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kirwzfxgzzqxtesolhbg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpcnd6ZnhnenpxeHRlc29saGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjc4NjEsImV4cCI6MjA4MzkwMzg2MX0.NaNDW7cMcAYQauN3Jw0bW0ti84dyFHWEUbXKbVTWx-k';

// Exported for debugging utilities (e.g. raw connectivity tests)
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

// Validate configuration
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});
