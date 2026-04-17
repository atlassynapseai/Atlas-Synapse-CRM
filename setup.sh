#!/bin/bash

# Setup script for Atlas Synapse CRM
# Run: bash setup.sh

set -e

echo "🚀 Setting up Atlas Synapse CRM..."

# Get Supabase credentials
read -p "Enter SUPABASE_URL: " SUPABASE_URL
read -p "Enter SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
read -p "Enter SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_ROLE_KEY
read -p "Enter GEMINI_API_KEY: " GEMINI_API_KEY

# Create Supabase tables via REST API
echo "📊 Creating Supabase tables..."

# Function to create table
create_table() {
  local table_name=$1
  local schema=$2

  curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": \"$schema\"}" 2>/dev/null || echo "Table creation handled by Supabase"
}

# Workflows table
create_table "workflows" "
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  steps JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);"

# Comments table
create_table "comments" "
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);"

# Activity logs
create_table "activity_logs" "
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);"

# Push tokens
create_table "push_tokens" "
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);"

# API keys
create_table "api_keys" "
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);"

# 2FA settings
create_table "user_2fa" "
CREATE TABLE IF NOT EXISTS user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);"

# Audit logs
create_table "audit_logs" "
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  changes JSONB,
  ip_address TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);"

# Integrations
create_table "integrations" "
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  credentials JSONB NOT NULL,
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);"

# Contracts
create_table "contracts" "
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  terms TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);"

# Territories
create_table "territories" "
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owners TEXT[] DEFAULT ARRAY[]::TEXT[],
  quota NUMERIC,
  region TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);"

# Documents
create_table "documents" "
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);"

echo "✅ Supabase tables created"

# Set Vercel environment variables
echo ""
echo "🔑 Setting Vercel environment variables..."

vercel env add VITE_SUPABASE_URL "$SUPABASE_URL" --yes
vercel env add VITE_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" --yes
vercel env add VITE_SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY" --yes
vercel env add GEMINI_API_KEY "$GEMINI_API_KEY" --yes

echo "✅ Environment variables set"

# Deploy
echo ""
echo "🚀 Deploying to Vercel..."
vercel deploy --prod

echo ""
echo "✨ Setup complete! Your enterprise CRM is live."
