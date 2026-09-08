import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProbationReview,
  ProbationReviewDocument,
} from './schemas/probation-review.schema';
import { Employee, EmployeeDocument } from '../../employees/schemas/employee.schema';
import {
  Department,
  DepartmentDocument,
} from '../../organization/schemas/department.schema';
import {
  Designation,
  DesignationDocument,
} from '../../organization/schemas/designation.schema';
import {
  QueryProbationDto,
  EvaluateProbationDto,
  SignoffProbationDto,
} from './dto/probation.dto';

@Injectable()
export class ProbationService {
  private readonly logger = new Logger(ProbationService.name);

  constructor(
    @InjectModel(ProbationReview.name)
    private readonly probationModel: Model<ProbationReviewDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Department.name)
    private readonly deptModel: Model<DepartmentDocument>,
    @InjectModel(Designation.name)
    private readonly desgModel: Model<DesignationDocument>,
  ) {}

  /**
   * Auto-synchronizes employees with status 'PROBATION' who do not yet have a review record.
   */
  private async autoSyncProbationers(organizationId: string): Promise<void> {
    try {
      const probationEmployees = await this.employeeModel
        .find({ organizationId, status: 'PROBATION', isDeleted: false })
        .lean()
        .exec();

      for (const emp of probationEmployees) {
        const exists = await this.probationModel
          .findOne({ organizationId, employeeId: emp._id })
          .lean()
          .exec();

        if (!exists) {
          const joining = emp.joiningDate ? new Date(emp.joiningDate) : new Date();
          const probationEnd = new Date(joining);
          probationEnd.setDate(probationEnd.getDate() + 90); // default 90 days probation

          await this.probationModel.create({
            organizationId,
            employeeId: emp._id,
            joiningDate: emp.joiningDate || joining.toISOString().split('T')[0],
            probationEndDate: (emp as any).probationEndDate || probationEnd.toISOString().split('T')[0],
            status: 'PENDING_EVALUATION',
            ratings: [
              { dimension: 'Job Knowledge & Core Competency', score: 3, comments: '' },
              { dimension: 'Work Quality & Output Accuracy', score: 3, comments: '' },
              { dimension: 'Dependability, Attendance & Punctuality', score: 3, comments: '' },
              { dimension: 'Teamwork & Cultural Alignment', score: 3, comments: '' },
              { dimension: 'Communication & Problem Solving', score: 3, comments: '' },
            ],
            overallScore: 3,
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Error syncing probationers: ${err.message}`);
    }
  }

  async listProbations(organizationId: string, query: QueryProbationDto): Promise<any> {
    // 1. Auto-discover any missing probation review documents
    await this.autoSyncProbationers(organizationId);

    // 2. Fetch all departments and designations for enrichment
    const [departments, designations] = await Promise.all([
      this.deptModel.find({ organizationId }).lean().exec(),
      this.desgModel.find({ organizationId }).lean().exec(),
    ]);

    const deptMap = new Map<string, string>(departments.map((d: any) => [String(d._id), d.name]));
    const desgMap = new Map<string, string>(designations.map((d: any) => [String(d._id), d.title]));

    // 3. Query all reviews for this organization
    const reviews: any[] = await this.probationModel
      .find({ organizationId })
      .sort({ probationEndDate: 1, createdAt: -1 })
      .lean()
      .exec();

    // 4. Enrich with employee data
    const empIds = reviews.map((r) => r.employeeId);
    const employees: any[] = await this.employeeModel
      .find({ _id: { $in: empIds } })
      .lean()
      .exec();
    const empMap = new Map<string, any>(employees.map((e: any) => [String(e._id), e]));

    const now = new Date();
    const nowTime = now.getTime();

    const enriched = reviews.map((rev) => {
      const emp = empMap.get(rev.employeeId);
      const endDate = new Date(rev.probationEndDate);
      const diffMs = endDate.getTime() - nowTime;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return {
        ...rev,
        daysRemaining,
        isOverdue: daysRemaining < 0 && !['CONFIRMED', 'TERMINATED'].includes(rev.status),
        isDueSoon: daysRemaining >= 0 && daysRemaining <= 15 && !['CONFIRMED', 'TERMINATED'].includes(rev.status),
        employee: emp
          ? {
              _id: emp._id,
              employeeCode: emp.employeeCode,
              displayName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
              firstName: emp.firstName,
              lastName: emp.lastName,
              workEmail: emp.workEmail,
              avatarUrl: emp.avatarUrl || null,
              departmentName: emp.departmentId ? deptMap.get(emp.departmentId) || 'Unassigned' : 'Unassigned',
              designationTitle: emp.designationId ? desgMap.get(emp.designationId) || 'Staff' : 'Staff',
              employmentType: emp.employmentType,
              status: emp.status,
            }
          : null,
      };
    });

    // 5. Calculate Metrics
    const metrics = {
      totalProbationers: enriched.length,
      dueIn15Days: enriched.filter((r) => r.isDueSoon).length,
      overdue: enriched.filter((r) => r.isOverdue).length,
      confirmedThisMonth: enriched.filter((r) => {
        if (r.status !== 'CONFIRMED' || !r.finalizedAt) return false;
        const d = new Date(r.finalizedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      underReview: enriched.filter((r) => r.status === 'UNDER_HR_REVIEW').length,
    };

    // 6. Apply Filters
    let filtered = enriched;

    if (query.status && query.status !== 'ALL') {
      filtered = filtered.filter((r) => r.status === query.status);
    }

    if (query.urgency && query.urgency !== 'ALL') {
      if (query.urgency === '15_DAYS') {
        filtered = filtered.filter((r) => r.isDueSoon);
      } else if (query.urgency === '30_DAYS') {
        filtered = filtered.filter((r) => r.daysRemaining >= 0 && r.daysRemaining <= 30 && !['CONFIRMED', 'TERMINATED'].includes(r.status));
      } else if (query.urgency === 'OVERDUE') {
        filtered = filtered.filter((r) => r.isOverdue);
      }
    }

    if (query.departmentId && query.departmentId !== 'ALL') {
      filtered = filtered.filter((r) => {
        const emp = empMap.get(r.employeeId);
        return emp?.departmentId === query.departmentId;
      });
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const name = r.employee?.displayName?.toLowerCase() || '';
        const code = r.employee?.employeeCode?.toLowerCase() || '';
        const email = r.employee?.workEmail?.toLowerCase() || '';
        return name.includes(s) || code.includes(s) || email.includes(s);
      });
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const pagedData = filtered.slice(start, start + pageSize);

    return {
      data: pagedData,
      metrics,
      total,
      page,
      pageSize,
    };
  }

  async getProbationById(organizationId: string, id: string): Promise<any> {
    const review = await this.probationModel
      .findOne({ _id: id, organizationId })
      .lean()
      .exec();

    if (!review) {
      throw new NotFoundException(`Probation review with ID "${id}" not found.`);
    }

    const emp = await this.employeeModel.findOne({ _id: review.employeeId }).lean().exec();
    let departmentName = 'Unassigned';
    let designationTitle = 'Staff';

    if (emp?.departmentId) {
      const dept = await this.deptModel.findById(emp.departmentId).lean().exec();
      if (dept) departmentName = dept.name;
    }
    if (emp?.designationId) {
      const desg = await this.desgModel.findById(emp.designationId).lean().exec();
      if (desg) designationTitle = desg.title;
    }

    return {
      ...review,
      employee: emp
        ? {
            ...emp,
            departmentName,
            designationTitle,
          }
        : null,
    };
  }

  async evaluateProbation(
    organizationId: string,
    id: string,
    evaluatorId: string,
    dto: EvaluateProbationDto,
  ): Promise<any> {
    const review = await this.probationModel.findOne({ _id: id, organizationId }).exec();
    if (!review) {
      throw new NotFoundException(`Probation review with ID "${id}" not found.`);
    }

    if (['CONFIRMED', 'TERMINATED'].includes(review.status)) {
      throw new BadRequestException(`Cannot evaluate a probation review that is already ${review.status}.`);
    }

    const ratings = dto.ratings || [];
    const totalScore = ratings.reduce((acc, r) => acc + Number(r.score), 0);
    const overallScore = ratings.length > 0 ? parseFloat((totalScore / ratings.length).toFixed(2)) : 3;

    review.ratings = ratings;
    review.overallScore = overallScore;
    review.recommendation = dto.recommendation;
    review.managerComments = dto.managerComments || '';
    review.evaluatorId = evaluatorId;
    review.evaluatedAt = new Date();
    review.status = 'UNDER_HR_REVIEW';

    await review.save();
    return this.getProbationById(organizationId, id);
  }

  async signoffProbation(
    organizationId: string,
    id: string,
    signerId: string,
    dto: SignoffProbationDto,
  ): Promise<any> {
    const review = await this.probationModel.findOne({ _id: id, organizationId }).exec();
    if (!review) {
      throw new NotFoundException(`Probation review with ID "${id}" not found.`);
    }

    const now = new Date();
    review.finalizedAt = now;
    review.finalizedBy = signerId;
    review.hrNotes = dto.hrNotes || '';

    if (dto.action === 'CONFIRM') {
      review.status = 'CONFIRMED';
      await this.employeeModel.updateOne(
        { _id: review.employeeId },
        {
          $set: {
            status: 'ACTIVE',
            confirmationDate: now.toISOString().split('T')[0],
          },
        },
      );
    } else if (dto.action === 'TERMINATE') {
      review.status = 'TERMINATED';
      await this.employeeModel.updateOne(
        { _id: review.employeeId },
        {
          $set: {
            status: 'TERMINATED',
            terminationReason: dto.hrNotes || 'Probation separation',
          },
        },
      );
    } else {
      // Extend 30, 60, or 90 days
      const daysToAdd = dto.action === 'EXTEND_30' ? 30 : dto.action === 'EXTEND_60' ? 60 : 90;
      const currentEnd = new Date(review.probationEndDate);
      currentEnd.setDate(currentEnd.getDate() + daysToAdd);
      const newEndDate = currentEnd.toISOString().split('T')[0];

      review.status = 'EXTENDED';
      review.extensionEndDate = newEndDate;
      review.probationEndDate = newEndDate;

      await this.employeeModel.updateOne(
        { _id: review.employeeId },
        {
          $set: {
            probationEndDate: newEndDate,
          },
        },
      );
    }

    await review.save();
    return this.getProbationById(organizationId, id);
  }
}
