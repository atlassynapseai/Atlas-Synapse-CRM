# Quick Setup Guide

## 3-Step Deploy

### Step 1: Run Setup Script
```bash
node setup.mjs
```

**Prompts:**
- `SUPABASE_URL` - Get from Supabase project settings
- `SUPABASE_ANON_KEY` - Get from Supabase project settings  
- `SUPABASE_SERVICE_ROLE_KEY` - Get from Supabase project settings
- `GEMINI_API_KEY` - Your Gemini/Claude API key

This creates all 12 Supabase tables + sets Vercel env vars.

### Step 2: Deploy
```bash
vercel deploy --prod
```

Or script will auto-deploy if you answer yes.

### Step 3: Configure Integrations (Optional)

**Slack:**
- Get webhook URL from Slack app settings
- Use `/api/integrations` to add credentials

**Stripe:**
- Get API key from Stripe dashboard
- Use `/api/integrations` to add credentials

**Google Calendar:**
- Setup OAuth in Google Cloud Console
- Use `/api/integrations` to add access token

---

## What Gets Created

**Supabase Tables (12 total):**
- workflows, comments, activity_logs
- push_tokens, api_keys, user_2fa
- audit_logs, integrations
- contracts, territories, documents
- custom_fields, webhook_logs

**Vercel Env Vars:**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_SERVICE_ROLE_KEY
- GEMINI_API_KEY

---

## Manual Setup (If Script Fails)

**Supabase SQL Editor:**
Copy each CREATE TABLE from `setup.mjs` and run.

**Vercel CLI:**
```bash
vercel env add VITE_SUPABASE_URL https://xxx.supabase.co --yes
vercel env add VITE_SUPABASE_ANON_KEY xxxxx --yes
vercel env add VITE_SUPABASE_SERVICE_ROLE_KEY xxxxx --yes
vercel env add GEMINI_API_KEY xxxxx --yes
vercel deploy --prod
```

---

## Access After Deploy

- **CRM:** https://atlassynapseai.com/Atlas-Synapse-CRM
- **API Docs:** See `API_DOCS.md`
- **Pitch Site:** https://atlassynapseai.com

---

## Done ✅

Your enterprise CRM now has:
- ✅ 10 complete development phases
- ✅ 25+ API endpoints
- ✅ AI-powered intelligence
- ✅ Automation workflows
- ✅ Integrations framework
- ✅ Team collaboration
- ✅ Advanced analytics
- ✅ Mobile ready
- ✅ Enterprise security
- ✅ Developer API
- ✅ Advanced views
- ✅ Custom features

Go live in 3 commands.
