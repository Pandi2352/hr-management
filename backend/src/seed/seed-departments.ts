import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { generateUuid } from '../common/utils/uuid.util';

dotenv.config({ path: ['.env', '../.env'] });

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/peopleos';

async function seedDepartments() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection not established');

  const orgsCollection = db.collection<any>('organizations');
  const deptsCollection = db.collection<any>('departments');
  const costCentersCollection = db.collection<any>('cost_centers');

  // 1. Ensure default organization exists
  let org = await orgsCollection.findOne({ isDeleted: false });
  if (!org) {
    const newOrg = {
      _id: generateUuid(),
      legalName: 'PeopleOS Technologies Inc.',
      tradeName: 'PeopleOS Global',
      registrationCode: 'REG-2026-HRM01',
      taxId: 'US-EIN-98-7654321',
      corporateEmail: 'operations@peopleos.internal',
      phone: '+1 (555) 234-5678',
      website: 'https://peopleos.internal',
      timezone: 'Asia/Kolkata',
      currency: 'USD',
      fiscalYearStartMonth: 'January',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await orgsCollection.insertOne(newOrg);
    org = newOrg;
    console.log('✅ Created default organization');
  }

  const orgId = String(org._id);

  // 2. Ensure initial Cost Centers exist for allocation
  const sampleCostCenters = [
    { code: 'CC-ENG-101', name: 'Engineering & R&D' },
    { code: 'CC-OPS-201', name: 'Operations & Infrastructure' },
    { code: 'CC-GNA-301', name: 'General & Administrative' },
    { code: 'CC-SMM-401', name: 'Sales & Marketing' },
    { code: 'CC-CST-501', name: 'Customer Success & Support' },
  ];

  const ccMap = new Map<string, string>();
  for (const cc of sampleCostCenters) {
    let existingCC = await costCentersCollection.findOne({
      organizationId: orgId,
      code: cc.code,
    });
    if (!existingCC) {
      const newCC = {
        _id: generateUuid(),
        organizationId: orgId,
        code: cc.code,
        name: cc.name,
        departmentId: null,
        description: `Financial budget ledger for ${cc.name}`,
        status: 'ACTIVE',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await costCentersCollection.insertOne(newCC);
      existingCC = newCC;
    }
    ccMap.set(cc.code, String(existingCC._id));
  }

  // 3. Clear existing departments for this org to cleanly insert the 15 enterprise hierarchy departments
  await deptsCollection.deleteMany({ organizationId: orgId });
  console.log('Cleared existing departments to apply fresh 15 enterprise hierarchy dataset.');

  // Tier 1: Top-Level Functional Divisions
  const engId = generateUuid();
  const prodId = generateUuid();
  const itOpsId = generateUuid();
  const salesId = generateUuid();
  const hrId = generateUuid();
  const financeId = generateUuid();

  // Tier 2: Sub-Departments under Divisions
  const feId = generateUuid();
  const beId = generateUuid();
  const devOpsId = generateUuid();
  const qaId = generateUuid();
  const secOpsId = generateUuid();
  const talentId = generateUuid();
  const payrollId = generateUuid();
  const csId = generateUuid();
  const legalId = generateUuid();

  const departmentsData = [
    // 1. Engineering Division
    {
      _id: engId,
      organizationId: orgId,
      name: 'Engineering',
      code: 'ENG',
      parentId: null,
      costCenterId: ccMap.get('CC-ENG-101'),
      memberCount: 84,
      description: 'Core product engineering, software architecture, and technical innovation across platforms.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 2. Frontend Engineering (under Engineering)
    {
      _id: feId,
      organizationId: orgId,
      name: 'Frontend Engineering',
      code: 'ENG-FE',
      parentId: engId,
      costCenterId: ccMap.get('CC-ENG-101'),
      memberCount: 28,
      description: 'Web applications, design systems, and client-facing user interfaces.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 3. Backend & Cloud APIs (under Engineering)
    {
      _id: beId,
      organizationId: orgId,
      name: 'Backend & APIs',
      code: 'ENG-BE',
      parentId: engId,
      costCenterId: ccMap.get('CC-ENG-101'),
      memberCount: 34,
      description: 'Microservices architecture, data persistence, and enterprise REST/GraphQL APIs.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 4. Quality Assurance & Automation (under Engineering)
    {
      _id: qaId,
      organizationId: orgId,
      name: 'Quality Assurance & Testing',
      code: 'ENG-QA',
      parentId: engId,
      costCenterId: ccMap.get('CC-ENG-101'),
      memberCount: 12,
      description: 'End-to-end automated testing, load benchmarking, and release quality verification.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 5. Cloud Infrastructure & DevOps (under Engineering)
    {
      _id: devOpsId,
      organizationId: orgId,
      name: 'Cloud Infrastructure & DevOps',
      code: 'ENG-OPS',
      parentId: engId,
      costCenterId: ccMap.get('CC-OPS-201'),
      memberCount: 10,
      description: 'Container orchestration, CI/CD pipelines, and high-availability cloud infrastructure.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 6. Product Management & Design
    {
      _id: prodId,
      organizationId: orgId,
      name: 'Product & Design',
      code: 'PROD',
      parentId: null,
      costCenterId: ccMap.get('CC-ENG-101'),
      memberCount: 18,
      description: 'Product lifecycle strategy, UX research, wireframing, and user design systems.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 7. Information Technology & Security
    {
      _id: itOpsId,
      organizationId: orgId,
      name: 'Information Technology & Security',
      code: 'IT-SEC',
      parentId: null,
      costCenterId: ccMap.get('CC-OPS-201'),
      memberCount: 14,
      description: 'Workplace IT infrastructure, identity access management, hardware provisioning, and security posture.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 8. Cybersecurity & Compliance (under IT & Security)
    {
      _id: secOpsId,
      organizationId: orgId,
      name: 'Cybersecurity & Compliance',
      code: 'IT-CYBER',
      parentId: itOpsId,
      costCenterId: ccMap.get('CC-OPS-201'),
      memberCount: 6,
      description: 'Threat modeling, incident response, SOC2 compliance audits, and data governance.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 9. Human Resources & People Operations
    {
      _id: hrId,
      organizationId: orgId,
      name: 'Human Resources & People Ops',
      code: 'HR',
      parentId: null,
      costCenterId: ccMap.get('CC-GNA-301'),
      memberCount: 16,
      description: 'Workforce management, workplace policies, employee engagement, and employee lifecycle.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 10. Talent Acquisition (under HR)
    {
      _id: talentId,
      organizationId: orgId,
      name: 'Talent Acquisition & Sourcing',
      code: 'HR-TALENT',
      parentId: hrId,
      costCenterId: ccMap.get('CC-GNA-301'),
      memberCount: 9,
      description: 'Global talent sourcing, technical interviewing pipelines, and university hiring programs.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 11. Finance & Accounting
    {
      _id: financeId,
      organizationId: orgId,
      name: 'Finance & Accounting',
      code: 'FIN',
      parentId: null,
      costCenterId: ccMap.get('CC-GNA-301'),
      memberCount: 11,
      description: 'Financial forecasting, corporate treasury, general ledger management, and accounts payable.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 12. Payroll & Compensation (under Finance)
    {
      _id: payrollId,
      organizationId: orgId,
      name: 'Payroll & Benefits Administration',
      code: 'FIN-PAY',
      parentId: financeId,
      costCenterId: ccMap.get('CC-GNA-301'),
      memberCount: 5,
      description: 'Monthly payroll cycles, statutory withholdings, employee compensation, and bonus allocations.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 13. Sales & Business Development
    {
      _id: salesId,
      organizationId: orgId,
      name: 'Sales & Business Development',
      code: 'SALES',
      parentId: null,
      costCenterId: ccMap.get('CC-SMM-401'),
      memberCount: 38,
      description: 'Corporate client acquisition, enterprise solution sales, and strategic business partnerships.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 14. Customer Success & Client Support
    {
      _id: csId,
      organizationId: orgId,
      name: 'Customer Success & Support',
      code: 'CS',
      parentId: null,
      costCenterId: ccMap.get('CC-CST-501'),
      memberCount: 26,
      description: 'Account management, SLA compliance, client onboarding, and 24/7 technical customer support.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 15. Legal & Corporate Governance
    {
      _id: legalId,
      organizationId: orgId,
      name: 'Legal & Corporate Affairs',
      code: 'LEGAL',
      parentId: null,
      costCenterId: ccMap.get('CC-GNA-301'),
      memberCount: 4,
      description: 'Commercial contracts, corporate compliance, intellectual property trademarks, and regulatory affairs.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await deptsCollection.insertMany(departmentsData);

  console.log('----------------------------------------------------');
  console.log(`✅ Successfully seeded 15 enterprise departments for organization [${org.legalName}]`);
  console.log('   - 7 Top-Level Divisions (ENG, PROD, IT-SEC, HR, FIN, SALES, CS, LEGAL)');
  console.log('   - 7 Sub-Departments with Parent/Child Hierarchy (ENG-FE, ENG-BE, ENG-QA, ENG-OPS, IT-CYBER, HR-TALENT, FIN-PAY)');
  console.log('   - Ready for IT companies, consultancies, and multi-disciplinary organizations');
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
}

seedDepartments().catch((err) => {
  console.error('❌ Error seeding departments:', err);
  process.exit(1);
});
