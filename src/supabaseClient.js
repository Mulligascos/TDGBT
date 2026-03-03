import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rcgpaibyuelfuchsjhaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZ3BhaWJ5dWVsZnVjaHNqaGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDg5NjgsImV4cCI6MjA4NzYyNDk2OH0.5OdR56E0b89reHOnptq3hN_tR45gstqDsKNP1H7ieDo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
