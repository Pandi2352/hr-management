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
  const itCostCenters = [
    { code: 'CC-TECH-01', name: 'Core Technology & R&D', description: 'Software architecture, core platform development, and research & development investments.' },
    { code: 'CC-AI-02', name: 'Artificial Intelligence & Machine Learning', description: 'Generative AI models, neural compute infrastructure, LLM pipelines, and AI initiatives.' },
    { code: 'CC-CLOUD-03', name: 'Cloud & Infrastructure Services', description: 'AWS, Azure, GCP infrastructure, Kubernetes hosting, and multi-region networking.' },
    { code: 'CC-QA-04', name: 'Quality Assurance & Automation', description: 'Test automation frameworks, performance benchmarking, and QA lifecycle management.' },
    { code: 'CC-PROD-05', name: 'Product Management & Design', description: 'Product strategy, roadmap development, UX research, and UI design systems.' },
    { code: 'CC-SALES-06', name: 'Enterprise Sales & Business Development', description: 'Client acquisition, commercial software licensing, enterprise solutions, and deals.' },
    { code: 'CC-MKT-07', name: 'Marketing & Brand Strategy', description: 'Developer evangelism, tech marketing, event sponsorships, and brand growth.' },
    { code: 'CC-PEOPLE-08', name: 'People Operations & Talent Acquisition', description: 'Tech hiring, global talent sourcing, HR operations, and employee engagement.' },
    { code: 'CC-FIN-09', name: 'Finance, Legal & Corporate Governance', description: 'Statutory compliance, financial reporting, corporate treasury, and legal affairs.' },
    { code: 'CC-IT-10', name: 'Internal IT & Workplace Services', description: 'Laptops, office tech, SaaS subscriptions, internal helpdesk, and corporate security.' },
    { code: 'CC-EXEC-11', name: 'Executive Leadership & Strategy', description: 'C-Suite operations, executive strategic planning, and corporate governance.' },
  ];

  const ccMap = new Map<string, string>();
  for (const cc of itCostCenters) {
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
        description: cc.description,
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

  // 3. Clear existing departments for this org to cleanly insert the 17 IT hierarchy departments
  await deptsCollection.deleteMany({ organizationId: orgId });
  console.log('Cleared existing departments to apply fresh 17 IT hierarchy dataset.');

  // Tier 1: Top-Level Functional Divisions
  const engDivisionId = generateUuid();
  const aiDataDivisionId = generateUuid();
  const prodDesignDivisionId = generateUuid();
  const cloudInfraDivisionId = generateUuid();
  const qaDivisionId = generateUuid();
  const itSecDivisionId = generateUuid();
  const salesMktDivisionId = generateUuid();
  const corpOpsDivisionId = generateUuid();

  // Tier 2: Specialized Sub-Departments under Top-Level Divisions
  const feDeptId = generateUuid();
  const beDeptId = generateUuid();
  const mobileDeptId = generateUuid();
  const mlEngDeptId = generateUuid();
  const dataEngDeptId = generateUuid();
  const devopsDeptId = generateUuid();
  const talentAcqDeptId = generateUuid();
  const peopleOpsDeptId = generateUuid();
  const financeLegalDeptId = generateUuid();

  const departmentsData = [
    // 1. Software Engineering Division (Parent)
    {
      _id: engDivisionId,
      organizationId: orgId,
      name: 'Software Engineering',
      code: 'ENG',
      parentId: null,
      costCenterId: ccMap.get('CC-TECH-01'),
      memberCount: 0,
      description: 'Core product engineering, software architecture, distributed systems, and technical platform delivery.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 2. Frontend Engineering (Child of Software Engineering)
    {
      _id: feDeptId,
      organizationId: orgId,
      name: 'Frontend Engineering',
      code: 'ENG-FE',
      parentId: engDivisionId,
      costCenterId: ccMap.get('CC-TECH-01'),
      memberCount: 0,
      description: 'Web client applications, responsive interfaces, micro-frontends, and component design systems.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 3. Backend & Cloud APIs (Child of Software Engineering)
    {
      _id: beDeptId,
      organizationId: orgId,
      name: 'Backend & APIs',
      code: 'ENG-BE',
      parentId: engDivisionId,
      costCenterId: ccMap.get('CC-TECH-01'),
      memberCount: 0,
      description: 'Microservices architecture, high-throughput REST/GraphQL APIs, distributed persistence, and message queuing.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 4. Mobile Engineering (Child of Software Engineering)
    {
      _id: mobileDeptId,
      organizationId: orgId,
      name: 'Mobile Engineering',
      code: 'ENG-MOB',
      parentId: engDivisionId,
      costCenterId: ccMap.get('CC-TECH-01'),
      memberCount: 0,
      description: 'Cross-platform and native iOS & Android applications, mobile SDKs, and offline-first client architecture.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 5. Artificial Intelligence & Data Division (Parent)
    {
      _id: aiDataDivisionId,
      organizationId: orgId,
      name: 'AI & Data Engineering',
      code: 'AI-DATA',
      parentId: null,
      costCenterId: ccMap.get('CC-AI-02'),
      memberCount: 0,
      description: 'Artificial intelligence innovation, predictive modeling, machine learning pipelines, and big data lakehouse systems.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 6. Machine Learning & LLMs (Child of AI & Data)
    {
      _id: mlEngDeptId,
      organizationId: orgId,
      name: 'Machine Learning & LLMs',
      code: 'AI-ML',
      parentId: aiDataDivisionId,
      costCenterId: ccMap.get('CC-AI-02'),
      memberCount: 0,
      description: 'Deep learning models, generative AI integrations, neural network training, vector search, and model serving.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 7. Data Engineering & Analytics (Child of AI & Data)
    {
      _id: dataEngDeptId,
      organizationId: orgId,
      name: 'Data Engineering & Analytics',
      code: 'AI-DE',
      parentId: aiDataDivisionId,
      costCenterId: ccMap.get('CC-AI-02'),
      memberCount: 0,
      description: 'ETL/ELT data pipelines, Kafka streaming, cloud data warehousing, BI dashboards, and enterprise metrics.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 8. Product & UI/UX Design (Parent)
    {
      _id: prodDesignDivisionId,
      organizationId: orgId,
      name: 'Product & UI/UX Design',
      code: 'PROD-DES',
      parentId: null,
      costCenterId: ccMap.get('CC-PROD-05'),
      memberCount: 0,
      description: 'Product lifecycle strategy, roadmap formulation, UX research, wireframing, and interactive design systems.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 9. Cloud Infrastructure & DevOps Division (Parent)
    {
      _id: cloudInfraDivisionId,
      organizationId: orgId,
      name: 'Cloud Infrastructure & DevOps',
      code: 'CLOUD-OPS',
      parentId: null,
      costCenterId: ccMap.get('CC-CLOUD-03'),
      memberCount: 0,
      description: 'Multi-cloud architecture, site reliability engineering, Kubernetes clusters, and automated CI/CD deployment pipelines.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 10. Site Reliability Engineering (Child of Cloud & DevOps)
    {
      _id: devopsDeptId,
      organizationId: orgId,
      name: 'Site Reliability Engineering (SRE)',
      code: 'CLOUD-SRE',
      parentId: cloudInfraDivisionId,
      costCenterId: ccMap.get('CC-CLOUD-03'),
      memberCount: 0,
      description: '24/7 uptime observability, incident response, chaos engineering, disaster recovery, and infrastructure as code (IaC).',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 11. Quality Assurance & Testing Division (Parent)
    {
      _id: qaDivisionId,
      organizationId: orgId,
      name: 'Quality Assurance & Testing',
      code: 'QA',
      parentId: null,
      costCenterId: ccMap.get('CC-QA-04'),
      memberCount: 0,
      description: 'End-to-end automated testing, load and stress testing, regression suites, and release certification.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 12. Information Technology & Cybersecurity (Parent)
    {
      _id: itSecDivisionId,
      organizationId: orgId,
      name: 'Information Technology & Cybersecurity',
      code: 'IT-SEC',
      parentId: null,
      costCenterId: ccMap.get('CC-IT-10'),
      memberCount: 0,
      description: 'Enterprise IT infrastructure, zero-trust security architecture, identity management, and compliance audits.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 13. Sales, Marketing & Growth (Parent)
    {
      _id: salesMktDivisionId,
      organizationId: orgId,
      name: 'Sales & Marketing',
      code: 'SALES-MKT',
      parentId: null,
      costCenterId: ccMap.get('CC-SALES-06'),
      memberCount: 0,
      description: 'Enterprise client acquisition, commercial software contracts, developer advocacy, and brand marketing.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },

    // 14. Corporate Operations & People Division (Parent)
    {
      _id: corpOpsDivisionId,
      organizationId: orgId,
      name: 'Corporate & People Operations',
      code: 'CORP-OPS',
      parentId: null,
      costCenterId: ccMap.get('CC-PEOPLE-08'),
      memberCount: 0,
      description: 'Workplace management, human resources, finance, talent sourcing, and statutory corporate affairs.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 15. Talent Acquisition & Recruiting (Child of Corporate & People)
    {
      _id: talentAcqDeptId,
      organizationId: orgId,
      name: 'Talent Acquisition',
      code: 'CORP-TALENT',
      parentId: corpOpsDivisionId,
      costCenterId: ccMap.get('CC-PEOPLE-08'),
      memberCount: 0,
      description: 'Technical hiring pipelines, executive recruitment, campus tech drives, and onboarding coordination.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 16. Human Resources & People Experience (Child of Corporate & People)
    {
      _id: peopleOpsDeptId,
      organizationId: orgId,
      name: 'Human Resources & People Experience',
      code: 'CORP-HR',
      parentId: corpOpsDivisionId,
      costCenterId: ccMap.get('CC-PEOPLE-08'),
      memberCount: 0,
      description: 'Employee engagement, performance appraisals, workplace culture, benefits administration, and retention.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // 17. Finance, Payroll & Legal (Child of Corporate & People)
    {
      _id: financeLegalDeptId,
      organizationId: orgId,
      name: 'Finance, Payroll & Legal',
      code: 'CORP-FIN',
      parentId: corpOpsDivisionId,
      costCenterId: ccMap.get('CC-FIN-09'),
      memberCount: 0,
      description: 'Corporate ledger accounting, monthly payroll processing, taxation compliance, commercial contracts, and audits.',
      status: 'ACTIVE',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await deptsCollection.insertMany(departmentsData);

  console.log('----------------------------------------------------');
  console.log(`✅ Successfully seeded 17 IT enterprise departments for organization [${org.legalName}]`);
  console.log('   - 8 Top-Level Divisions (ENG, AI-DATA, PROD-DES, CLOUD-OPS, QA, IT-SEC, SALES-MKT, CORP-OPS)');
  console.log('   - 9 Specialized Sub-Departments with full Parent/Child Hierarchy & Cost Center links');
  console.log('   - 11 Dedicated IT Cost Centers');
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
}

seedDepartments().catch((err) => {
  console.error('❌ Error seeding departments:', err);
  process.exit(1);
});
