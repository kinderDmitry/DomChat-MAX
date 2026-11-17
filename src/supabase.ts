import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseConfig } from './supabase-config';

const projectConfig = resolveSupabaseConfig({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://cwqsxjgksvxdqzmaxcnv.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_uIhfBlwZHXt7hmQ4veeyfw_HMQJZs0x',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export const supabase = projectConfig
  ? createClient(projectConfig.url, projectConfig.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
