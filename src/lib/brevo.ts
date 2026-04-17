const apiKey = import.meta.env.VITE_BREVO_API_KEY;
const fromEmail = import.meta.env.VITE_BREVO_FROM_EMAIL || 'company@atlassynapseai.com';
const fromName = import.meta.env.VITE_BREVO_FROM_NAME || 'Atlas Synapse';

if (!apiKey) {
  throw new Error('Missing Brevo API key in environment variables');
}

// HTML escape function to prevent template injection
function escapeHtml(str: string): string {
  if (!str) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (char) => map[char]);
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
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
            .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
            .header { background: linear-gradient(90deg, #f97316, #7c3aed); padding: 30px; text-align: center; animation: fadeIn 0.5s ease-in; }
            .logo { height: 50px; width: 50px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; }
            .logo img { height: 45px; width: 45px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
            .brand-text { color: white; font-weight: bold; font-size: 14px; letter-spacing: 1px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 20px; }
            .body-text { color: #555; font-size: 15px; margin-bottom: 16px; }
            .cta-button { display: inline-block; background: linear-gradient(90deg, #f97316, #ea580c); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; transition: all 0.3s ease; font-size: 14px; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(249, 115, 22, 0.3); }
            .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .sig-name { font-weight: 600; color: #111; }
            .sig-title { color: #f97316; font-size: 13px; font-weight: 600; }
            .footer { background: #f3f4f6; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer-text { font-size: 12px; color: #666; }
            .footer-link { color: #f97316; text-decoration: none; font-weight: 600; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @media (max-width: 600px) {
              .email-container { border-radius: 0; }
              .content { padding: 20px 15px; }
              .header { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="logo">
                <img src="https://raw.githubusercontent.com/atlassynapseai/Atlas-Synapse-CRM/main/public/logo.png" alt="Atlas Synapse" style="width: 45px; height: 45px;">
              </div>
              <div class="brand-text">ATLAS SYNAPSE</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 12px; letter-spacing: 0.5px;">Forensic Growth Engine</div>
            </div>

            <div class="content">
              <div class="greeting">Hi ${escapeHtml(leadName)},</div>

              <p class="body-text">Thank you for requesting priority access to Atlas Synapse!</p>

              <p class="body-text">We're excited to help you bring trust and governance to your AI systems. Based on your submission, I'd love to schedule a 15-minute call to understand your current AI setup and show you how Atlas Synapse can help.</p>

              <p class="body-text"><strong>What we'll cover:</strong></p>
              <ul style="margin-left: 20px; margin-bottom: 16px; color: #555;">
                <li style="margin-bottom: 8px;">Your current AI infrastructure & challenges</li>
                <li style="margin-bottom: 8px;">How Atlas Synapse provides real-time governance</li>
                <li style="margin-bottom: 8px;">Quick ROI analysis for your use case</li>
              </ul>

              <p class="body-text">Are you available this week for a quick call?</p>

              <a href="https://calendly.com/gloria-atlas" class="cta-button">Schedule a Call</a>

              <div class="signature">
                <div class="sig-name">Gloria Barsoum</div>
                <div class="sig-title">Chief Growth Officer</div>
                <div style="color: #888; font-size: 12px; margin-top: 8px;">Atlas Synapse LLC<br/>company@atlassynapseai.com</div>
              </div>
            </div>

            <div class="footer">
              <div class="footer-text">
                © 2026 Atlas Synapse LLC · All interactions monitored for stochastic leakage
                <br><br>
                <a href="#" class="footer-link">View in Browser</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  followUp: (leadName: string, company: string, requestDate: string) => ({
    subject: `Following up - Atlas Synapse for ${escapeHtml(company)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
            .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
            .header { background: linear-gradient(90deg, #f97316, #7c3aed); padding: 30px; text-align: center; animation: fadeIn 0.5s ease-in; }
            .logo { height: 50px; width: 50px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; }
            .logo img { height: 45px; width: 45px; object-fit: contain; }
            .brand-text { color: white; font-weight: bold; font-size: 14px; letter-spacing: 1px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 20px; }
            .body-text { color: #555; font-size: 15px; margin-bottom: 16px; }
            .cta-button { display: inline-block; background: linear-gradient(90deg, #f97316, #ea580c); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; transition: all 0.3s ease; font-size: 14px; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(249, 115, 22, 0.3); }
            .highlight-box { background: #fef3c7; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .sig-name { font-weight: 600; color: #111; }
            .sig-title { color: #f97316; font-size: 13px; font-weight: 600; }
            .footer { background: #f3f4f6; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer-text { font-size: 12px; color: #666; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="logo">
                <img src="https://raw.githubusercontent.com/atlassynapseai/Atlas-Synapse-CRM/main/public/logo.png" alt="Atlas Synapse">
              </div>
              <div class="brand-text">ATLAS SYNAPSE</div>
            </div>

            <div class="content">
              <div class="greeting">Hi ${escapeHtml(leadName)},</div>

              <p class="body-text">I wanted to follow up on your priority access request from ${escapeHtml(requestDate)}.</p>

              <div class="highlight-box">
                <strong style="color: #111;">We've helped companies like yours reduce AI compliance risk by 80%</strong> while maintaining full auditability and agent performance.
              </div>

              <p class="body-text">I'd love to show you a quick demo of how Atlas Synapse provides real-time governance for your AI agents.</p>

              <p class="body-text"><strong>Quick facts about Atlas Synapse:</strong></p>
              <ul style="margin-left: 20px; margin-bottom: 16px; color: #555;">
                <li style="margin-bottom: 8px;">✓ 24-hour onboarding (no complex integrations)</li>
                <li style="margin-bottom: 8px;">✓ Real-time compliance monitoring</li>
                <li style="margin-bottom: 8px;">✓ Works with any LLM/agent architecture</li>
              </ul>

              <p class="body-text">When works for a 15-minute call this week?</p>

              <a href="https://calendly.com/gloria-atlas" class="cta-button">Find Time on My Calendar</a>

              <div class="signature">
                <div class="sig-name">Gloria</div>
                <div class="sig-title">Chief Growth Officer, Atlas Synapse</div>
              </div>
            </div>

            <div class="footer">
              <div class="footer-text">© 2026 Atlas Synapse LLC</div>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  proposalSent: (leadName: string, company: string) => ({
    subject: `Atlas Synapse Proposal for ${escapeHtml(company)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
            .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
            .header { background: linear-gradient(90deg, #f97316, #7c3aed); padding: 30px; text-align: center; }
            .logo { height: 50px; width: 50px; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; }
            .logo img { height: 45px; width: 45px; object-fit: contain; }
            .brand-text { color: white; font-weight: bold; font-size: 14px; letter-spacing: 1px; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 16px; font-weight: 600; color: #111; margin-bottom: 20px; }
            .body-text { color: #555; font-size: 15px; margin-bottom: 16px; }
            .feature-list { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
            .feature-item { margin-bottom: 12px; color: #555; }
            .feature-item strong { color: #111; }
            .cta-button { display: inline-block; background: linear-gradient(90deg, #10b981, #059669); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; transition: all 0.3s ease; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3); }
            .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .sig-name { font-weight: 600; color: #111; }
            .sig-title { color: #f97316; font-size: 13px; font-weight: 600; }
            .footer { background: #f3f4f6; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer-text { font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="logo">
                <img src="https://raw.githubusercontent.com/atlassynapseai/Atlas-Synapse-CRM/main/public/logo.png" alt="Atlas Synapse">
              </div>
              <div class="brand-text">ATLAS SYNAPSE</div>
            </div>

            <div class="content">
              <div class="greeting">Hi ${escapeHtml(leadName)},</div>

              <p class="body-text">As discussed, I've attached our proposal for ${escapeHtml(company)}'s AI governance needs.</p>

              <div class="feature-list">
                <div class="feature-item">✓ <strong>Full Agent Monitoring:</strong> Real-time tracking and performance analytics</div>
                <div class="feature-item">✓ <strong>Plain-English Reporting:</strong> Failures and anomalies in business language</div>
                <div class="feature-item">✓ <strong>ROI Tracking:</strong> Prove value in dollars, not just tokens</div>
                <div class="feature-item">✓ <strong>24-Hour Onboarding:</strong> Get running immediately</div>
                <div class="feature-item">✓ <strong>Compliance Ready:</strong> GDPR, SOC2, and AI Act compliant</div>
              </div>

              <p class="body-text">Next steps:</p>
              <ol style="margin-left: 20px; margin-bottom: 16px; color: #555;">
                <li style="margin-bottom: 8px;">Review the attached proposal</li>
                <li style="margin-bottom: 8px;">Schedule a call to walk through it together</li>
                <li>We'll get you onboarded within 24 hours of signing</li>
              </ol>

              <p class="body-text">Questions? I'm here to help clarify anything.</p>

              <a href="https://calendly.com/gloria-atlas" class="cta-button">Schedule a Call to Review</a>

              <div class="signature">
                <div class="sig-name">Gloria Barsoum</div>
                <div class="sig-title">Chief Growth Officer</div>
                <div style="color: #888; font-size: 12px; margin-top: 8px;">Atlas Synapse LLC</div>
              </div>
            </div>

            <div class="footer">
              <div class="footer-text">© 2026 Atlas Synapse LLC · All interactions monitored</div>
            </div>
          </div>
        </body>
      </html>
    `
  })
};

// Send custom email with branding
export async function sendCustomMessage(params: {
  to: string;
  toName: string;
  subject: string;
  body: string;
  senderName?: string;
}) {
  const senderName = params.senderName || 'Gloria Barsoum';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
          .header { background: linear-gradient(90deg, #f97316, #7c3aed); padding: 30px; text-align: center; }
          .logo { height: 50px; width: 50px; margin: 0 auto 15px; }
          .logo img { height: 45px; width: 45px; object-fit: contain; }
          .brand-text { color: white; font-weight: bold; font-size: 14px; letter-spacing: 1px; }
          .content { padding: 40px 30px; }
          .body-text { color: #555; font-size: 15px; margin-bottom: 16px; line-height: 1.7; }
          .custom-badge { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 20px; }
          .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
          .sig-name { font-weight: 600; color: #111; }
          .sig-title { color: #f97316; font-size: 13px; font-weight: 600; }
          .footer { background: #f3f4f6; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer-text { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo">
              <img src="https://raw.githubusercontent.com/atlassynapseai/Atlas-Synapse-CRM/main/public/logo.png" alt="Atlas Synapse">
            </div>
            <div class="brand-text">ATLAS SYNAPSE</div>
          </div>

          <div class="content">
            <div class="custom-badge">💬 Custom Message from Atlas Synapse</div>

            <div class="body-text">\${escapeHtml(params.body).replace(/\n/g, '<br>')}</div>

            <div class="signature">
              <div class="sig-name">\${escapeHtml(senderName)}</div>
              <div class="sig-title">Atlas Synapse</div>
              <div style="color: #888; font-size: 12px; margin-top: 8px;">company@atlassynapseai.com</div>
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">© 2026 Atlas Synapse LLC</div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: params.to,
    toName: params.toName,
    subject: params.subject,
    htmlContent
  });
}
