import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = (serviceKey && !serviceKey.includes('your_')) ? serviceKey : (process.env.SUPABASE_ANON_KEY || '');

if (!supabaseUrl) {
  console.warn('⚠️ SUPABASE_URL is missing in Backend/.env!');
}

// Service Role Client bypasses RLS for administrative operations (Creating users, managing shops)
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
