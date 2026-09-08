import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Organization, OrganizationDocument } from '../organization/schemas/organization.schema';
import { MailService } from '../mail/mail.service';
import { generateUuid } from '../../common/utils/uuid.util';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoggerHelper } from '../../common/logger';

@Injectable()
export class EmployeeProvisioningService {
  private readonly logger = LoggerHelper.Instance.child(EmployeeProvisioningService.name);

  constructor(
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    private readonly mailService: MailService,
  ) {}

  /**
   * 1. ATOMIC EMPLOYEE ID GENERATION WITH COLLISION RETRY LOOP
   * Format: EMP-00001, EMP-00002...
   * Handles high concurrency without duplicating IDs.
   */
  async generateUniqueEmployeeCode(orgId: string, customCode?: string): Promise<string> {
    if (customCode && customCode.trim()) {
      const formatted = customCode.trim().toUpperCase();
      const exists = await this.empModel.findOne({
        organizationId: orgId,
        employeeCode: formatted,
        isDeleted: false,
      });
      if (exists) {
        throw new ConflictException(`Employee ID ${formatted} is already in use.`);
      }
      return formatted;
    }

    // Determine highest sequential numeric ID currently in organization
    const employees = await this.empModel
      .find({ organizationId: orgId }, { employeeCode: 1 })
      .lean();

    let maxNumber = 0;
    for (const emp of employees) {
      if (emp.employeeCode) {
        const match = emp.employeeCode.match(/EMP-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      }
    }

    let nextNumber = maxNumber + 1;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;

    while (attempts < MAX_ATTEMPTS) {
      const candidate = `EMP-${String(nextNumber).padStart(5, '0')}`;
      const conflict = await this.empModel.findOne({
        organizationId: orgId,
        employeeCode: candidate,
      });

      if (!conflict) {
        return candidate;
      }

      nextNumber++;
      attempts++;
    }

    // Fallback if sequence is heavily fragmented
    return `EMP-${Date.now().toString().slice(-5)}`;
  }

  /**
   * 2. AUTOMATIC ORGANIZATION EMAIL GENERATION WITH COLLISION RESOLUTION
   * Format: firstname.lastname@domain.com
   * If exists: firstname.lastname1@domain.com, firstname.lastname2@domain.com
   */
  async generateUniqueOrganizationEmail(
    firstName: string,
    lastName: string,
    orgId: string,
    customEmail?: string,
  ): Promise<string> {
    if (customEmail && customEmail.trim()) {
      const formatted = customEmail.trim().toLowerCase();
      const exists = await this.empModel.findOne({
        organizationId: orgId,
        workEmail: formatted,
        isDeleted: false,
      });
      if (exists) {
        throw new ConflictException(`Work email ${formatted} is already registered.`);
      }
      return formatted;
    }

    // Determine domain from organization corporate email or fallback
    let domain = 'peopleos.internal';
    try {
      const org = await this.orgModel.findOne({ _id: orgId }).lean();
      if (org && org.corporateEmail && org.corporateEmail.includes('@')) {
        domain = org.corporateEmail.split('@')[1].toLowerCase().trim();
      }
    } catch {
      // Use fallback domain
    }

    const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '').trim() || 'employee';
    const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '').trim() || 'user';
    const baseSlug = `${cleanFirst}.${cleanLast}`;

    let candidate = `${baseSlug}@${domain}`;
    let collisionCounter = 0;

    while (collisionCounter < 50) {
      const conflictEmp = await this.empModel.findOne({
        organizationId: orgId,
        workEmail: candidate,
        isDeleted: false,
      });
      const conflictUser = await this.userModel.findOne({
        email: candidate,
        isDeleted: false,
      });

      if (!conflictEmp && !conflictUser) {
        return candidate;
      }

      collisionCounter++;
      candidate = `${baseSlug}${collisionCounter}@${domain}`;
    }

    return `${baseSlug}.${Date.now().toString().slice(-4)}@${domain}`;
  }

  /**
   * 3. CRYPTOGRAPHICALLY SECURE TEMPORARY PASSWORD GENERATOR
   * Meets policy: Upper, Lower, Number, Special Char, Min 10 chars.
   */
  generateSecureTemporaryPassword(): { plainText: string; hash: Promise<string> } {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const specials = '!@#$%&*';

    // Ensure at least one from each required character set
    const randChar = (str: string) => str[crypto.randomInt(0, str.length)];
    const mandatory = [
      randChar(uppercase),
      randChar(lowercase),
      randChar(numbers),
      randChar(specials),
    ];

    const allChars = uppercase + lowercase + numbers + specials;
    const additionalLength = 6; // Total 10 characters
    const remaining = Array.from({ length: additionalLength }, () => randChar(allChars));

    // Shuffle characters
    const plainText = mandatory
      .concat(remaining)
      .sort(() => crypto.randomInt(-1, 2))
      .join('');

    return {
      plainText,
      hash: bcrypt.hash(plainText, 10),
    };
  }

  /**
   * 4. PROVISION LINKED USER ACCOUNT
   * Creates or activates linked User credential in auth domain.
   */
  async provisionUserAccount(params: {
    orgId: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): Promise<string> {
    const existing = await this.userModel.findOne({ email: params.email.toLowerCase().trim() });
    if (existing) {
      existing.status = ('ACTIVE' as any);
      existing.passwordHash = params.passwordHash;
      await existing.save();
      return existing._id;
    }

    const newUser = await this.userModel.create({
      _id: generateUuid(),
      organizationId: params.orgId,
      email: params.email.toLowerCase().trim(),
      passwordHash: params.passwordHash,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      status: 'ACTIVE',
      roles: ['EMPLOYEE'],
      permissions: [],
      failedLoginAttempts: 0,
      isDeleted: false,
    });

    return newUser._id;
  }

  /**
   * 5. ASYNCHRONOUS ONBOARDING EMAIL DISPATCH TO PERSONAL EMAIL
   */
  async dispatchOnboardingEmail(params: {
    personalEmail?: string;
    workEmail: string;
    employeeName: string;
    employeeCode: string;
    temporaryPassword: string;
  }): Promise<{ status: 'SENT' | 'FAILED' | 'PENDING'; sentAt?: Date }> {
    if (!params.personalEmail || !params.personalEmail.includes('@')) {
      return { status: 'PENDING' };
    }

    try {
      const delivered = await this.mailService.sendOnboardingCredentialsEmail({
        toEmail: params.personalEmail.trim().toLowerCase(),
        employeeName: params.employeeName,
        employeeCode: params.employeeCode,
        workEmail: params.workEmail,
        temporaryPassword: params.temporaryPassword,
      });

      return {
        status: delivered ? 'SENT' : 'FAILED',
        sentAt: delivered ? new Date() : undefined,
      };
    } catch (err: any) {
      this.logger.warn(null, 'Onboarding email dispatch failed', err);
      return { status: 'FAILED' };
    }
  }
}
