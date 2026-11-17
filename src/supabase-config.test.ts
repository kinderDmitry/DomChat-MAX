import { describe, expect, it } from 'vitest';
import { resolveSupabaseConfig } from './supabase-config';

describe('resolveSupabaseConfig', () => {
  it('uses the project URL and publishable key from the environment', () => {
    expect(resolveSupabaseConfig({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
    })).toEqual({
      url: 'https://example.supabase.co',
      key: 'sb_publishable_example',
    });
  });

  it('supports the legacy anon key for existing deployments', () => {
    expect(resolveSupabaseConfig({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'legacy-anon',
    })?.key).toBe('legacy-anon');
  });

  it('returns null when public credentials are incomplete', () => {
    expect(resolveSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co' })).toBeNull();
    expect(resolveSupabaseConfig({})).toBeNull();
  });
});
