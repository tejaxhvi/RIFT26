import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL ='https://ekiedurclpnzdhwftmod.supabase.co';
export const SUPABASE_ANON_KEY ='sb_publishable_X3xgwcuMRvY9QR6eF0iHbw_rn31-dE2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});