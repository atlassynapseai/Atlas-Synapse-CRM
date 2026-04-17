import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GMAIL_CONFIG, getRedirectUri } from '../src/lib/gmail-config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('[Gmail OAuth] User denied access:', error);
      return res.redirect(`/?gmail_auth=denied&error=${error}`);
    }

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Exchange authorization code for tokens
    const isDevelopment = req.headers.host?.includes('localhost');
    const redirectUri = getRedirectUri(isDevelopment);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GMAIL_CONFIG.clientId || '',
        client_secret: GMAIL_CONFIG.clientSecret || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('[Gmail OAuth] Token exchange failed:', error);
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    // Get user info to store email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userInfoResponse.ok) {
      console.error('[Gmail OAuth] Failed to get user info');
      return res.status(400).json({ error: 'Failed to get user information' });
    }

    const userInfo = await userInfoResponse.json();
    const userEmail = userInfo.email;

    console.log('[Gmail OAuth] Exchanged code for tokens', {
      email: userEmail,
      expiresIn: tokenData.expires_in
    });

    // Store credentials in Supabase (encrypted at-rest)
    const { error: dbError } = await supabase.from('gmail_credentials').upsert(
      {
        email: userEmail,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        scopes: tokenData.scope.split(' '),
        last_sync: new Date().toISOString(),
        sync_status: 'idle'
      },
      { onConflict: 'email' }
    );

    if (dbError) {
      console.error('[Gmail OAuth] Failed to store credentials:', dbError);
      return res.status(500).json({ error: 'Failed to store credentials' });
    }

    console.log('[Gmail OAuth] Successfully stored credentials for:', userEmail);

    // Redirect back to CRM with success
    return res.redirect('/?gmail_auth=success&email=' + encodeURIComponent(userEmail));
  } catch (error) {
    console.error('[Gmail OAuth Error]', error);
    return res.status(500).json({ error: 'OAuth callback failed' });
  }
}
