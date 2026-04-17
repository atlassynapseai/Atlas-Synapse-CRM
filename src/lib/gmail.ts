import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    mimeType: string;
    body?: { data: string };
    parts?: Array<any>;
  };
}

interface GmailHeader {
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
}

// Refresh access token if expired
async function refreshAccessToken(email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('gmail_credentials')
    .select('access_token, refresh_token, token_expiry')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.error('[Gmail] Failed to fetch credentials:', error);
    return null;
  }

  const now = new Date();
  const expiry = new Date(data.token_expiry);

  // If token expires in less than 5 minutes, refresh it
  if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
    if (!data.refresh_token) {
      console.error('[Gmail] No refresh token available');
      return null;
    }

    try {
      const clientId = process.env.GMAIL_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET;

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId || '',
          client_secret: clientSecret || '',
          refresh_token: data.refresh_token,
          grant_type: 'refresh_token'
        }).toString()
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const newToken = await response.json();

      // Update token in database
      await supabase
        .from('gmail_credentials')
        .update({
          access_token: newToken.access_token,
          token_expiry: new Date(Date.now() + newToken.expires_in * 1000).toISOString()
        })
        .eq('email', email);

      console.log('[Gmail] Refreshed access token for:', email);
      return newToken.access_token;
    } catch (error) {
      console.error('[Gmail] Token refresh failed:', error);
      return null;
    }
  }

  return data.access_token;
}

// Get Gmail message by ID
export async function getGmailMessage(email: string, messageId: string): Promise<GmailMessage | null> {
  const accessToken = await refreshAccessToken(email);
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Gmail] Failed to fetch message:', error);
    return null;
  }
}

// Search Gmail messages
export async function searchGmailMessages(email: string, query: string, maxResults: number = 10): Promise<string[]> {
  const accessToken = await refreshAccessToken(email);
  if (!accessToken) return [];

  try {
    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    return data.messages?.map((m: any) => m.id) || [];
  } catch (error) {
    console.error('[Gmail] Failed to search messages:', error);
    return [];
  }
}

// Extract headers from Gmail message
export function extractHeaders(message: GmailMessage): GmailHeader {
  const headers: GmailHeader = {};
  const headersList = message.payload?.headers || [];

  for (const header of headersList) {
    switch (header.name.toLowerCase()) {
      case 'from':
        headers.from = header.value;
        break;
      case 'to':
        headers.to = header.value;
        break;
      case 'subject':
        headers.subject = header.value;
        break;
      case 'date':
        headers.date = header.value;
        break;
      case 'message-id':
        headers.messageId = header.value;
        break;
      case 'in-reply-to':
        headers.inReplyTo = header.value;
        break;
      case 'references':
        headers.references = header.value;
        break;
    }
  }

  return headers;
}

// Extract text body from Gmail message
export function extractBodyText(message: GmailMessage): string {
  try {
    const payload = message.payload;
    if (!payload) return '';

    // If message has body directly
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // If message has parts (multipart)
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
      // Fallback to first part if no plain text found
      if (payload.parts[0]?.body?.data) {
        return Buffer.from(payload.parts[0].body.data, 'base64').toString('utf-8');
      }
    }

    return '';
  } catch (error) {
    console.error('[Gmail] Failed to extract body:', error);
    return '';
  }
}

// Get Gmail credentials for an email
export async function getGmailCredentials(email: string) {
  const { data, error } = await supabase
    .from('gmail_credentials')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('[Gmail] Failed to fetch credentials:', error);
    return null;
  }

  return data;
}

// Update last sync time
export async function updateLastSync(email: string, status: 'idle' | 'syncing' | 'error' = 'idle', errorMessage?: string) {
  const { error } = await supabase
    .from('gmail_credentials')
    .update({
      last_sync: new Date().toISOString(),
      sync_status: status,
      error_message: errorMessage || null
    })
    .eq('email', email);

  if (error) {
    console.error('[Gmail] Failed to update last sync:', error);
  }
}
