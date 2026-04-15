import { createClient } from '@supabase/supabase-js';
import {
  escapeHtml,
  sanitizeFormData,
  checkRateLimit,
} from '../src/lib/security';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const brevoApiKey = process.env.VITE_BREVO_API_KEY!;
const brevoFromEmail = process.env.VITE_BREVO_FROM_EMAIL || 'company@atlassynapseai.com';
const brevoFromName = process.env.VITE_BREVO_FROM_NAME || 'Atlas Synapse';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://atlassynapseai.com',
  'https://www.atlassynapseai.com',
];

// Security logging function
function logSecurityEvent(
  event: string,
  level: 'info' | 'warn' | 'error',
  data: Record<string, any>
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    level,
    ...data,
  };
  console.log(`[SECURITY] ${timestamp} [${level.toUpperCase()}] ${event}:`, JSON.stringify(logEntry));
}

function calculateRiskScore(aiUseCase: string, role: string): number {
  let score = 50;
  const highRiskUseCases = ['Code Generation', 'Workflow Automation', 'Data Analysis & Insights'];
  const mediumRiskUseCases = ['Customer Support & Chatbots', 'Content Generation', 'Document Processing'];

  if (highRiskUseCases.includes(aiUseCase)) {
    score += 30;
  } else if (mediumRiskUseCases.includes(aiUseCase)) {
    score += 15;
  }

  const technicalRoles = ['CTO/VP Engineering', 'VP Product', 'Engineering Manager', 'Solutions Architect'];
  const executiveRoles = ['CEO/Founder', 'VP Sales'];

  if (technicalRoles.includes(role)) {
    score += 20;
  } else if (executiveRoles.includes(role)) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

async function sendConfirmationEmail(email: string, firstName: string, company: string): Promise<boolean> {
  if (!brevoApiKey) {
    logSecurityEvent('email_config_missing', 'error', { email });
    return false;
  }

  try {
    // Escape HTML to prevent email template injection
    const escapedFirstName = escapeHtml(firstName);
    const escapedCompany = escapeHtml(company);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: brevoFromName, email: brevoFromEmail },
        to: [{ email, name: escapedFirstName }],
        subject: 'Priority Access Request Received - Atlas Synapse',
        htmlContent: `
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto;">
                <p>Hi ${escapedFirstName},</p>
                <p>Thank you for submitting your priority access request for Atlas Synapse!</p>
                <p>We're excited to help bring trust and governance to your AI systems at ${escapedCompany}.</p>
                <p>Our team will review your submission and reach out within 24 hours to discuss your AI use case and how Atlas Synapse can help.</p>
                <p style="margin-top: 40px;">Best regards,<br/>
                <strong>Atlas Synapse Team</strong><br/>
                company@atlassynapseai.com</p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      logSecurityEvent('email_send_failed', 'warn', { email, status: response.status });
      return false;
    }

    logSecurityEvent('email_sent_success', 'info', { email });
    return true;
  } catch (error) {
    logSecurityEvent('email_send_error', 'error', { email, error: String(error) });
    return false;
  }
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Only set CORS origin if it's allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export default async function handler(req: any, res: any) {
  const origin = req.headers.origin;
  const headers = getCorsHeaders(origin);

  // Set CORS headers
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting per IP/email
    const clientIp = req.headers['x-forwarded-for'] || 'unknown';

    // Parse request body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      logSecurityEvent('invalid_json', 'warn', { ip: clientIp });
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Sanitize and validate all inputs
    const sanitized = sanitizeFormData(body);

    if (sanitized.errors.length > 0) {
      logSecurityEvent('validation_error', 'warn', {
        ip: clientIp,
        errors: sanitized.errors,
        email: body.email,
      });
      return res.status(400).json({ error: sanitized.errors[0] });
    }

    // Check rate limiting by email
    const rateLimit = checkRateLimit(sanitized.email!, 5, 86400); // 5 per day per email
    if (!rateLimit.allowed) {
      logSecurityEvent('rate_limit_exceeded', 'warn', {
        email: sanitized.email,
        ip: clientIp,
      });
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // Check rate limiting by IP
    const ipRateLimit = checkRateLimit(`ip:${clientIp}`, 20, 3600); // 20 per hour per IP
    if (!ipRateLimit.allowed) {
      logSecurityEvent('ip_rate_limit_exceeded', 'warn', { ip: clientIp });
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    if (!supabaseUrl || !supabaseServiceRole) {
      logSecurityEvent('config_missing', 'error', {});
      return res.status(500).json({ error: 'Service temporarily unavailable' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    const riskScore = calculateRiskScore(sanitized.aiUseCase || '', sanitized.role || '');

    const lead = {
      name: `${sanitized.firstName} ${sanitized.lastName || ''}`.trim(),
      email: sanitized.email,
      company: sanitized.company,
      phone: '',
      industry: '',
      ai_tools: sanitized.aiUseCase || '',
      stage: 'New',
      value: 0,
      risk_score: riskScore,
      notes: `Role: ${sanitized.role || 'N/A'}\nHow heard: ${sanitized.hearAboutUs || 'N/A'}\nCurrency: ${sanitized.currency || 'USD'}\n\nAdditional details: ${sanitized.additionalDetails || 'None'}`,
      log: [
        {
          action: 'Priority access form submitted',
          time: new Date().toISOString(),
          color: '#0ea5e9',
        },
      ],
    };

    const { data, error } = await supabase.from('leads').insert(lead).select();

    if (error) {
      // Log error but don't expose details to client
      logSecurityEvent('database_error', 'error', {
        email: sanitized.email,
        error: error.message,
      });
      return res.status(500).json({ error: 'Failed to process request' });
    }

    // Send confirmation email (fire and forget, with logging)
    await sendConfirmationEmail(sanitized.email, sanitized.firstName, sanitized.company);

    logSecurityEvent('lead_created', 'info', {
      email: sanitized.email,
      leadId: data?.[0]?.id,
      riskScore,
      ip: clientIp,
    });

    return res.status(200).json({
      success: true,
      message: 'Priority access request received',
      leadId: data?.[0]?.id,
      riskScore,
    });
  } catch (error) {
    logSecurityEvent('unexpected_error', 'error', {
      error: String(error),
    });
    return res.status(500).json({ error: 'Service temporarily unavailable' });
  }
}
