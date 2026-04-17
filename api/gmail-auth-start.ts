import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildGoogleAuthUrl } from '../src/lib/gmail-config';
import { randomBytes } from 'crypto';

const stateTokens = new Map<string, { createdAt: number }>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Generate CSRF state token
    const state = randomBytes(32).toString('hex');
    stateTokens.set(state, { createdAt: Date.now() });

    // Clean up old tokens (older than 10 minutes)
    for (const [key, value] of stateTokens.entries()) {
      if (Date.now() - value.createdAt > 10 * 60 * 1000) {
        stateTokens.delete(key);
      }
    }

    const isDevelopment = req.headers.host?.includes('localhost');
    const authUrl = buildGoogleAuthUrl(state, isDevelopment);

    console.log('[Gmail OAuth] Starting authentication flow', {
      state: state.substring(0, 8) + '...',
      isDevelopment,
      redirectTo: authUrl.substring(0, 50) + '...'
    });

    // Redirect to Google OAuth consent screen
    return res.redirect(authUrl);
  } catch (error) {
    console.error('[Gmail OAuth Error]', error);
    return res.status(500).json({ error: 'Failed to initiate Gmail authentication' });
  }
}
