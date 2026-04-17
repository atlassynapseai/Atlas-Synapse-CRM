import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getGmailMessage,
  searchGmailMessages,
  extractHeaders,
  extractBodyText,
  getGmailCredentials,
  updateLastSync
} from '../src/lib/gmail';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Gmail Poll] Starting email reply check');

    // Get all connected Gmail accounts
    const { data: allEmails, error: fetchError } = await supabase
      .from('gmail_credentials')
      .select('email')
      .order('created_at', { ascending: true });

    if (fetchError || !allEmails || allEmails.length === 0) {
      console.log('[Gmail Poll] No Gmail accounts connected');
      return res.status(200).json({ success: true, accountsChecked: 0, messagesChecked: 0, repliesFound: 0 });
    }

    const emailsToCheck = allEmails.map((e: { email: string }) => e.email);
    console.log('[Gmail Poll] Checking', emailsToCheck.length, 'email(s):', emailsToCheck.join(', '));

    let totalMessagesChecked = 0;
    let totalRepliesFound = 0;

    for (const userEmail of emailsToCheck) {
      try {
        console.log(`[Gmail Poll] Processing: ${userEmail}`);
        await updateLastSync(userEmail, 'syncing');

        // Get Gmail credentials
        const credentials = await getGmailCredentials(userEmail);
        if (!credentials) {
          console.log(`[Gmail Poll] No credentials found for ${userEmail}`);
          await updateLastSync(userEmail, 'error', 'No credentials');
          continue;
        }

        // Search for messages received since last sync
        const lastSync = credentials.last_sync ? new Date(credentials.last_sync) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sinceDate = lastSync.toISOString().split('T')[0];
        const searchQuery = `after:${sinceDate} to:${userEmail} -from:${userEmail}`;

        console.log(`[Gmail Poll] Searching for ${userEmail}:`, searchQuery);
        const messageIds = await searchGmailMessages(userEmail, searchQuery, 50);

        if (messageIds.length === 0) {
          console.log(`[Gmail Poll] No new messages for ${userEmail}`);
          await updateLastSync(userEmail, 'idle');
          continue;
        }

        console.log(`[Gmail Poll] Found ${messageIds.length} potential reply messages for ${userEmail}`);
        totalMessagesChecked += messageIds.length;

        let repliesForEmail = 0;

        for (const messageId of messageIds) {
          try {
            // Check if already processed
            const { data: processed } = await supabase
              .from('gmail_processed_messages')
              .select('id')
              .eq('gmail_message_id', messageId)
              .single();

            if (processed) {
              console.log(`[Gmail Poll] Message already processed: ${messageId.substring(0, 8)}`);
              continue;
            }

            // Get full message
            const message = await getGmailMessage(userEmail, messageId);
            if (!message) continue;

            const headers = extractHeaders(message);
            const bodyText = extractBodyText(message);
            const senderEmail = headers.from?.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0];

            if (!senderEmail) {
              console.log(`[Gmail Poll] Could not extract sender email from: ${headers.from}`);
              continue;
            }

            // Find lead by email
            const { data: leads, error: leadError } = await supabase
              .from('leads')
              .select('id, name, email')
              .eq('email', senderEmail)
              .limit(1);

            if (leadError || !leads || leads.length === 0) {
              console.log(`[Gmail Poll] No lead found for email: ${senderEmail}`);
              continue;
            }

            const lead = leads[0];

            // Find sent email by thread ID (Gmail thread ID matching)
            const { data: sentEmails, error: emailError } = await supabase
              .from('email_messages')
              .select('id')
              .eq('lead_id', lead.id)
              .eq('gmail_thread_id', message.threadId)
              .in('email_status', ['sent', 'opened'])
              .order('sent_at', { ascending: false })
              .limit(1);

            if (emailError || !sentEmails || sentEmails.length === 0) {
              console.log(`[Gmail Poll] No matching sent email found for thread: ${message.threadId}`);
              continue;
            }

            const sentEmail = sentEmails[0];

            // Update email_messages with reply
            const { error: updateError } = await supabase
              .from('email_messages')
              .update({
                email_status: 'replied',
                reply_content: bodyText.substring(0, 500),
                reply_at: new Date(headers.date || Date.now()).toISOString(),
                has_reply: true,
                reply_message_id: messageId
              })
              .eq('id', sentEmail.id);

            if (updateError) {
              console.error('[Gmail Poll] Failed to update email:', updateError);
              continue;
            }

            // Create notification
            const { error: notifError } = await supabase.from('notifications').insert({
              lead_id: lead.id,
              type: 'email_reply',
              read: false,
              data: {
                lead_name: lead.name,
                lead_email: lead.email,
                reply_from: senderEmail,
                reply_preview: bodyText.substring(0, 100),
                reply_full: bodyText,
                received_by: userEmail
              }
            });

            if (notifError) {
              console.error('[Gmail Poll] Failed to create notification:', notifError);
            }

            // Mark as processed
            await supabase.from('gmail_processed_messages').insert({
              gmail_message_id: messageId,
              lead_id: lead.id,
              email_message_id: sentEmail.id,
              reply_content: bodyText,
              reply_from: senderEmail,
              reply_at: new Date(headers.date || Date.now()).toISOString()
            });

            console.log(`[Gmail Poll] Reply detected from ${senderEmail} (${lead.name}) to ${userEmail}`);
            repliesForEmail++;
            totalRepliesFound++;
          } catch (error) {
            console.error('[Gmail Poll] Error processing message:', error);
          }
        }

        await updateLastSync(userEmail, 'idle');
        console.log(`[Gmail Poll] ${userEmail}: Found ${repliesForEmail} replies.`);
      } catch (error) {
        console.error(`[Gmail Poll] Error processing ${userEmail}:`, error);
        await updateLastSync(userEmail, 'error', String(error));
      }
    }

    console.log(`[Gmail Poll] Completed. Accounts: ${emailsToCheck.length}, Messages: ${totalMessagesChecked}, Replies: ${totalRepliesFound}`);
    return res.status(200).json({
      success: true,
      accountsChecked: emailsToCheck.length,
      messagesChecked: totalMessagesChecked,
      repliesFound: totalRepliesFound
    });
  } catch (error) {
    console.error('[Gmail Poll Error]', error);
    return res.status(500).json({ error: 'Gmail poll failed' });
  }
}
