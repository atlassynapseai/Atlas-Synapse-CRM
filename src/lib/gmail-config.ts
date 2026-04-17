// Gmail OAuth Configuration
const gmailClientId = process.env.GMAIL_CLIENT_ID;
const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;

if (!gmailClientId || !gmailClientSecret) {
  console.warn('[Gmail] Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in environment variables');
}

export const GMAIL_CONFIG = {
  clientId: gmailClientId,
  clientSecret: gmailClientSecret,
  redirectUri: {
    production: 'https://atlassynapseai.com/api/gmail-oauth-callback',
    development: 'http://localhost:5000/api/gmail-oauth-callback'
  },
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly', // Read-only access to Gmail
    'https://www.googleapis.com/auth/gmail.modify'    // Modify labels
  ],
  apiBase: 'https://gmail.googleapis.com/gmail/v1'
};

export function getRedirectUri(isDevelopment: boolean = false): string {
  return isDevelopment ? GMAIL_CONFIG.redirectUri.development : GMAIL_CONFIG.redirectUri.production;
}

export function buildGoogleAuthUrl(state: string, isDevelopment: boolean = false): string {
  const params = new URLSearchParams({
    client_id: gmailClientId || '',
    redirect_uri: getRedirectUri(isDevelopment),
    response_type: 'code',
    scope: GMAIL_CONFIG.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
