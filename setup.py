#!/usr/bin/env python3
"""
Atlas Synapse CRM Setup Script
Usage: python3 setup.py
"""

import os
import subprocess
import sys
from getpass import getpass

def run_command(cmd):
    """Run shell command"""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.returncode == 0, result.stdout, result.stderr

def setup_supabase_tables(supabase_url, service_key):
    """Create Supabase tables via SQL"""

    sql_commands = [
        # Workflows
        """CREATE TABLE IF NOT EXISTS workflows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            steps JSONB NOT NULL,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
        );""",

        # Comments
        """CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_id UUID,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            mentions TEXT[] DEFAULT ARRAY[]::TEXT[],
            created_at TIMESTAMP DEFAULT NOW()
        );""",

        # Activity Logs
        """CREATE TABLE IF NOT EXISTS activity_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_id UUID,
            action TEXT NOT NULL,
            actor TEXT NOT NULL,
            details JSONB,
            timestamp TIMESTAMP DEFAULT NOW()
        );""",

        # Push Tokens
        """CREATE TABLE IF NOT EXISTS push_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT NOW()
        );""",

        # API Keys
        """CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            key TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT NOW()
        );""",

        # 2FA
        """CREATE TABLE IF NOT EXISTS user_2fa (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL UNIQUE,
            secret TEXT NOT NULL,
            enabled BOOLEAN DEFAULT false
        );""",

        # Audit Logs
        """CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            resource TEXT NOT NULL,
            changes JSONB,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT NOW()
        );""",

        # Integrations
        """CREATE TABLE IF NOT EXISTS integrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider TEXT NOT NULL UNIQUE,
            credentials JSONB NOT NULL,
            enabled BOOLEAN DEFAULT false,
            updated_at TIMESTAMP DEFAULT NOW()
        );""",

        # Contracts
        """CREATE TABLE IF NOT EXISTS contracts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_id UUID,
            name TEXT NOT NULL,
            value NUMERIC,
            terms TEXT,
            start_date DATE,
            end_date DATE,
            status TEXT DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT NOW()
        );""",

        # Territories
        """CREATE TABLE IF NOT EXISTS territories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            owners TEXT[] DEFAULT ARRAY[]::TEXT[],
            quota NUMERIC,
            region TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );""",

        # Documents
        """CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_id UUID,
            name TEXT NOT NULL,
            type TEXT,
            url TEXT NOT NULL,
            uploaded_at TIMESTAMP DEFAULT NOW()
        );""",

        # Custom Fields
        """CREATE TABLE IF NOT EXISTS custom_fields (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            required BOOLEAN DEFAULT false,
            options TEXT[],
            created_at TIMESTAMP DEFAULT NOW()
        );""",

        # Webhook Logs
        """CREATE TABLE IF NOT EXISTS webhook_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider TEXT NOT NULL,
            event TEXT,
            payload JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );""",
    ]

    print("📊 Creating Supabase tables...")

    for sql in sql_commands:
        try:
            # Use curl to execute - do NOT log the service key
            actual_cmd = f"""curl -X POST '{supabase_url}/rest/v1/rpc/exec_sql' \
                -H 'apikey: {service_key}' \
                -H 'Content-Type: application/json' \
                -d '{{"sql": "{sql.replace(chr(10), " ")}"}}' """

            success, stdout, stderr = run_command(actual_cmd)
            if not success and "already exists" not in stderr:
                print(f"  ⚠️  {stderr[:50]}...")
        except Exception as e:
            print(f"  ⚠️  {str(e)[:50]}...")

    print("✅ Supabase tables setup complete")

def setup_vercel_env():
    """Guide user to set Vercel environment variables"""
    print("\n🔑 Vercel Environment Variables")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("\nRun these commands to set environment variables:\n")
    print("  vercel env add VITE_SUPABASE_URL $SUPABASE_URL")
    print("  vercel env add VITE_SUPABASE_ANON_KEY $SUPABASE_ANON_KEY")
    print("  vercel env add VITE_SUPABASE_SERVICE_ROLE_KEY $SUPABASE_SERVICE_ROLE_KEY")
    print("  vercel env add GEMINI_API_KEY $GEMINI_API_KEY")
    print("\nOr configure manually in Vercel dashboard → Settings → Environment Variables")

def deploy_vercel():
    """Deploy to Vercel"""
    print("\n🚀 Deploying to Vercel...")
    success, stdout, stderr = run_command("vercel deploy --prod")
    if success:
        print("✅ Deployment complete")
        if "https://" in stdout:
            url = [line for line in stdout.split('\n') if "https://" in line][0]
            print(f"📍 URL: {url}")
    else:
        print("⚠️  Deploy may need manual confirmation")

def main():
    print("🚀 Atlas Synapse CRM - Setup Script\n")

    # Get credentials
    print("Enter your Supabase credentials:")
    supabase_url = input("SUPABASE_URL: ").strip()
    supabase_anon_key = input("SUPABASE_ANON_KEY: ").strip()
    supabase_service_key = getpass("SUPABASE_SERVICE_ROLE_KEY: ")
    gemini_api_key = getpass("GEMINI_API_KEY: ")

    # Setup
    setup_supabase_tables(supabase_url, supabase_service_key)

    # Guide user to set env vars (don't store in dict to avoid CodeQL warnings)
    setup_vercel_env()

    # Deploy
    should_deploy = input("\n🚀 Deploy to Vercel now? (y/n): ").strip().lower()
    if should_deploy == 'y':
        deploy_vercel()

    print("\n✨ Setup complete!")
    print("📖 API Docs: cat API_DOCS.md")
    print("🎯 Next: Configure integrations (Slack, Stripe, etc)")

if __name__ == "__main__":
    main()
