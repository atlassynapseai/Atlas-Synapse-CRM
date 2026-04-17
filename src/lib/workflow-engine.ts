import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface WorkflowStep {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  name: string;
  config: Record<string, any>;
  nextStepId?: string;
}

interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  active: boolean;
  createdAt: string;
}

interface AutomationResult {
  success: boolean;
  message: string;
  executedSteps: string[];
}

// Execute workflow for a lead
export async function executeWorkflow(
  workflow: Workflow,
  lead: any
): Promise<AutomationResult> {
  const executedSteps: string[] = [];
  let currentStepId = workflow.steps[0]?.id;

  while (currentStepId) {
    const step = workflow.steps.find((s) => s.id === currentStepId);
    if (!step) break;

    try {
      if (step.type === 'trigger') {
        console.log(`Triggered: ${step.name}`);
        executedSteps.push(step.name);
      } else if (step.type === 'condition') {
        const condition = evaluateCondition(step.config, lead);
        if (!condition) break;
        executedSteps.push(`Condition: ${step.name}`);
      } else if (step.type === 'action') {
        await executeAction(step, lead);
        executedSteps.push(`Executed: ${step.name}`);
      }

      currentStepId = step.nextStepId;
    } catch (error) {
      console.error(`Error executing step ${step.name}:`, error);
      break;
    }
  }

  return {
    success: true,
    message: `Workflow "${workflow.name}" completed`,
    executedSteps,
  };
}

function evaluateCondition(
  config: Record<string, any>,
  lead: any
): boolean {
  const { field, operator, value } = config;
  const leadValue = lead[field];

  switch (operator) {
    case 'equals':
      return leadValue === value;
    case 'contains':
      return String(leadValue).includes(value);
    case 'greaterThan':
      return Number(leadValue) > Number(value);
    case 'lessThan':
      return Number(leadValue) < Number(value);
    default:
      return true;
  }
}

async function executeAction(step: WorkflowStep, lead: any): Promise<void> {
  const { actionType, template } = step.config;

  switch (actionType) {
    case 'send_email':
      console.log(`Sending email to ${lead.email}: ${template}`);
      break;
    case 'send_slack':
      console.log(`Sending Slack: ${template}`);
      break;
    case 'create_task':
      console.log(`Creating task: ${template}`);
      break;
    case 'update_field':
      console.log(`Updating ${step.config.field} to ${step.config.value}`);
      break;
  }
}

// Suggest workflow using Claude
export async function suggestWorkflow(
  description: string
): Promise<Workflow> {
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Create a JSON workflow for this scenario: "${description}"

Format:
{
  "name": "workflow name",
  "steps": [
    {"id": "s1", "type": "trigger", "name": "name", "config": {}, "nextStepId": "s2"},
    {"id": "s2", "type": "condition", "name": "name", "config": {"field": "stage", "operator": "equals", "value": "New"}, "nextStepId": "s3"},
    {"id": "s3", "type": "action", "name": "name", "config": {"actionType": "send_email", "template": "Welcome"}, "nextStepId": null}
  ]
}

Return ONLY valid JSON.`,
      },
    ],
  });

  const response =
    message.content[0].type === 'text' ? message.content[0].text : '{}';

  try {
    const workflowData = JSON.parse(response);
    return {
      id: `wf_${Date.now()}`,
      name: workflowData.name || 'Untitled Workflow',
      steps: workflowData.steps || [],
      active: true,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return {
      id: `wf_${Date.now()}`,
      name: 'Default Workflow',
      steps: [],
      active: false,
      createdAt: new Date().toISOString(),
    };
  }
}
