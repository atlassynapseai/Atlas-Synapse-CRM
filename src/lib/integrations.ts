interface IntegrationConfig {
  provider: string;
  credentials: Record<string, string>;
  enabled: boolean;
}

interface IntegrationEvent {
  event: string;
  leadId: string;
  data: Record<string, any>;
  timestamp: string;
}

// Slack integration
export async function sendSlackNotification(
  config: IntegrationConfig,
  message: string,
  channel: string
): Promise<boolean> {
  if (!config.credentials.webhook_url) return false;

  try {
    const response = await fetch(config.credentials.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        text: message,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: message } },
        ],
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Slack error:', error);
    return false;
  }
}

// Stripe webhook handler
export async function handleStripeWebhook(event: any): Promise<void> {
  if (event.type === 'payment_intent.succeeded') {
    const leadId = event.data.object.metadata.leadId;
    const amount = event.data.object.amount / 100;
    console.log(`💰 Payment received: ${leadId} - $${amount}`);
  }
}

// Google Calendar integration
export async function createGoogleCalendarEvent(
  config: IntegrationConfig,
  leadName: string,
  timestamp: string
): Promise<boolean> {
  if (!config.credentials.access_token) return false;

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.credentials.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `Follow-up: ${leadName}`,
          description: `Follow-up with ${leadName}`,
          start: { dateTime: timestamp },
          end: { dateTime: new Date(new Date(timestamp).getTime() + 30 * 60000).toISOString() },
        }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Google Calendar error:', error);
    return false;
  }
}

// Webhooks framework
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

// Generic webhook event processor
export async function processIntegrationEvent(
  event: IntegrationEvent,
  integrations: IntegrationConfig[]
): Promise<void> {
  for (const integration of integrations) {
    if (!integration.enabled) continue;

    switch (integration.provider) {
      case 'slack':
        if (event.event === 'new_lead') {
          await sendSlackNotification(
            integration,
            `🎉 New Lead: ${event.data.name} from ${event.data.company}`,
            '#leads'
          );
        }
        break;
      case 'google_calendar':
        if (event.event === 'followup_scheduled') {
          await createGoogleCalendarEvent(
            integration,
            event.data.leadName,
            event.data.timestamp
          );
        }
        break;
    }
  }
}

// Zapier-compatible webhook
export async function handleZapierWebhook(payload: any): Promise<void> {
  console.log('Zapier event received:', payload);
  // Zapier sends data to custom webhooks configured in their UI
  // This handler processes those incoming events
}
