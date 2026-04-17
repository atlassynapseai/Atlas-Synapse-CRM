import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Map event types from Brevo
interface BrevoEvent {
  event: 'sent' | 'open' | 'click' | 'bounce' | 'replied' | 'complaint';
  email: string;
  subject?: string;
  message_id?: string;
  timestamp?: number;
  reply?: {
    email: string;
    text: string;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const events: BrevoEvent[] = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      console.log(`[Brevo Webhook] Event: ${event.event}, Email: ${event.email}`);

      // Find lead by email
      const { data: leads, error: leadError } = await supabase
        .from('leads')
        .select('id, name, email')
        .eq('email', event.email)
        .limit(1);

      if (leadError || !leads || leads.length === 0) {
        console.warn(`[Brevo Webhook] No lead found for email: ${event.email}`);
        continue;
      }

      const lead = leads[0];

      // Handle different event types
      switch (event.event) {
        case 'sent':
          console.log(`[Brevo Webhook] Email sent to ${lead.name}`);
          break;

        case 'open':
          // Update email_messages table if it exists
          const { error: openError } = await supabase
            .from('email_messages')
            .update({ email_status: 'opened', opened_at: new Date().toISOString() })
            .eq('lead_id', lead.id)
            .eq('email_status', 'sent');

          if (!openError) {
            console.log(`[Brevo Webhook] Email opened for ${lead.name}`);
          }
          break;

        case 'replied':
          // Create notification for reply
          if (event.reply) {
            // Update email_messages table
            const { error: replyError } = await supabase
              .from('email_messages')
              .update({
                email_status: 'replied',
                reply_content: event.reply.text,
                reply_at: new Date().toISOString(),
                has_reply: true
              })
              .eq('lead_id', lead.id)
              .eq('email_status', 'sent')
              .order('sent_at', { ascending: false })
              .limit(1);

            if (!replyError) {
              // Create notification
              await supabase
                .from('notifications')
                .insert({
                  lead_id: lead.id,
                  type: 'email_reply',
                  read: false,
                  created_at: new Date().toISOString(),
                  data: {
                    lead_name: lead.name,
                    lead_email: lead.email,
                    reply_preview: event.reply.text.substring(0, 100),
                    reply_full: event.reply.text
                  }
                });

              console.log(`[Brevo Webhook] Email reply received from ${lead.name}`);
            }
          }
          break;

        case 'bounce':
          // Mark email as bounced
          await supabase
            .from('email_messages')
            .update({ email_status: 'bounced' })
            .eq('lead_id', lead.id)
            .eq('email_status', 'sent');

          console.log(`[Brevo Webhook] Email bounced for ${lead.name}`);
          break;

        case 'complaint':
          // Mark email as complaint
          await supabase
            .from('email_messages')
            .update({ email_status: 'complaint' })
            .eq('lead_id', lead.id);

          console.log(`[Brevo Webhook] Complaint for ${lead.name}`);
          break;
      }
    }

    return res.status(200).json({ success: true, processed: events.length });
  } catch (error) {
    console.error('[Brevo Webhook Error]', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
