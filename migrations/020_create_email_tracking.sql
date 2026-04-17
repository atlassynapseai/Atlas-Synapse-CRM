-- Create email_messages table for tracking sent/received emails
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('template', 'custom')),
  template_name TEXT,
  subject TEXT NOT NULL,
  body_preview TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_status TEXT NOT NULL DEFAULT 'sent' CHECK (email_status IN ('sent', 'opened', 'replied', 'bounced', 'complaint')),
  opened_at TIMESTAMP WITH TIME ZONE,
  reply_content TEXT,
  reply_at TIMESTAMP WITH TIME ZONE,
  has_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table for tracking alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email_reply', 'stage_change', 'reminder', 'milestone')),
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS email_messages_lead_id ON email_messages(lead_id);
CREATE INDEX IF NOT EXISTS email_messages_status ON email_messages(email_status);
CREATE INDEX IF NOT EXISTS email_messages_created_at ON email_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_lead_id ON notifications(lead_id);
CREATE INDEX IF NOT EXISTS notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at ON notifications(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all access for service role" ON email_messages
  USING (true)
  WITH CHECK (true)
  FOR ALL
  TO service_role;

CREATE POLICY "Enable all access for service role" ON notifications
  USING (true)
  WITH CHECK (true)
  FOR ALL
  TO service_role;
