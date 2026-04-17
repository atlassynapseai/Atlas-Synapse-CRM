-- Create gmail_credentials table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS gmail_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast email lookup
CREATE INDEX IF NOT EXISTS gmail_credentials_email ON gmail_credentials(email);

-- Create gmail_processed_messages table to prevent duplicate processing
CREATE TABLE IF NOT EXISTS gmail_processed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT UNIQUE NOT NULL,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  email_message_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  reply_content TEXT,
  reply_from TEXT,
  reply_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS gmail_processed_lead_id ON gmail_processed_messages(lead_id);
CREATE INDEX IF NOT EXISTS gmail_processed_email_message_id ON gmail_processed_messages(email_message_id);
CREATE INDEX IF NOT EXISTS gmail_processed_processed_at ON gmail_processed_messages(processed_at DESC);

-- Enable RLS
ALTER TABLE gmail_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_processed_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service role
CREATE POLICY "Enable all access for service role" ON gmail_credentials
  USING (true)
  WITH CHECK (true)
  FOR ALL
  TO service_role;

CREATE POLICY "Enable all access for service role" ON gmail_processed_messages
  USING (true)
  WITH CHECK (true)
  FOR ALL
  TO service_role;
