import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobApplication, JobApplicationDocument } from './schemas/job-application.schema';
import { JobVacancy, JobVacancyDocument } from './schemas/job-vacancy.schema';
import { Interview, InterviewDocument } from './schemas/interview.schema';
import { Offer, OfferDocument } from './schemas/offer.schema';
import { EmployeesService } from '../employees/employees.service';
import { OrganizationService } from '../organization/organization.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { LoggerHelper } from '../../common/logger';
import {
  ScheduleInterviewDto,
  UpdateInterviewDto,
  InterviewFeedbackDto,
  CreateOfferDto,
  UpdateOfferDto,
  OfferDecisionDto,
  HireCandidateDto,
} from './dto/recruitment.dto';

/** Allowed forward moves; REJECTED / WITHDRAWN reachable from any open stage. */
const NEXT_STAGES: Record<string, string[]> = {
  APPLIED: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEWING', 'REJECTED', 'WITHDRAWN'],
  INTERVIEWING: ['OFFERED', 'REJECTED', 'WITHDRAWN'],
  OFFERED: ['REJECTED', 'WITHDRAWN'],
};

@Injectable()
export class PipelineService {
  private readonly logger = LoggerHelper.Instance.child(PipelineService.name);

  constructor(
    @InjectModel(JobApplication.name) private readonly applicationModel: Model<JobApplicationDocument>,
    @InjectModel(JobVacancy.name) private readonly vacancyModel: Model<JobVacancyDocument>,
    @InjectModel(Interview.name) private readonly interviewModel: Model<InterviewDocument>,
    @InjectModel(Offer.name) private readonly offerModel: Model<OfferDocument>,
    private readonly employeesService: EmployeesService,
    private readonly orgService: OrganizationService,
    private readonly auditService: AuditService,
  ) {}

  private async audit(orgId: string | null, userId: string, action: AuditAction, resource: AuditResource, entityId: string, description: string, before: any = null, after: any = null) {
    await this.auditService.record({
      action,
      resourceType: resource,
      resourceId: entityId,
      organizationId: orgId,
      actorUserId: userId,
      description,
      before,
      after,
    });
  }

  private async orgIdFor(actorOrgId?: string | null): Promise<string> {
    if (actorOrgId) return actorOrgId;
    const org = await this.orgService.getProfile();
    return String(org._id);
  }

  // ------------------------------------------------------------------ detail

  async getApplicationDetail(id: string) {
    const application: any = await this.applicationModel.findById(id).lean();
    if (!application) throw new NotFoundException('Candidate application not found.');
    const [interviews, offer] = await Promise.all([
      this.interviewModel.find({ applicationId: id }).sort({ roundNumber: 1 }).lean(),
      this.offerModel.findOne({ applicationId: id }).sort({ createdAt: -1 }).lean(),
    ]);
    return { ...application, interviews, offer: offer || null };
  }

  // -------------------------------------------------------------------- move

  async moveStage(id: string, to: string, note: string, orgId: string | null, actorId: string) {
    const application = await this.applicationModel.findById(id);
    if (!application) throw new NotFoundException('Candidate application not found.');
    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException(`Application is already ${application.status.toLowerCase()}.`);
    }
    if (to === 'HIRED') {
      throw new BadRequestException('Use the hire action to convert an offer into an employee.');
    }
    const allowed = NEXT_STAGES[application.status] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Cannot move from ${application.status} to ${to}.`);
    }
    const before = application.status;
    application.status = to as any;
    await application.save();
    await this.audit(orgId, actorId, AuditAction.UPDATE, AuditResource.CANDIDATE, id, `${application.fullName} moved ${before} → ${to}${note ? ` — ${note}` : ''}`, { status: before }, { status: to });
    return application;
  }

  // --------------------------------------------------------------- interviews

  async scheduleInterview(applicationId: string, dto: ScheduleInterviewDto, orgId: string | null, actorId: string) {
    const application: any = await this.applicationModel.findById(applicationId).lean();
    if (!application) throw new NotFoundException('Candidate application not found.');
    if (!['SHORTLISTED', 'INTERVIEWING'].includes(application.status)) {
      throw new BadRequestException('Schedule interviews only for shortlisted / interviewing candidates. Move the stage first.');
    }
    const count = await this.interviewModel.countDocuments({ applicationId });
    const interview = await this.interviewModel.create({
      applicationId,
      jobTitle: application.jobTitle,
      roundNumber: count + 1,
      title: dto.title?.trim() || `Round ${count + 1}`,
      interviewerName: dto.interviewerName.trim(),
      scheduledDate: dto.scheduledDate,
      scheduledTime: dto.scheduledTime,
      mode: dto.mode || 'VIDEO',
      location: dto.location?.trim() || '',
      status: 'SCHEDULED',
    });
    if (application.status === 'SHORTLISTED') {
      await this.applicationModel.findByIdAndUpdate(applicationId, { status: 'INTERVIEWING' });
    }
    await this.audit(orgId, actorId, AuditAction.CREATE, AuditResource.INTERVIEW, String(interview._id), `Scheduled ${interview.title} for ${application.fullName} (${dto.scheduledDate} ${dto.scheduledTime})`, null, interview);
    return interview;
  }

  async listInterviews(applicationId: string) {
    return this.interviewModel.find({ applicationId }).sort({ roundNumber: 1 }).lean();
  }

  async updateInterview(id: string, dto: UpdateInterviewDto, orgId: string | null, actorId: string) {
    const interview = await this.interviewModel.findById(id);
    if (!interview) throw new NotFoundException('Interview not found.');
    if (interview.status === 'COMPLETED') throw new BadRequestException('Completed interviews cannot be edited. Add a new round instead.');
    const before = interview.toObject();
    Object.assign(interview, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.interviewerName !== undefined ? { interviewerName: dto.interviewerName.trim() } : {}),
      ...(dto.scheduledDate !== undefined ? { scheduledDate: dto.scheduledDate } : {}),
      ...(dto.scheduledTime !== undefined ? { scheduledTime: dto.scheduledTime } : {}),
      ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
      ...(dto.location !== undefined ? { location: dto.location.trim() } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
    await interview.save();
    await this.audit(orgId, actorId, AuditAction.UPDATE, AuditResource.INTERVIEW, id, `Updated interview ${interview.title}`, before, interview.toObject());
    return interview;
  }

  async submitFeedback(id: string, dto: InterviewFeedbackDto, orgId: string | null, actorId: string, actorName: string) {
    const interview = await this.interviewModel.findById(id);
    if (!interview) throw new NotFoundException('Interview not found.');
    if (interview.status === 'CANCELLED') throw new BadRequestException('Cancelled interviews cannot take feedback.');
    interview.rating = dto.rating ?? null;
    interview.recommendation = dto.recommendation;
    interview.feedback = dto.feedback?.trim() || '';
    interview.status = 'COMPLETED';
    interview.decidedBy = actorId;
    await interview.save();
    await this.audit(orgId, actorId, AuditAction.UPDATE, AuditResource.INTERVIEW, id, `${actorName} rated ${interview.title}: ${dto.recommendation}${dto.rating ? ` (${dto.rating}/5)` : ''}`, null, interview.toObject());
    return interview;
  }

  async upcomingInterviews(limit = 8) {
    const today = new Date().toISOString().slice(0, 10);
    const rows: any[] = await this.interviewModel
      .find({ status: 'SCHEDULED', scheduledDate: { $gte: today } })
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .limit(limit)
      .lean();
    const appIds = [...new Set(rows.map((r) => r.applicationId))];
    const apps: any[] = await this.applicationModel.find({ _id: { $in: appIds } }, 'fullName jobTitle email phone').lean();
    const map = new Map(apps.map((a: any) => [String(a._id), a]));
    return rows.map((r) => {
      const a = map.get(String(r.applicationId));
      return {
        ...r,
        candidateName: a?.fullName || 'Candidate',
        candidateRole: a?.jobTitle || r.jobTitle,
        candidateEmail: a?.email || '',
        candidatePhone: a?.phone || '',
      };
    });
  }

  // ------------------------------------------------------------------- offers

  async createOffer(applicationId: string, dto: CreateOfferDto, orgId: string | null, actorId: string) {
    const application: any = await this.applicationModel.findById(applicationId).lean();
    if (!application) throw new NotFoundException('Candidate application not found.');
    if (!['INTERVIEWING', 'OFFERED'].includes(application.status)) {
      throw new BadRequestException('Offers go to interviewing candidates. Move the stage first.');
    }
    const existing: any = await this.offerModel.findOne({ applicationId, status: { $in: ['DRAFT', 'SENT', 'ACCEPTED'] } }).lean();
    if (existing) throw new BadRequestException('An active offer already exists for this candidate.');

    const offer = await this.offerModel.create({
      applicationId,
      candidateName: application.fullName,
      jobTitle: application.jobTitle,
      designation: dto.designation?.trim() || application.jobTitle,
      department: dto.department?.trim() || application.department,
      salaryOffered: dto.salaryOffered?.trim() || '',
      joiningDate: dto.joiningDate || '',
      expiryDate: dto.expiryDate || '',
      notes: dto.notes?.trim() || '',
      status: 'SENT',
    });
    await this.applicationModel.findByIdAndUpdate(applicationId, { status: 'OFFERED' });
    await this.audit(orgId, actorId, AuditAction.CREATE, AuditResource.OFFER, String(offer._id), `Offer sent to ${application.fullName} (${offer.salaryOffered || 'salary on request'})`, null, offer);
    return offer;
  }

  async updateOffer(id: string, dto: UpdateOfferDto, orgId: string | null, actorId: string) {
    const offer = await this.offerModel.findById(id);
    if (!offer) throw new NotFoundException('Offer not found.');
    if (!['DRAFT', 'SENT'].includes(offer.status)) {
      throw new BadRequestException('Only draft/sent offers can be edited.');
    }
    const before = offer.toObject();
    Object.assign(offer, {
      ...(dto.designation !== undefined ? { designation: dto.designation.trim() } : {}),
      ...(dto.department !== undefined ? { department: dto.department.trim() } : {}),
      ...(dto.salaryOffered !== undefined ? { salaryOffered: dto.salaryOffered.trim() } : {}),
      ...(dto.joiningDate !== undefined ? { joiningDate: dto.joiningDate } : {}),
      ...(dto.expiryDate !== undefined ? { expiryDate: dto.expiryDate } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes.trim() } : {}),
    });
    await offer.save();
    await this.audit(orgId, actorId, AuditAction.UPDATE, AuditResource.OFFER, id, `Updated offer for ${offer.candidateName}`, before, offer.toObject());
    return offer;
  }

  async decideOffer(id: string, decision: string, orgId: string | null, actorId: string) {
    const offer = await this.offerModel.findById(id);
    if (!offer) throw new NotFoundException('Offer not found.');
    if (!['DRAFT', 'SENT'].includes(offer.status)) {
      throw new BadRequestException(`Offer is already ${offer.status.toLowerCase()}.`);
    }
    const before = offer.status;
    offer.status = decision as any;
    await offer.save();
    if (decision === 'DECLINED' || decision === 'WITHDRAWN') {
      await this.applicationModel.findByIdAndUpdate(offer.applicationId, { status: 'WITHDRAWN' });
    }
    await this.audit(orgId, actorId, AuditAction.UPDATE, AuditResource.OFFER, id, `Offer ${decision.toLowerCase()} for ${offer.candidateName}`, { status: before }, { status: decision });
    return offer;
  }

  // --------------------------------------------------------------------- hire

  /**
   * Converts an offer-stage candidate into an employee: provisions the login
   * via the standard onboarding engine (credentials email included) and marks
   * the pipeline HIRED with a vacancy count decrement.
   */
  async hire(applicationId: string, dto: HireCandidateDto, orgId: string, actorId: string) {
    const application: any = await this.applicationModel.findById(applicationId).lean();
    if (!application) throw new NotFoundException('Candidate application not found.');
    if (application.status === 'HIRED') throw new BadRequestException('Candidate is already hired.');
    if (!['OFFERED', 'INTERVIEWING'].includes(application.status)) {
      throw new BadRequestException('Hire from the offer stage. Move the candidate forward first.');
    }

    const offer: any = await this.offerModel.findOne({ applicationId }).sort({ createdAt: -1 }).lean();
    if (offer && !['ACCEPTED', 'SENT'].includes(offer.status)) {
      throw new BadRequestException(`Offer is ${offer.status.toLowerCase()} — record acceptance first.`);
    }

    const parts = application.fullName.trim().split(/\s+/);
    const employee = await this.employeesService.createEmployee(
      {
        firstName: parts[0] || 'New',
        lastName: parts.slice(1).join(' ') || 'Hire',
        displayName: application.fullName.trim(),
        personalEmail: application.email,
        workEmail: application.email,
        phone: application.phone,
        departmentId: dto.departmentId || undefined,
        designationId: dto.designationId || undefined,
        locationId: dto.locationId || undefined,
        employmentType: (dto.employmentType as any) || 'FULL_TIME',
        joiningDate: dto.joiningDate || offer?.joiningDate || new Date().toISOString().slice(0, 10),
        status: 'ACTIVE',
      } as any,
      orgId,
      actorId,
    );

    await this.applicationModel.findByIdAndUpdate(applicationId, { status: 'HIRED' });
    await this.vacancyModel.updateOne({ _id: application.jobId }, { $inc: { appliedCount: -1 } }).catch(() => {});
    await this.audit(orgId, actorId, AuditAction.CREATE, AuditResource.CANDIDATE, applicationId, `Hired ${application.fullName} as ${employee.employeeCode} — onboarding credentials dispatched`, { status: application.status }, { status: 'HIRED', employeeId: employee._id });

    return { applicationId, employee, employeeCode: employee.employeeCode };
  }

  // ------------------------------------------------------------------ metrics

  async pipelineStats() {
    const [byStatus, vacancies, upcoming] = await Promise.all([
      this.applicationModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.vacancyModel.find({ status: 'OPEN' }, '_id title').lean(),
      this.upcomingInterviews(8),
    ]);
    const counts: Record<string, number> = {};
    for (const row of byStatus) counts[row._id] = row.count;
    return {
      totalJobOpenings: vacancies.length,
      totalApplications: Object.values(counts).reduce((a, b) => a + b, 0),
      applied: counts.APPLIED || 0,
      shortlisted: counts.SHORTLISTED || 0,
      interviewing: counts.INTERVIEWING || 0,
      offered: counts.OFFERED || 0,
      hired: counts.HIRED || 0,
      rejected: counts.REJECTED || 0,
      upcoming,
    };
  }
}
