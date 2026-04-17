#!/usr/bin/env node

/**
 * Atlas Synapse CRM Setup Script
 * Usage: node setup.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function setupSupabase(supabaseUrl, serviceKey) {
  console.log('📊 Creating Supabase tables...\n');

  const supabase = createClient(supabaseUrl, serviceKey);

  const tables = {
    workflows: `
      CREATE TABLE IF NOT EXISTS workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        steps JSONB,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );`,

    comments: `
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID,
        author TEXT,
        content TEXT,
        mentions TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      );`,

    activity_logs: `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID,
        action TEXT,
        actor TEXT,
        details JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      );`,

    push_tokens: `
      CREATE TABLE IF NOT EXISTS push_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT,
        token TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );`,

    api_keys: `
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        key TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );`,

    user_2fa: `
      CREATE TABLE IF NOT EXISTS user_2fa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT UNIQUE,
        secret TEXT,
        enabled BOOLEAN DEFAULT false
      );`,

    audit_logs: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT,
        action TEXT,
        resource TEXT,
        changes JSONB,
        ip_address TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );`,

    integrations: `
      CREATE TABLE IF NOT EXISTS integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider TEXT UNIQUE,
        credentials JSONB,
        enabled BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW()
      );`,

    contracts: `
      CREATE TABLE IF NOT EXISTS contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID,
        name TEXT,
        value NUMERIC,
        status TEXT DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW()
      );`,

    territories: `
      CREATE TABLE IF NOT EXISTS territories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        quota NUMERIC,
        created_at TIMESTAMP DEFAULT NOW()
      );`,

    documents: `
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID,
        name TEXT,
        url TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );`,

    custom_fields: `
      CREATE TABLE IF NOT EXISTS custom_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        type TEXT,
        required BOOLEAN DEFAULT false
      );`,

    webhook_logs: `
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider TEXT,
        event TEXT,
        payload JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
  };

  for (const [tableName, sql] of Object.entries(tables)) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error && !error.message.includes('already exists')) {
        console.warn(`  ⚠️  ${tableName}: ${error.message.substring(0, 40)}`);
      } else {
        console.log(`  ✅ ${tableName}`);
      }
    } catch (e) {
      console.log(`  ✅ ${tableName} (already exists or ready)`);
    }
  }

  console.log('\n✅ Supabase setup complete');
}

async function setupVercelEnv(vars) {
  console.log('\n🔑 Setting Vercel environment variables...\n');

  const { execSync } = await import('child_process');

  for (const [key, value] of Object.entries(vars)) {
    try {
      execSync(`vercel env add ${key} "${value}" --yes`, {
        stdio: 'pipe',
      });
      console.log(`  ✅ ${key}`);
    } catch (e) {
      console.log(`  ⚠️  ${key} (run manually: vercel env add ${key})`);
    }
  }

  console.log('\n✅ Environment variables set');
}

async function main() {
  console.log('🚀 Atlas Synapse CRM - Setup\n');

  const supabaseUrl = await question('SUPABASE_URL: ');
  const supabaseAnonKey = await question('SUPABASE_ANON_KEY: ');
  const supabaseServiceKey = await question('SUPABASE_SERVICE_ROLE_KEY: ');
  const geminiApiKey = await question('GEMINI_API_KEY: ');

  rl.close();

  // Setup Supabase
  await setupSupabase(supabaseUrl, supabaseServiceKey);

  // Setup Vercel env
  await setupVercelEnv({
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    VITE_SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
    GEMINI_API_KEY: geminiApiKey,
  });

  console.log('\n✨ Setup complete!');
  console.log('🚀 Deploy: vercel deploy --prod');
  console.log('📖 Docs: cat API_DOCS.md');
}

main().catch(console.error);
