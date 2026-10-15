import { createClient } from '@supabase/supabase-js';

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xxqnlmlmkamjkwebukkk.supabase.co';
const chave =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_MCHVdTTAatL13kMv8LItBw_AaW99PH_';

// PKCE: o login volta com um código de uso único (?code=), e não com o token na URL
export const supabase = createClient(url, chave, {
  auth: { flowType: 'pkce' },
});
