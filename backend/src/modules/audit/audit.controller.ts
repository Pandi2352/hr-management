import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Response,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { AuditService } from '../../common/audit/audit.service';
import {
  AuditAction,
  AuditResource,
  AUDIT_ACTION_LABELS,
  AUDIT_RESOURCE_LABELS,
} from '../../common/audit/audit.constants';
import { OrganizationService } from '../organization/organization.service';
import { LoginHistoryService } from './login-history.service';

/**
 * Read-only audit surface.
 *
 * There is deliberately no POST/PATCH/DELETE here: audit records are
 * append-only and written exclusively by AuditService (checklist §18).
 */
@ApiTags('Audit & Compliance')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly orgService: OrganizationService,
    private readonly loginHistoryService: LoginHistoryService,
  ) {}

  /** Every query is scoped to the caller's organization — no cross-org reads. */
  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) return req.user.organizationId;
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  @Get('meta')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Action/resource vocabulary for building audit filters' })
  getMeta() {
    return {
      actions: Object.values(AuditAction).map((value) => ({
        value,
        label: AUDIT_ACTION_LABELS[value] || value,
      })),
      resources: Object.values(AuditResource).map((value) => ({
        value,
        label: AUDIT_RESOURCE_LABELS[value] || value,
      })),
    };
  }

  @Get('logs')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Query the organization audit trail' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('status') status?: string,
    @Query('requestId') requestId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const organizationId = await this.getOrgId(req);
    const result = await this.auditService.findAll({
      organizationId,
      search,
      action,
      resourceType,
      resourceId,
      actorUserId,
      status,
      requestId,
      from,
      to,
      page,
      limit,
      sortOrder,
    });

    return { success: true, data: result.data, meta: result.meta };
  }

  @Get('logs/export')
  @RequirePermissions(PERMISSIONS.AUDIT_EXPORT)
  @ApiOperation({ summary: 'Export the filtered audit trail as CSV' })
  async exportLogs(
    @Request() req: any,
    @Response() res: any,
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const organizationId = await this.getOrgId(req);
    const rows = await this.auditService.findAllForExport({
      organizationId,
      search,
      action,
      resourceType,
      actorUserId,
      status,
      from,
      to,
    });

    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Audit ID',
      'Timestamp',
      'Actor',
      'Actor Email',
      'Action',
      'Resource',
      'Resource ID',
      'Description',
      'Status',
      'IP Address',
      'Device',
      'Request ID',
    ].join(',');

    const body = rows
      .map((r: any) =>
        [
          r._id,
          r.createdAt ? new Date(r.createdAt).toISOString() : '',
          r.actorName,
          r.actorEmail,
          r.action,
          r.resourceType,
          r.resourceId,
          r.description,
          r.status,
          r.ipAddress,
          r.deviceType,
          r.requestId,
        ]
          .map(escape)
          .join(','),
      )
      .join('\n');

    // The export itself is an auditable event (checklist §17).
    await this.auditService.record({
      action: AuditAction.EXPORT,
      resourceType: AuditResource.AUDIT_LOG,
      organizationId,
      actorUserId: req.user?.userId,
      actorEmail: req.user?.email,
      description: `Exported ${rows.length} audit record(s) to CSV`,
      metadata: { rowCount: rows.length, filters: { action, resourceType, status, from, to, search } },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    return res.status(200).send(`${header}\n${body}`);
  }

  @Get('login-history')
  @RequirePermissions(PERMISSIONS.AUDIT_LOGIN_HISTORY)
  @ApiOperation({ summary: 'Authentication attempt history with device and IP context' })
  async loginHistory(
    @Query('search') search?: string,
    @Query('outcome') outcome?: 'ALL' | 'SUCCESS' | 'FAILURE',
    @Query('reason') reason?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.loginHistoryService.findAll({
      search,
      outcome,
      reason,
      ipAddress,
      from,
      to,
      page,
      limit,
    });
    return { success: true, data: result.data, meta: result.meta };
  }

  @Get('login-history/suspicious')
  @RequirePermissions(PERMISSIONS.AUDIT_LOGIN_HISTORY)
  @ApiOperation({ summary: 'IPs with repeated recent authentication failures' })
  async suspiciousLogins() {
    const data = await this.loginHistoryService.findSuspicious();
    return { success: true, data };
  }

  @Get('logs/:id')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Get a single audit record with full change payload' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const organizationId = await this.getOrgId(req);
    // Org-scoped lookup — prevents cross-organization id enumeration (§18).
    const record = await this.auditService.findById(id, organizationId);
    if (!record) throw new NotFoundException('Audit record not found');
    return { success: true, data: record };
  }
}
