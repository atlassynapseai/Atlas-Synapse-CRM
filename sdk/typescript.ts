// SDK for Atlas Synapse CRM
// Usage: const crm = new AtlasSynapseCRM('api-key-here');

interface APIConfig {
  apiKey: string;
  baseUrl?: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  value?: number;
  stage?: string;
}

export class AtlasSynapseCRM {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: string | APIConfig) {
    if (typeof config === 'string') {
      this.apiKey = config;
      this.baseUrl = 'https://atlas-synapse-crm.vercel.app/api';
    } else {
      this.apiKey = config.apiKey;
      this.baseUrl = config.baseUrl || 'https://atlas-synapse-crm.vercel.app/api';
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  // Leads API
  async getLeads(filter?: any) {
    return this.request('/fetch-leads');
  }

  async getLead(id: string) {
    return this.request(`/leads/${id}`);
  }

  async createLead(lead: Partial<Lead>) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  }

  async updateLead(id: string, updates: Partial<Lead>) {
    return this.request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteLead(id: string) {
    return this.request(`/leads/${id}`, { method: 'DELETE' });
  }

  // AI Scoring API
  async scoreLead(id: string) {
    return this.request('/ai-score-lead', {
      method: 'POST',
      body: JSON.stringify({ leadId: id }),
    });
  }

  // Analytics API
  async getAnalytics() {
    return this.request('/analytics');
  }

  // Workflows API
  async executeWorkflow(workflowId: string, leadId: string) {
    return this.request('/execute-workflow', {
      method: 'POST',
      body: JSON.stringify({ workflowId, leadId }),
    });
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AtlasSynapseCRM;
}
