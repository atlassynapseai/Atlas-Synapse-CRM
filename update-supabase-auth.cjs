const https = require('https');

const SUPABASE_URL = 'https://guodrtwqhbnnjrbfkbxs.supabase.co';
const SUPABASE_PROJECT_REF = 'guodrtwqhbnnjrbfkbxs';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1b2RydHdxaGJubmpyYmZrYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MTY3MiwiZXhwIjoyMDg4MTE3NjcyfQ.BywIApRxE5Hyr4qthkCEXzBOVgGOI7EiBxmrDPCQ8gw';

async function updateAuthSettings() {
  try {
    console.log('🔧 Updating Supabase auth configuration...\n');

    // Get the auth settings first to see current configuration
    const settings = {
      site_url: 'https://atlassynapseai.com',
      redirect_urls: [
        'https://atlassynapseai.com/auth/callback',
        'https://atlassynapseai.com/Atlas-Synapse-CRM',
        'https://atlas-synapse-crm.vercel.app/auth/callback',
        'http://localhost:3000',
        'http://localhost:5173',
      ],
    };

    // For now, we'll just log what we need to do
    console.log('✅ Supabase auth configuration needed:\n');
    console.log('📧 Site URL: ' + settings.site_url);
    console.log('🔗 Redirect URLs:');
    settings.redirect_urls.forEach(url => {
      console.log('   • ' + url);
    });
    console.log('\n📝 To complete setup:');
    console.log('1. Go to: https://app.supabase.com/project/' + SUPABASE_PROJECT_REF + '/auth/url-configuration');
    console.log('2. Update Site URL to: ' + settings.site_url);
    console.log('3. Add Redirect URLs:');
    settings.redirect_urls.forEach(url => {
      console.log('   • ' + url);
    });
    console.log('\n✨ Once updated, email verification & password reset will use: ' + settings.site_url);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateAuthSettings();
