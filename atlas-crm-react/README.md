# Atlas Synapse — Forensic Growth Engine CRM

## Overview
This is the CGO Console CRM for Atlas Synapse. Built with React, TypeScript, Tailwind CSS v4, Framer Motion, and Recharts. Matches the AI Studio design exactly.

## Tech Stack
- React 19 + TypeScript
- Tailwind CSS v4 (via Vite plugin)
- Framer Motion (page transitions + micro-interactions)
- Recharts (bar charts, funnel charts)
- Lucide React (icons)
- Vite (build tool)

## Setup Instructions (Steve)

### 1. Install dependencies
```bash
npm install
```

### 2. Run in development
```bash
npm run dev
```
Opens at http://localhost:3000

### 3. Build for production
```bash
npm run build
```
Output goes to `/dist` — deploy this folder to any static host.

## Supabase Integration (Steve — connect to backend)

The CRM currently uses localStorage for data persistence. To connect to the Supabase leads table:

1. Create a `.env` file in the project root:
```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

2. Install the Supabase client:
```bash
npm install @supabase/supabase-js
```

3. In `src/components/CRMDashboard.tsx`, replace the `loadLeads` and `saveLeads` functions with Supabase calls using the leads table already set up per the Steve Technical Guidance page in Notion.

## Deployment Options

### Vercel (recommended — free, instant)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Drag and drop /dist folder to netlify.com/drop
```

### Self-hosted (AWS S3 + CloudFront)
```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name
```

## Features
- Overview dashboard with pipeline stats and charts
- Contacts table with search, filter, and click-to-open modal
- Pipeline kanban board across 6 stages + funnel view
- Add Lead intake form with forensic risk scoring
- Forensic Audit view with GDPR/EU AI Act liability analysis
- CSV export
- Local storage persistence (replace with Supabase for production)

---
© 2026 Atlas Synapse LLC · CONFIDENTIAL — INTERNAL USE ONLY
