import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSecret = process.env.ADMIN_SECRET;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin secret
  const secret = req.query.secret || req.body.secret;
  if (!secret || secret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { email, access_token, refresh_token } = req.body;

    if (!email || !access_token || !refresh_token) {
      return res.status(400).json({
        error: 'Missing required fields: email, access_token, refresh_token'
      });
    }

    // Store credentials in database
    const { error: dbError, data } = await supabase
      .from('gmail_credentials')
      .upsert(
        {
          email,
          access_token,
          refresh_token,
          token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          sync_status: 'idle',
          last_sync: new Date().toISOString()
        },
        { onConflict: 'email' }
      )
      .select();

    if (dbError) {
      console.error('[Admin Setup] Database error:', dbError);
      return res.status(500).json({ error: 'Failed to store credentials', details: dbError });
    }

    console.log(`[Admin Setup] Successfully authorized ${email}`);
    return res.status(200).json({
      success: true,
      message: `Gmail account ${email} authorized`,
      data
    });
  } catch (error) {
    console.error('[Admin Setup Error]', error);
    return res.status(500).json({ error: 'Setup failed', details: String(error) });
  }
}
