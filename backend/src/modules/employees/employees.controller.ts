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
  ForbiddenException,
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
import { PERMISSIONS, UserRole } from '../../common/constants';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  ChangeEmployeeStatusDto,
} from './dto/employee.dto';
import { OrganizationService } from '../organization/organization.service';
import { ResultEntity } from '../../common/response';

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
    return ResultEntity.ok(result.data, undefined, result.meta);
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  async getStats(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.getStats(orgId, req.user);
    return ResultEntity.ok(data);
  }

  @Get('org-chart')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  async getOrgChart(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.getOrgChart(orgId);
    return ResultEntity.ok(data);
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EXPORT)
  async exportEmployees(@Request() req: any, @Query() query: EmployeeQueryDto, @Response() res: any) {
    const orgId = await this.getOrgId(req);
    const csvData = await this.employeesService.exportEmployees(orgId, query, req.user);
    new ResultEntity()
      .setCSV({ csv: csvData, filename: 'employees-export.csv' })
      .sendResponse(res);
  }

  @Post('upload-avatar')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_CREATE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPreHireAvatar(
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('No image file was uploaded.');
    const data = await this.employeesService.uploadPreHireAvatar(file);
    return ResultEntity.ok(data, 'Avatar uploaded successfully');
  }

  @Get('generate-code')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  async generateEmployeeCode(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.generateEmployeeCode(orgId);
    return ResultEntity.ok(data);
  }

  @Get('generate-email')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  async generateWorkEmail(
    @Request() req: any,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.generateWorkEmail(orgId, firstName, lastName);
    return ResultEntity.ok(data);
  }

  @Get('me')
  async getMyProfile(@Request() req: any): Promise<any> {
    const orgId = await this.getOrgId(req);
    const userId = req.user?.id || req.user?._id;
    const email = req.user?.email;
    const data = await this.employeesService.getMyEmployeeProfile(userId, orgId, email);
    return ResultEntity.ok(data);
  }

  private hasPerm(user: any, perm: string): boolean {
    if (!user) return false;
    if (user.roles?.includes(UserRole.SUPER_ADMIN) || user.roles?.includes('SUPER_ADMIN')) return true;
    if (user.permissions?.includes('*')) return true;
    return Boolean(user.permissions?.includes(perm));
  }

  @Get(':id')
  async getEmployeeById(@Request() req: any, @Param('id') id: string): Promise<any> {
    const orgId = await this.getOrgId(req);
    const hasRead = this.hasPerm(req.user, PERMISSIONS.EMPLOYEE_READ);
    const isSelf = await this.employeesService.isSelfServiceUser(id, orgId, req.user);
    if (!hasRead && !isSelf) {
      throw new ForbiddenException('Insufficient permissions to perform this action');
    }
    const data = await this.employeesService.getEmployeeById(id, orgId, req.user);
    return ResultEntity.ok(data);
  }

  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('No image file was uploaded.');
    const orgId = await this.getOrgId(req);
    const hasUpdate = this.hasPerm(req.user, PERMISSIONS.EMPLOYEE_UPDATE);
    const isSelf = await this.employeesService.isSelfServiceUser(id, orgId, req.user);
    if (!hasUpdate && !isSelf) {
      throw new ForbiddenException('Insufficient permissions to perform this action');
    }
    const data = await this.employeesService.uploadAvatar(
      id,
      orgId,
      file,
      req.user.userId || req.user.id,
      req.user,
    );
    return ResultEntity.ok(data, 'Profile picture updated successfully');
  }

  @Post()
  @RequirePermissions(PERMISSIONS.EMPLOYEE_CREATE)
  async createEmployee(@Request() req: any, @Body() dto: CreateEmployeeDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.employeesService.createEmployee(dto, orgId, req.user.userId || req.user.id);
    return ResultEntity.created(data, 'Employee created successfully');
  }

  @Patch(':id')
  async updateEmployee(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const orgId = await this.getOrgId(req);
    const hasUpdate = this.hasPerm(req.user, PERMISSIONS.EMPLOYEE_UPDATE);
    const isSelf = await this.employeesService.isSelfServiceUser(id, orgId, req.user);
    if (!hasUpdate && !isSelf) {
      throw new ForbiddenException('Insufficient permissions to perform this action');
    }
    const data = await this.employeesService.updateEmployee(id, dto, orgId, req.user.userId || req.user.id, req.user);
    return ResultEntity.ok(data, 'Employee updated successfully');
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
    return ResultEntity.ok(data, `Employee status updated to ${dto.status}`);
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
    return ResultEntity.created(data, 'Document uploaded successfully');
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

    // `inline` lets the browser preview PDFs/images in the modal viewer.
    // setFile URL-encodes the filename, so a name containing a quote or a
    // newline cannot break out of the Content-Disposition header.
    new ResultEntity()
      .setFile({
        file: stream,
        filename: (document as any).fileName || 'document',
        mime_type: (document as any).mimeType,
        inline: true,
      })
      .sendResponse(res);
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
    return ResultEntity.ok(data, `Document marked ${body.status.toLowerCase()}`);
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
    return ResultEntity.ok(null, result.message);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DELETE)
  async deleteEmployee(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.employeesService.deleteEmployee(id, orgId, req.user.userId, req.user);
    return ResultEntity.ok(null, result.message);
  }
}
