import {
  checkPermission,
  generateTOTPSecret,
  verifyTOTP,
  createAuditLog,
} from '@/lib/enterprise-security';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { action, userId, role, resource, targetResource } = await request.json();

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    switch (action) {
      case 'enable_2fa':
        const secret = generateTOTPSecret();
        await supabase
          .from('user_2fa')
          .upsert({ user_id: userId, secret, enabled: false });
        return new Response(
          JSON.stringify({ secret, qrCode: `otpauth://totp/atlas-synapse/${userId}?secret=${secret}` }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      case 'verify_2fa':
        const { token } = await request.json();
        const { data: twofa } = await supabase
          .from('user_2fa')
          .select('secret')
          .eq('user_id', userId)
          .single();

        const isValid = verifyTOTP(twofa?.secret || '', token);
        if (isValid) {
          await supabase
            .from('user_2fa')
            .update({ enabled: true })
            .eq('user_id', userId);
        }

        return new Response(
          JSON.stringify({ valid: isValid }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      case 'check_permission':
        const allowed = checkPermission(role, resource, targetResource);
        return new Response(
          JSON.stringify({ allowed }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      case 'audit_log':
        const { resource: auditResource, changes } = await request.json();
        const auditLog = await createAuditLog(
          userId,
          action,
          auditResource,
          changes,
          request.headers.get('x-forwarded-for') || '0.0.0.0'
        );

        await supabase.from('audit_logs').insert(auditLog);
        return new Response(
          JSON.stringify({ success: true }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security error:', error);
    return new Response(
      JSON.stringify({ error: 'Security operation failed' }),
      { status: 500 }
    );
  }
}
