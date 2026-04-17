-- Extend email_messages table with Gmail-specific fields
ALTER TABLE email_messages
ADD COLUMN IF NOT EXISTS gmail_message_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT,
ADD COLUMN IF NOT EXISTS reply_message_id TEXT;

-- Create indexes for Gmail lookups
CREATE INDEX IF NOT EXISTS email_messages_gmail_message_id ON email_messages(gmail_message_id);
CREATE INDEX IF NOT EXISTS email_messages_gmail_thread_id ON email_messages(gmail_thread_id);
CREATE INDEX IF NOT EXISTS email_messages_reply_message_id ON email_messages(reply_message_id);
