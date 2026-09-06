import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://hybdhniidiafqltsaxov.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5YmRobmlpZGlhZnFsdHNheG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzE2NzQsImV4cCI6MjEwNDEwNzY3NH0.jATvrRgEb7UjRlBsyhzCYzKtnIIN5aS2_cz_ZbMoXsA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

