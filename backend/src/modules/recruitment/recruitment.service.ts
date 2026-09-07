import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { resolve, join, extname } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { JobVacancy, JobVacancyDocument } from './schemas/job-vacancy.schema';
import { JobApplication, JobApplicationDocument } from './schemas/job-application.schema';
import { Organization, OrganizationDocument } from '../organization/schemas/organization.schema';
import { ApplyJobDto, CreateJobRequisitionDto, UpdateApplicationStatusDto } from './dto/recruitment.dto';

@Injectable()
export class RecruitmentService implements OnModuleInit {
  private readonly logger = new Logger(RecruitmentService.name);

  constructor(
    @InjectModel(JobVacancy.name)
    private readonly vacancyModel: Model<JobVacancyDocument>,
    @InjectModel(JobApplication.name)
    private readonly applicationModel: Model<JobApplicationDocument>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
  ) {}

  async onModuleInit() {
    await this.seedInitialVacanciesIfEmpty();
  }

  private async seedInitialVacanciesIfEmpty() {
    const count = await this.vacancyModel.countDocuments();
    if (count > 0) return;

    this.logger.log('Seeding initial company job openings for Public Careers portal...');
    const seedJobs: Partial<JobVacancy>[] = [
      {
        title: 'Senior Full-Stack Engineer',
        department: 'Engineering',
        location: 'Remote (Global)',
        employmentType: 'Full-Time',
        experienceLevel: 'Senior',
        salaryRange: '$140,000 - $185,000',
        iconType: 'react',
        isFeatured: true,
        overview:
          'We are seeking a seasoned Senior Full-Stack Engineer to architect and build next-generation enterprise workforce features using React, TypeScript, and NestJS.',
        responsibilities: [
          'Architect scalable, highly available web services and distributed workflows.',
          'Lead feature development from concept to deployment with modern TypeScript and React.',
          'Collaborate with design and product teams to deliver slick, responsive micro-interactions.',
          'Mentor junior and mid-level engineers, championing clean code and comprehensive test coverage.',
        ],
        requirements: [
          '5+ years of production experience with TypeScript, React, and Node.js / NestJS.',
          'Solid understanding of database systems (MongoDB, PostgreSQL) and indexing strategies.',
          'Demonstrated expertise in RESTful APIs, security best practices, and CI/CD pipelines.',
          'Strong communication skills and enthusiasm for asynchronous, remote-first collaboration.',
        ],
        benefits: [
          '100% remote flexibility across global time zones',
          'Comprehensive health, vision, and dental insurance',
          '$2,500 annual personal learning and conference stipend',
          'Top-tier Apple MacBook Pro or equivalent hardware setup',
        ],
      },
      {
        title: 'Lead Product Designer (UI/UX)',
        department: 'Design',
        location: 'Remote (US / Europe)',
        employmentType: 'Full-Time',
        experienceLevel: 'Lead',
        salaryRange: '$130,000 - $170,000',
        iconType: 'figma',
        isFeatured: true,
        overview:
          'Shape the visual identity, user flows, and aesthetic standards of our enterprise technology and digital platforms. You will craft stunning, intuitive interfaces for enterprise leaders and users worldwide.',
        responsibilities: [
          'Own end-to-end design across our core web applications, design system, and mobile views.',
          'Design interactive prototypes, refined animations, and high-fidelity mockups in Figma.',
          'Conduct user research, synthesize customer feedback, and iterate on complex HR workflows.',
          'Collaborate closely with frontend engineers to ensure pixel-perfect implementation.',
        ],
        requirements: [
          '4+ years designing complex SaaS or B2B enterprise products.',
          'A rich portfolio demonstrating mastery of typography, visual hierarchy, and design systems.',
          'Proficiency with Figma, modern design tokens, and prototyping tools.',
          'Ability to balance high visual polish with pragmatic enterprise usability.',
        ],
        benefits: [
          'Flexible working hours with generous paid time off (PTO)',
          'Wellness stipend for gym, mental health, or home ergonomic equipment',
          'Company equity options with accelerated vesting milestones',
        ],
      },
      {
        title: 'Cloud DevOps & Platform Architect',
        department: 'DevOps & Infra',
        location: 'Remote (North America)',
        employmentType: 'Full-Time',
        experienceLevel: 'Lead',
        salaryRange: '$150,000 - $195,000',
        iconType: 'web',
        isFeatured: false,
        overview:
          'Drive the infrastructure reliability, container orchestration, and multi-region cloud deployment strategy powering thousands of daily workforce operations.',
        responsibilities: [
          'Design, scale, and maintain our Kubernetes clusters, Docker workflows, and AWS cloud infra.',
          'Automate CI/CD deployment pipelines, automated rollbacks, and blue-green releases.',
          'Enforce rigorous security compliance (SOC 2, ISO 27001) and vulnerability scanning.',
          'Implement observability, alerting, and distributed tracing with Prometheus and Grafana.',
        ],
        requirements: [
          '5+ years building and scaling cloud infrastructure on AWS, GCP, or Azure.',
          'Expertise in Docker, Kubernetes, Terraform, and GitHub Actions.',
          'Strong scripting skills in Bash, Python, or Go.',
          'Deep knowledge of network security, TLS, VPC peering, and secret management.',
        ],
        benefits: [
          'Remote-first budget for co-working spaces and high-speed internet',
          'Premium health coverage with 100% employer-sponsored premiums',
          'Annual team offsites in premier destinations worldwide',
        ],
      },
      {
        title: 'Senior Product Manager - Workforce Intelligence',
        department: 'Product',
        location: 'Hybrid (New York, NY / Remote)',
        employmentType: 'Full-Time',
        experienceLevel: 'Senior',
        salaryRange: '$135,000 - $175,000',
        iconType: 'python',
        isFeatured: false,
        overview:
          'Lead the vision and execution for workforce analytics, talent intelligence, and predictive reporting that empowers executive teams to build high-performing organizations.',
        responsibilities: [
          'Define the product roadmap for workforce intelligence, payroll analytics, and talent planning.',
          'Translate strategic enterprise goals into actionable product specifications and user stories.',
          'Analyze customer usage metrics and conduct qualitative feedback sessions with HR leaders.',
          'Coordinate cross-functional squads across design, engineering, and customer success.',
        ],
        requirements: [
          '4+ years product management experience in SaaS or HRTech software.',
          'Data-driven mindset with proven track record of shipping impactful features.',
          'Exceptional written documentation and stakeholder alignment skills.',
        ],
        benefits: [
          'Competitive base salary + equity package',
          'Generous parental leave and family support programs',
          'Unlimited PTO policy with mandatory minimum rest days',
        ],
      },
      {
        title: 'QA Automation Lead',
        department: 'Engineering',
        location: 'Remote (Global)',
        employmentType: 'Full-Time',
        experienceLevel: 'Mid-Senior',
        salaryRange: '$105,000 - $145,000',
        iconType: 'web',
        isFeatured: false,
        overview:
          'Elevate the quality and test coverage of our enterprise software solutions. Build automated end-to-end and API testing suites to catch regressions before they reach production.',
        responsibilities: [
          'Build and maintain robust automated testing frameworks using Playwright, Cypress, and Jest.',
          'Implement automated regression tests across all core business logic and critical user journeys.',
          'Partner with developers to embed quality standards and test automation into CI/CD pipelines.',
        ],
        requirements: [
          '3+ years of experience in QA automation with TypeScript, Playwright, or Cypress.',
          'Experience testing REST APIs and asynchronous backend workflows.',
          'Strong analytical troubleshooting skills and eye for subtle UI glitches.',
        ],
        benefits: [
          'Flexible schedule and remote autonomy',
          'Health, dental, and vision coverage',
          'Annual hardware upgrade program',
        ],
      },
      {
        title: 'Senior Technical Recruiter',
        department: 'People Operations',
        location: 'Remote (US / UK)',
        employmentType: 'Full-Time',
        experienceLevel: 'Senior',
        salaryRange: '$95,000 - $135,000',
        iconType: 'figma',
        isFeatured: false,
        overview:
          'Help us discover and recruit exceptional engineering, product, and leadership talent. You will be the first touchpoint for top-tier candidates around the globe.',
        responsibilities: [
          'Manage end-to-end recruitment pipelines for engineering, design, and product roles.',
          'Source diverse candidates through proactive outreach and talent community engagement.',
          'Deliver a world-class candidate experience with transparent, prompt feedback.',
        ],
        requirements: [
          '3+ years in-house technical recruiting in fast-growing software companies.',
          'Familiarity with modern developer skillsets and hiring platforms.',
          'Exceptional interpersonal, negotiation, and relationship-building abilities.',
        ],
        benefits: [
          'Generous performance bonuses and referral rewards',
          'Home office setup allowance and wellness package',
          'Flexible vacation policy',
        ],
      },
    ];

    await this.vacancyModel.insertMany(seedJobs);
    this.logger.log(`Successfully seeded ${seedJobs.length} public job openings!`);
  }

  // --- PUBLIC ENDPOINTS ---

  async getPublicCompanyInfo() {
    const org = await this.orgModel.findOne({ isDeleted: false });
    const isPeopleOsDefault = (val?: string) => !val || /peopleos/i.test(val);

    const companyName = !isPeopleOsDefault(org?.tradeName)
      ? org!.tradeName
      : !isPeopleOsDefault(org?.legalName)
      ? org!.legalName
      : 'Nexora Technologies';

    const legalName = !isPeopleOsDefault(org?.legalName)
      ? org!.legalName
      : `${companyName} Inc.`;

    const corporateEmail =
      org?.corporateEmail && !/peopleos/i.test(org.corporateEmail)
        ? org.corporateEmail
        : 'contact@nexoratech.com';

    const phone = org?.phone || '+1 (555) 789-2040';
    const website =
      org?.website && !/peopleos/i.test(org.website)
        ? org.website
        : 'https://nexoratech.com';

    const logoUrl = org?.logoUrl || '/branding/nexora_ai_logo.jpg';

    return {
      companyName,
      legalName,
      logoUrl,
      tagline: 'Pioneering Next-Generation AI-Driven Enterprise Software & Cloud Architectures',
      mission:
        'We engineer, build, and scale world-class AI-powered software architectures, autonomous workflow systems, and digital enterprise platforms that solve mission-critical challenges for high-performing global businesses.',
      aboutStory:
        `${companyName} is a next-generation enterprise AI and technology innovation company specializing in autonomous distributed cloud platforms, intelligent cognitive automation, and custom digital software systems. We partner with ambitious global enterprises to accelerate operational intelligence, maximize engineering velocity, and build resilient infrastructure for the AI era.`,
      foundedYear: '2022',
      headquarters: 'San Francisco, CA & London, UK',
      globalHubs: ['San Francisco', 'London', 'New York', 'Singapore', 'Bengaluru'],
      corporateEmail,
      phone,
      website,
      registrationCode: org?.registrationCode || 'REG-2026-HQ01',
      taxId: org?.taxId || 'US-EIN-98-7654321',
      solutions: [
        {
          title: 'Autonomous Enterprise AI & Cognitive Systems',
          description: 'Custom generative AI agents, neural workflow automation, and predictive intelligence models tailored for enterprise scale.',
        },
        {
          title: 'Enterprise Cloud & Distributed Architectures',
          description: 'Multi-region Kubernetes clusters, high-throughput microservices, and resilient cloud-native infrastructure.',
        },
        {
          title: 'Custom Enterprise Software & SaaS',
          description: 'Full-cycle product engineering from modern UI/UX design systems to mission-critical production deployment.',
        },
        {
          title: 'Cybersecurity & Zero-Trust Governance',
          description: 'Zero-trust role-based access control, cryptographic verification, SOC 2 compliance frameworks, and comprehensive audit tracking.',
        },
      ],
      stats: [
        { label: 'Global Team Members', value: '140+', change: '+38% YoY' },
        { label: 'Countries Represented', value: '24', change: 'Global Remote' },
        { label: 'Enterprise Retention', value: '99.4%', change: 'Top Tier' },
        { label: 'Glassdoor Rating', value: '4.9 ★', change: 'Employee Approved' },
      ],
      values: [
        {
          title: 'Engineering Craftsmanship',
          description:
            'We take immense pride in writing clean, reliable, and scalable software. Every system we deploy is architected for long-term endurance.',
        },
        {
          title: 'Remote-First Freedom',
          description:
            'We trust our people unconditionally. Work where you are happiest and most productive with asynchronous communication and full autonomy.',
        },
        {
          title: 'Client & User Empathy',
          description:
            'Technology only matters if it genuinely simplifies lives and accelerates business momentum. We listen deeply and deliver measurable outcomes.',
        },
        {
          title: 'Shared Growth & Transparency',
          description:
            'Transparent compensation bands, meaningful company equity, open architectural debates, and clear career progression for everyone.',
        },
      ],
      perks: [
        {
          title: 'Comprehensive Healthcare',
          description: 'Top-tier medical, dental, and vision plans with 100% covered employee premiums.',
          icon: 'Heart',
        },
        {
          title: 'Home Workspace Stipend',
          description: '$1,500 setup budget for your standing desk, ergonomic chair, and 4K display monitors.',
          icon: 'Laptop',
        },
        {
          title: 'Continuous Learning Stipend',
          description: '$2,500 yearly budget for books, technical certifications, industry conferences, and courses.',
          icon: 'BookOpen',
        },
        {
          title: 'Flexible Vacation & Time Off',
          description: 'Unlimited PTO with mandatory 20-day annual rest minimum, plus a 1-month sabbatical every 4 years.',
          icon: 'Plane',
        },
        {
          title: 'Shared Company Equity',
          description: 'Every full-time team member receives meaningful equity options with standard 4-year vesting.',
          icon: 'TrendUp',
        },
        {
          title: 'Annual Global Retreats',
          description: 'All-expenses-paid annual gatherings to connect, strategize, and celebrate in premier global destinations.',
          icon: 'Sparkles',
        },
      ],
    };
  }

  async getPublicJobs(query?: { search?: string; department?: string; location?: string }) {
    const filter: any = { status: 'OPEN' };

    if (query?.department && query.department !== 'ALL') {
      filter.department = new RegExp(`^${query.department}$`, 'i');
    }

    if (query?.location && query.location !== 'ALL') {
      filter.location = new RegExp(query.location, 'i');
    }

    if (query?.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ title: regex }, { department: regex }, { overview: regex }];
    }

    const jobs = await this.vacancyModel.find(filter).sort({ isFeatured: -1, createdAt: -1 });

    // Distinct departments and locations for filter pills
    const allJobs = await this.vacancyModel.find({ status: 'OPEN' }).select('department location');
    const departments = Array.from(new Set(allJobs.map((j) => j.department))).filter(Boolean);
    const locations = Array.from(new Set(allJobs.map((j) => j.location))).filter(Boolean);

    return {
      jobs,
      totalCount: jobs.length,
      availableDepartments: departments,
      availableLocations: locations,
    };
  }

  async getPublicJobById(id: string) {
    const job = await this.vacancyModel.findById(id);
    if (!job || job.status !== 'OPEN') {
      throw new NotFoundException('Job posting not found or is no longer accepting applications.');
    }
    return job;
  }

  async applyForJob(
    dto: ApplyJobDto,
    file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const job = await this.vacancyModel.findById(dto.jobId);
    if (!job) {
      throw new NotFoundException('The specified job opening does not exist.');
    }

    if (!file) {
      throw new BadRequestException('Please attach your resume or CV (PDF or DOCX format).');
    }

    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, DOC, and DOCX documents are accepted for resumes.');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Resume file size cannot exceed 10MB.');
    }

    // Save resume to uploads/resumes/
    const uploadsDir = resolve(process.cwd(), 'uploads', 'resumes');
    await mkdir(uploadsDir, { recursive: true });

    const ext = extname(file.originalname).toLowerCase() || '.pdf';
    const resumeFileName = `candidate-${randomUUID()}${ext}`;
    const filePath = join(uploadsDir, resumeFileName);

    await writeFile(filePath, file.buffer);

    const resumeUrl = `/api/v1/recruitment/resume/${resumeFileName}`;

    const application = await this.applicationModel.create({
      jobId: job._id,
      jobTitle: job.title,
      department: job.department,
      fullName: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
      linkedinUrl: dto.linkedinUrl || '',
      portfolioUrl: dto.portfolioUrl || '',
      yearsExperience: dto.yearsExperience || '1-3 years',
      earliestStartDate: dto.earliestStartDate || 'Immediately',
      coverLetter: dto.coverLetter || '',
      resumeFileName,
      resumeOriginalName: file.originalname,
      resumeUrl,
      status: 'APPLIED',
    });

    // Increment vacancy count
    await this.vacancyModel.findByIdAndUpdate(job._id, { $inc: { appliedCount: 1 } });

    return {
      success: true,
      applicationId: application._id,
      jobTitle: job.title,
      applicantName: application.fullName,
      message:
        'Your application has been received successfully! Our talent team will review your profile and get back to you shortly.',
    };
  }

  getResumeFilePath(filename: string): string {
    const uploadsDir = resolve(process.cwd(), 'uploads', 'resumes');
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filePath = join(uploadsDir, safeFilename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Resume document not found.');
    }

    return filePath;
  }

  // --- INTERNAL ADMIN RECRUITMENT OPERATIONS ---

  async getAllApplications(query?: { search?: string; status?: string; jobId?: string }) {
    const filter: any = {};
    if (query?.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query?.jobId) {
      filter.jobId = query.jobId;
    }
    if (query?.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { jobTitle: regex }, { department: regex }];
    }

    const applications = await this.applicationModel.find(filter).sort({ createdAt: -1 });
    return applications;
  }

  async updateApplicationStatus(id: string, dto: UpdateApplicationStatusDto) {
    const app = await this.applicationModel.findByIdAndUpdate(id, { status: dto.status }, { new: true });
    if (!app) throw new NotFoundException('Candidate application not found.');
    return app;
  }

  async getAllAdminJobs() {
    const jobs = await this.vacancyModel.find().sort({ createdAt: -1 });
    return jobs;
  }

  async deleteJobRequisition(id: string) {
    const job = await this.vacancyModel.findByIdAndDelete(id);
    if (!job) throw new NotFoundException('Job vacancy not found.');
    return { success: true, message: 'Job requisition deleted successfully.' };
  }

  async createJobRequisition(dto: CreateJobRequisitionDto & { description?: string }) {
    const parseList = (val: any): string[] => {
      if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
      if (typeof val === 'string') {
        return val
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return [];
    };

    const overview = dto.overview || dto.description || 'No overview provided.';
    const responsibilities = parseList(dto.responsibilities);
    const requirements = parseList(dto.requirements);
    const benefits = parseList(dto.benefits);

    const job = await this.vacancyModel.create({
      title: dto.title.trim(),
      department: dto.department.trim(),
      location: dto.location || 'Remote',
      employmentType: dto.employmentType || 'Full-Time',
      experienceLevel: dto.experienceLevel || 'Mid-Senior',
      salaryRange: dto.salaryRange || '$100K - $150K',
      overview,
      responsibilities: responsibilities.length > 0 ? responsibilities : ['Execute core departmental initiatives.', 'Collaborate with cross-functional partners.'],
      requirements: requirements.length > 0 ? requirements : ['Demonstrated domain experience.', 'Strong communication and collaborative mindset.'],
      benefits: benefits.length > 0 ? benefits : ['Comprehensive health and wellness benefits.', 'Competitive salary package.'],
      iconType: dto.iconType || 'web',
      status: 'OPEN',
      appliedCount: 0,
      isFeatured: false,
    });
    return job;
  }
}
