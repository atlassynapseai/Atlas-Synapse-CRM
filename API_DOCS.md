# Atlas Synapse CRM - Developer API

## Authentication

```bash
curl -H "X-API-Key: atlas_xxxxx" https://atlas-synapse-crm.vercel.app/api/fetch-leads
```

## REST Endpoints

### Leads

**GET** `/api/fetch-leads`
- List all leads
- Response: `{ leads: Lead[] }`

**POST** `/api/leads`
- Create new lead
- Body: `{ name, email, company, value }`

**GET** `/api/leads/{id}`
- Get single lead
- Response: `{ lead: Lead }`

**PUT** `/api/leads/{id}`
- Update lead
- Body: `{ ...updates }`

**DELETE** `/api/leads/{id}`
- Delete lead

### AI & Scoring

**POST** `/api/ai-score-lead`
- Score a lead using AI
- Body: `{ leadId }`
- Response: `{ scoring, actions }`

**GET** `/api/predict-churn`
- Get churn predictions
- Response: `{ predictions: ChurnRisk[] }`

**GET** `/api/deal-probability`
- Get deal win probability
- Response: `{ deals: DealProbability[] }`

### Workflows

**POST** `/api/execute-workflow`
- Execute workflow for lead
- Body: `{ workflowId, leadId }`

### Analytics

**GET** `/api/analytics`
- Get analytics dashboard data
- Response: `{ metrics, territories, forecasts }`

### Integrations

**GET** `/api/integrations`
- List configured integrations

**POST** `/api/integrations`
- Configure integration
- Body: `{ provider, credentials, enabled }`

### Security

**POST** `/api/security`
- 2FA setup, permissions, audit logs
- Body: `{ action, userId, ... }`

## TypeScript SDK

```typescript
import { AtlasSynapseCRM } from '@atlas-synapse/sdk';

const crm = new AtlasSynapseCRM('atlas_xxxxx');

// Get leads
const leads = await crm.getLeads();

// Create lead
const lead = await crm.createLead({
  name: 'John Doe',
  email: 'john@example.com',
  company: 'ACME Corp'
});

// Score lead
const score = await crm.scoreLead(lead.id);

// Get analytics
const analytics = await crm.getAnalytics();
```

## Webhooks

Configure webhooks at `/api/webhooks`

Supported providers:
- Stripe
- Zapier
- Custom

## Rate Limits

- 1000 requests/hour per API key
- 10 requests/second max burst

## Support

- Docs: https://atlas-synapse-crm.vercel.app/docs
- Status: https://atlas-synapse-crm.vercel.app/status
- Email: api@atlassynapseai.com
