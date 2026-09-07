import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Request,
  Response,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
} from './document-storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  ChangeEmployeeStatusDto,
} from './dto/employee.dto';
import { OrganizationService } from '../organization/organization.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) {
      return req.user.organizationId;
    }
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  @Get()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  async getEmployees(@Request() req: any, @Query() query: EmployeeQueryDto) {
    const orgId = await this.getOrgId(req);
    const result = await this.employeesService.getEmployees(orgId, query, req.user);
    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  async getStats(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.getStats(orgId, req.user);
    return { success: true, data };
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EXPORT)
  async exportEmployees(@Request() req: any, @Query() query: EmployeeQueryDto, @Response() res: any) {
    const orgId = await this.getOrgId(req);
    const csvData = await this.employeesService.exportEmployees(orgId, query, req.user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employees-export.csv"');
    return res.status(200).send(csvData);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  async getEmployeeById(@Request() req: any, @Param('id') id: string): Promise<any> {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.getEmployeeById(id, orgId, req.user);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_CREATE)
  async createEmployee(@Request() req: any, @Body() dto: CreateEmployeeDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.createEmployee(dto, orgId, req.user.userId);
    return { success: true, message: 'Employee created successfully', data };
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  async updateEmployee(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.updateEmployee(id, dto, orgId, req.user.userId, req.user);
    return { success: true, message: 'Employee updated successfully', data };
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_STATUS)
  async changeEmployeeStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ChangeEmployeeStatusDto,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.changeStatus(id, dto, orgId, req.user.userId, req.user);
    return { success: true, message: `Employee status updated to ${dto.status}`, data };
  }

  @Post(':id/resend-onboarding')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  async resendOnboarding(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.employeesService.resendOnboardingCredentials(id, orgId, req.user.userId, req.user);
    return result;
  }

  // --- DOCUMENT VAULT ---------------------------------------------------

  @Post(':id/documents')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_BYTES },
      fileFilter: (_req, file, cb) => {
        // Reject early so an oversized/wrong-type body isn't buffered further.
        if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only PDF, PNG and JPG files are accepted.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocument(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body() body: { title?: string; category?: string },
  ) {
    if (!file) throw new BadRequestException('No file was uploaded.');
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.addDocument(
      id,
      orgId,
      req.user.userId,
      file,
      body,
      req.user,
    );
    return { success: true, message: 'Document uploaded successfully', data };
  }

  @Get(':id/documents/:documentId/download')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  async downloadDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Response() res: any,
  ) {
    const orgId = await this.getOrgId(req);
    const { stream, document } = await this.employeesService.getDocumentForDownload(
      id,
      documentId,
      orgId,
      req.user.userId,
      req.user,
    );

    res.setHeader('Content-Type', (document as any).mimeType || 'application/octet-stream');
    // `inline` lets the browser preview PDFs/images in the modal viewer.
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent((document as any).fileName || 'document')}"`,
    );
    stream.pipe(res);
  }

  @Patch(':id/documents/:documentId/review')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  async reviewDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() body: { status: 'VERIFIED' | 'REJECTED'; note?: string },
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.reviewDocument(
      id,
      documentId,
      orgId,
      req.user.userId,
      body,
      req.user,
    );
    return { success: true, message: `Document marked ${body.status.toLowerCase()}`, data };
  }

  @Delete(':id/documents/:documentId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_UPDATE)
  async deleteDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.employeesService.removeDocument(
      id,
      documentId,
      orgId,
      req.user.userId,
      req.user,
    );
    return { success: true, message: result.message };
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DELETE)
  async deleteEmployee(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.employeesService.deleteEmployee(id, orgId, req.user.userId, req.user);
    return { success: true, message: result.message };
  }
}
