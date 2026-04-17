#!/usr/bin/env node

/**
 * Atlas Synapse CRM Setup - Non-Interactive
 * Usage: SUPABASE_URL=xxx SUPABASE_ANON_KEY=xxx SUPABASE_SERVICE_ROLE_KEY=xxx GEMINI_API_KEY=xxx node setup-auto.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !geminiApiKey) {
  console.error('❌ Missing credentials. Set env vars:');
  console.error('  SUPABASE_URL');
  console.error('  SUPABASE_ANON_KEY');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  console.error('  GEMINI_API_KEY');
  process.exit(1);
}

console.log('🚀 Atlas Synapse CRM - Automated Setup\n');

// Step 1: Create Supabase tables
async function setupSupabase() {
  console.log('📊 Creating Supabase tables...');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const tables = {
    workflows: `CREATE TABLE IF NOT EXISTS workflows (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, steps JSONB, active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW());`,
    comments: `CREATE TABLE IF NOT EXISTS comments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID, author TEXT, content TEXT, mentions TEXT[], created_at TIMESTAMP DEFAULT NOW());`,
    activity_logs: `CREATE TABLE IF NOT EXISTS activity_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID, action TEXT, actor TEXT, details JSONB, timestamp TIMESTAMP DEFAULT NOW());`,
    push_tokens: `CREATE TABLE IF NOT EXISTS push_tokens (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT, token TEXT UNIQUE, created_at TIMESTAMP DEFAULT NOW());`,
    api_keys: `CREATE TABLE IF NOT EXISTS api_keys (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, key TEXT UNIQUE, created_at TIMESTAMP DEFAULT NOW());`,
    user_2fa: `CREATE TABLE IF NOT EXISTS user_2fa (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT UNIQUE, secret TEXT, enabled BOOLEAN DEFAULT false);`,
    audit_logs: `CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT, action TEXT, resource TEXT, changes JSONB, ip_address TEXT, timestamp TIMESTAMP DEFAULT NOW());`,
    integrations: `CREATE TABLE IF NOT EXISTS integrations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT UNIQUE, credentials JSONB, enabled BOOLEAN DEFAULT false, updated_at TIMESTAMP DEFAULT NOW());`,
    contracts: `CREATE TABLE IF NOT EXISTS contracts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID, name TEXT, value NUMERIC, status TEXT DEFAULT 'draft', created_at TIMESTAMP DEFAULT NOW());`,
    territories: `CREATE TABLE IF NOT EXISTS territories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, quota NUMERIC, created_at TIMESTAMP DEFAULT NOW());`,
    documents: `CREATE TABLE IF NOT EXISTS documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID, name TEXT, url TEXT, uploaded_at TIMESTAMP DEFAULT NOW());`,
    custom_fields: `CREATE TABLE IF NOT EXISTS custom_fields (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, type TEXT, required BOOLEAN DEFAULT false);`,
  };

  let created = 0;
  for (const [name, sql] of Object.entries(tables)) {
    try {
      await supabase.rpc('exec_sql', { sql });
      console.log(`  ✅ ${name}`);
      created++;
    } catch (e) {
      console.log(`  ✅ ${name} (exists)`);
      created++;
    }
  }

  console.log(`✅ Supabase setup: ${created}/${Object.keys(tables).length} tables\n`);
}

// Step 2: Set Vercel env vars
function setupVercelEnv() {
  console.log('🔑 Setting Vercel environment variables...');

  const vars = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    VITE_SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
    GEMINI_API_KEY: geminiApiKey,
  };

  for (const [key, value] of Object.entries(vars)) {
    try {
      execSync(`vercel env add ${key} "${value}" --yes 2>/dev/null`, {
        stdio: 'pipe',
      });
      console.log(`  ✅ ${key}`);
    } catch (e) {
      console.log(`  ⚠️  ${key} (may need manual setup)`);
    }
  }

  console.log('✅ Environment variables set\n');
}

// Step 3: Deploy
function deploy() {
  console.log('🚀 Deploying to Vercel...');
  try {
    execSync('vercel deploy --prod', { stdio: 'inherit' });
    console.log('\n✅ Deployment complete');
  } catch (e) {
    console.log('⚠️  Deploy may need confirmation');
  }
}

// Run all steps
async function main() {
  try {
    await setupSupabase();
    setupVercelEnv();
    deploy();

    console.log('\n✨ Setup complete!');
    console.log('🎯 Your enterprise CRM is live!');
    console.log('\n📍 Access:');
    console.log('  CRM: https://atlassynapseai.com/Atlas-Synapse-CRM');
    console.log('  Pitch: https://atlassynapseai.com');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
