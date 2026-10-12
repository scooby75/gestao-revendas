import { createClient } from '@supabase/supabase-js';

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xxqnlmlmkamjkwebukkk.supabase.co';
const chave =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_MCHVdTTAatL13kMv8LItBw_AaW99PH_';

export const supabase = createClient(url, chave);
