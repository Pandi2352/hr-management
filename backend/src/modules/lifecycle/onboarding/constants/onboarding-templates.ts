export interface TemplateTaskDefinition {
  title: string;
  description: string;
  category: 'HR' | 'IT' | 'MANAGER' | 'EMPLOYEE';
  isMandatory: boolean;
  dueDaysFromJoining: number; // e.g. -3 means 3 days before joining date, +1 means 1 day after
}

export const DEFAULT_ENTERPRISE_ONBOARDING_TASKS: TemplateTaskDefinition[] = [
  // 1. HR Operations & Compliance
  {
    title: 'Identity & Statutory ID Verification',
    description: 'Verify government ID, passport, or national identity card uploaded by the candidate.',
    category: 'HR',
    isMandatory: true,
    dueDaysFromJoining: -2,
  },
  {
    title: 'Employment Contract & Signed Offer Acceptance',
    description: 'Ensure signed offer letter, appointment contract, and confidentiality/NDA agreements are archived.',
    category: 'HR',
    isMandatory: true,
    dueDaysFromJoining: -1,
  },
  {
    title: 'Background Verification (BGV) Clearance',
    description: 'Initiate and review third-party education, past employment, and criminal background checks.',
    category: 'HR',
    isMandatory: true,
    dueDaysFromJoining: 7,
  },

  // 2. IT Operations & Hardware Access
  {
    title: 'Hardware & Workstation Laptop Provisioning',
    description: 'Configure corporate workstation laptop, assign inventory asset tag, and coordinate delivery.',
    category: 'IT',
    isMandatory: true,
    dueDaysFromJoining: -2,
  },
  {
    title: 'Corporate Email & Identity SSO Setup',
    description: 'Provision corporate Google Workspace / Microsoft 365 identity, Slack, and central SSO.',
    category: 'IT',
    isMandatory: true,
    dueDaysFromJoining: -1,
  },
  {
    title: 'Security VPN & Departmental Tool Access',
    description: 'Issue Zero-Trust VPN credentials, GitHub/Jira organization invites, and role-based permissions.',
    category: 'IT',
    isMandatory: false,
    dueDaysFromJoining: 1,
  },

  // 3. Reporting Manager & Team Integration
  {
    title: 'Assign Onboarding Buddy / Peer Mentor',
    description: 'Designate a senior team member to guide the new joiner through team workflows and initial setup.',
    category: 'MANAGER',
    isMandatory: true,
    dueDaysFromJoining: -1,
  },
  {
    title: 'Define First 30-Day Goals & Welcome 1:1',
    description: 'Schedule Day 1 introduction meeting, share team roadmap, and outline first 30-day milestone objectives.',
    category: 'MANAGER',
    isMandatory: true,
    dueDaysFromJoining: 2,
  },

  // 4. New Employee Self-Service
  {
    title: 'Submit Bank Account & Payroll Credentials',
    description: 'Enter corporate salary bank account details, IFSC/routing code, and attach voided cheque proof.',
    category: 'EMPLOYEE',
    isMandatory: true,
    dueDaysFromJoining: 1,
  },
  {
    title: 'Review & Sign Company Policies & Handbook',
    description: 'Read and digitally acknowledge corporate IT security, code of conduct, and anti-harassment policies.',
    category: 'EMPLOYEE',
    isMandatory: true,
    dueDaysFromJoining: 3,
  },
];
