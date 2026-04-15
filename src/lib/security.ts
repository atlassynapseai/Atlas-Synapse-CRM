/**
 * Security utility functions for input validation, sanitization, and escaping
 */

// HTML escape function to prevent email template injection
export function escapeHtml(str: string): string {
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

// Email validation with RFC standards
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email exceeds maximum length' };
  }

  // RFC 5322 simplified regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Prevent common injection patterns
  if (email.includes('<') || email.includes('>') || email.includes('\n') || email.includes('\r')) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

// String length validation
export function validateStringLength(
  str: string | undefined,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 500
): { valid: boolean; error?: string } {
  if (!str) {
    if (minLength > 0) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  }

  if (typeof str !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (str.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (str.length > maxLength) {
    return { valid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }

  return { valid: true };
}

// Validate against a whitelist
export function validateFromWhitelist(
  value: string | undefined,
  whitelist: string[],
  fieldName: string
): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: true }; // Optional field
  }

  if (!whitelist.includes(value)) {
    return { valid: false, error: `Invalid ${fieldName}` };
  }

  return { valid: true };
}

// Sanitize string by removing control characters
export function sanitizeString(str: string): string {
  if (!str) return '';
  // Remove control characters and line breaks
  return str.replace(/[\x00-\x1F\x7F\n\r]/g, ' ').trim();
}

// Rate limit check (in-memory, suitable for small deployments)
// For production, use Upstash Redis or similar
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 5,
  windowSeconds: number = 86400 // 24 hours
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now - record.timestamp > windowSeconds * 1000) {
    // New window
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

// Sanitize and validate request body
export function sanitizeFormData(data: any): {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  role?: string;
  aiUseCase?: string;
  hearAboutUs?: string;
  currency?: string;
  additionalDetails?: string;
  errors: string[];
} {
  const errors: string[] = [];
  const result: any = {};

  // First name
  const firstNameValidation = validateStringLength(data.firstName, 'First name', 1, 50);
  if (!firstNameValidation.valid) {
    errors.push(firstNameValidation.error!);
  } else {
    result.firstName = sanitizeString(data.firstName);
  }

  // Last name (optional)
  if (data.lastName) {
    const lastNameValidation = validateStringLength(data.lastName, 'Last name', 0, 50);
    if (!lastNameValidation.valid) {
      errors.push(lastNameValidation.error!);
    } else {
      result.lastName = sanitizeString(data.lastName);
    }
  }

  // Email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.push(emailValidation.error!);
  } else {
    result.email = data.email.toLowerCase().trim();
  }

  // Company
  const companyValidation = validateStringLength(data.company, 'Company', 1, 100);
  if (!companyValidation.valid) {
    errors.push(companyValidation.error!);
  } else {
    result.company = sanitizeString(data.company);
  }

  // Role (optional, from whitelist)
  const validRoles = [
    'CEO/Founder',
    'CTO/VP Engineering',
    'VP Product',
    'VP Sales',
    'VP Marketing',
    'Operations Manager',
    'Product Manager',
    'Engineering Manager',
    'Solutions Architect',
    'Sales Manager',
    'Account Executive',
    'Finance Manager',
  ];
  if (data.role) {
    const roleValidation = validateFromWhitelist(data.role, validRoles, 'role');
    if (!roleValidation.valid) {
      errors.push(roleValidation.error!);
    } else {
      result.role = data.role;
    }
  }

  // AI Use Case (optional, from whitelist)
  const validUseCases = [
    'Customer Support & Chatbots',
    'Content Generation',
    'Data Analysis & Insights',
    'Code Generation',
    'Document Processing',
    'Workflow Automation',
  ];
  if (data.aiUseCase) {
    const useCaseValidation = validateFromWhitelist(data.aiUseCase, validUseCases, 'aiUseCase');
    if (!useCaseValidation.valid) {
      errors.push(useCaseValidation.error!);
    } else {
      result.aiUseCase = data.aiUseCase;
    }
  }

  // How heard about us (optional, from whitelist)
  const validHearAbout = [
    'Product Hunt',
    'Twitter/X',
    'LinkedIn',
    'Referral',
    'Google Search',
    'GitHub',
    'Hacker News',
    'Conference',
    'Newsletter',
    'Podcast',
  ];
  if (data.hearAboutUs) {
    const hearValidation = validateFromWhitelist(data.hearAboutUs, validHearAbout, 'hearAboutUs');
    if (!hearValidation.valid) {
      errors.push(hearValidation.error!);
    } else {
      result.hearAboutUs = data.hearAboutUs;
    }
  }

  // Currency (optional, from whitelist)
  const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
  if (data.currency) {
    const currencyValidation = validateFromWhitelist(data.currency, validCurrencies, 'currency');
    if (!currencyValidation.valid) {
      errors.push(currencyValidation.error!);
    } else {
      result.currency = data.currency;
    }
  } else {
    result.currency = 'USD'; // Default
  }

  // Additional details (optional)
  if (data.additionalDetails) {
    const detailsValidation = validateStringLength(data.additionalDetails, 'Additional details', 0, 2000);
    if (!detailsValidation.valid) {
      errors.push(detailsValidation.error!);
    } else {
      result.additionalDetails = sanitizeString(data.additionalDetails);
    }
  }

  return { ...result, errors };
}
