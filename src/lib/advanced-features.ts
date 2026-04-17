interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

interface Contract {
  id: string;
  leadId: string;
  name: string;
  value: number;
  terms: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'pending' | 'signed' | 'active' | 'expired';
}

interface Territory {
  id: string;
  name: string;
  owners: string[];
  quota: number;
  region?: string;
}

interface Document {
  id: string;
  leadId: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
}

// Custom fields management
export async function createCustomField(field: CustomField): Promise<boolean> {
  console.log('Creating custom field:', field.name);
  return true;
}

export async function getCustomFields(): Promise<CustomField[]> {
  return [
    {
      id: 'cf_1',
      name: 'Industry Vertical',
      type: 'select',
      required: true,
      options: ['SaaS', 'Healthcare', 'Finance', 'Retail'],
    },
    {
      id: 'cf_2',
      name: 'ARR',
      type: 'number',
      required: false,
    },
  ];
}

// Contracts management
export async function createContract(contract: Contract): Promise<Contract> {
  console.log('Contract created:', contract.name);
  return { ...contract, id: `contract_${Date.now()}` };
}

export async function renewContract(contractId: string): Promise<boolean> {
  console.log('Renewing contract:', contractId);
  return true;
}

// Territory management
export async function createTerritory(territory: Territory): Promise<Territory> {
  console.log('Territory created:', territory.name);
  return { ...territory, id: `territory_${Date.now()}` };
}

export async function assignTerritory(
  territoryId: string,
  userId: string
): Promise<boolean> {
  console.log(`Assigning territory ${territoryId} to user ${userId}`);
  return true;
}

// Document management
export async function uploadDocument(
  leadId: string,
  file: File
): Promise<Document> {
  // In production: upload to cloud storage
  return {
    id: `doc_${Date.now()}`,
    leadId,
    name: file.name,
    type: file.type,
    url: URL.createObjectURL(file),
    uploadedAt: new Date().toISOString(),
  };
}

// Hierarchies & org structure
export interface OrgHierarchy {
  userId: string;
  reportingTo?: string;
  directReports: string[];
  role: string;
  quota?: number;
}

export async function buildOrgHierarchy(
  users: any[]
): Promise<Record<string, OrgHierarchy>> {
  const hierarchy: Record<string, OrgHierarchy> = {};

  users.forEach((user) => {
    hierarchy[user.id] = {
      userId: user.id,
      reportingTo: user.manager_id,
      directReports: users
        .filter((u) => u.manager_id === user.id)
        .map((u) => u.id),
      role: user.role,
      quota: user.quota,
    };
  });

  return hierarchy;
}
