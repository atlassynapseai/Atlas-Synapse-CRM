const apiKey = import.meta.env.VITE_BREVO_API_KEY;
const fromEmail = import.meta.env.VITE_BREVO_FROM_EMAIL || 'company@atlassynapseai.com';
const fromName = import.meta.env.VITE_BREVO_FROM_NAME || 'Atlas Synapse';

if (!apiKey) {
  throw new Error('Missing Brevo API key in environment variables');
}

export interface EmailParams {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail(params: EmailParams) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: params.to, name: params.toName }],
        subject: params.subject,
        htmlContent: params.htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Brevo email error:', error);
    return { success: false, error };
  }
}

export const EMAIL_TEMPLATES = {
  initialOutreach: (leadName: string, company: string) => ({
    subject: 'Re: Your Atlas Synapse Priority Access Request',
    html: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <p>Hi ${leadName},</p>
            <p>Thank you for requesting priority access to Atlas Synapse!</p>
            <p>We're excited to help you bring trust and governance to your AI systems. Based on your submission, I'd love to schedule a 15-minute call to understand your current AI setup and show you how Atlas Synapse can help.</p>
            <p>Are you available this week for a quick call?</p>
            <p style="margin-top: 40px;">Best regards,<br/>
            <strong>Gloria Barsoum</strong><br/>
            Chief Growth Officer<br/>
            Atlas Synapse<br/>
            company@atlassynapseai.com</p>
          </div>
        </body>
      </html>
    `
  }),

  followUp: (leadName: string, company: string, requestDate: string) => ({
    subject: `Following up - Atlas Synapse for ${company}`,
    html: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <p>Hi ${leadName},</p>
            <p>I wanted to follow up on your priority access request from ${requestDate}.</p>
            <p>We've helped companies like yours reduce AI compliance risk by 80% while maintaining full auditability. I'd love to show you a quick demo.</p>
            <p>When works for a 15-minute call this week?</p>
            <p style="margin-top: 40px;">Best,<br/>
            <strong>Gloria</strong><br/>
            Atlas Synapse</p>
          </div>
        </body>
      </html>
    `
  }),

  proposalSent: (leadName: string, company: string) => ({
    subject: `Atlas Synapse Proposal for ${company}`,
    html: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <p>Hi ${leadName},</p>
            <p>As discussed, I've attached our proposal for ${company}'s AI governance needs.</p>
            <p><strong>Key highlights:</strong></p>
            <ul>
              <li>Full agent monitoring and performance tracking</li>
              <li>Plain-English failure reporting</li>
              <li>ROI tracking (prove value in dollars, not just tokens)</li>
              <li>24-hour onboarding</li>
            </ul>
            <p>Questions? Let's schedule a call to walk through it.</p>
            <p style="margin-top: 40px;">Best regards,<br/>
            <strong>Gloria Barsoum</strong><br/>
            Atlas Synapse</p>
          </div>
        </body>
      </html>
    `
  })
};
