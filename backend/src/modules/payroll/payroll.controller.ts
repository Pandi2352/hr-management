import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { ResultEntity } from '../../common/response';
import { OrganizationService } from '../organization/organization.service';
import { PayrollService } from './payroll.service';
import {
  CreatePayrollDto,
  PayrollQueryDto,
  SendPayslipDto,
  UpdatePayrollDto,
} from './dto/payroll.dto';

@ApiTags('Payroll')
@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) return req.user.organizationId;
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  @Get('employees')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ApiOperation({ summary: 'Employees selectable for a payroll period, flagged if already processed' })
  async eligibleEmployees(
    @Request() req: any,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    const orgId = await this.getOrgId(req);
    const now = new Date();
    const data = await this.payrollService.getEligibleEmployees(
      orgId,
      Number(month) || now.getMonth() + 1,
      Number(year) || now.getFullYear(),
    );
    return ResultEntity.ok(data);
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'Yearly payroll totals, monthly trend and component breakdown' })
  async summary(@Request() req: any, @Query('year') year?: number) {
    const orgId = await this.getOrgId(req);
    const data = await this.payrollService.getSummary(
      orgId,
      Number(year) || new Date().getFullYear(),
    );
    return ResultEntity.ok(data);
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'Export the filtered payroll register as CSV' })
  async exportCsv(
    @Request() req: any,
    @Query() query: PayrollQueryDto,
    @Response() res: any,
  ) {
    const orgId = await this.getOrgId(req);
    const csv = await this.payrollService.exportCsv(orgId, query);
    const period = query.year ? `-${query.year}${query.month ? `-${query.month}` : ''}` : '';

    new ResultEntity()
      .setCSV({ csv, filename: `payroll-register${period}.csv` })
      .sendResponse(res);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'Paginated payroll register' })
  async findAll(@Request() req: any, @Query() query: PayrollQueryDto) {
    const orgId = await this.getOrgId(req);
    const result = await this.payrollService.findAll(orgId, query);
    return ResultEntity.ok(result.data, undefined, result.meta);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'Single payroll record with its full breakdown' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(await this.payrollService.findById(id, orgId));
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ApiOperation({ summary: 'Process payroll for one employee for a period' })
  async create(@Request() req: any, @Body() dto: CreatePayrollDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.payrollService.create(dto, orgId, req.user.userId);
    return ResultEntity.created(
      data,
      dto.sendPayslip
        ? `Payroll processed for ${data.employeeName} and the payslip was dispatched.`
        : `Payroll processed for ${data.employeeName}.`,
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ApiOperation({ summary: 'Amend a payroll record; totals are recomputed' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePayrollDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.payrollService.update(id, dto, orgId, req.user.userId);
    return ResultEntity.ok(data, 'Payroll record updated');
  }

  @Post(':id/send-payslip')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ApiOperation({ summary: 'Email the payslip to the employee' })
  async sendPayslip(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SendPayslipDto,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.payrollService.sendPayslip(
      id,
      orgId,
      req.user.userId,
      dto?.email,
    );
    return ResultEntity.ok(result, result.message);
  }

  @Post('send-payslips')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ApiOperation({ summary: 'Email payslips for every processed record in a period' })
  async sendPayslipsForPeriod(
    @Request() req: any,
    @Body() body: { month: number; year: number },
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.payrollService.sendPayslipsForPeriod(
      orgId,
      Number(body.month),
      Number(body.year),
      req.user.userId,
    );
    return ResultEntity.ok(
      result,
      `${result.sent} of ${result.total} payslips dispatched.`,
    );
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.PAYROLL_MANAGE)
  @ApiOperation({ summary: 'Remove a payroll record (soft delete, stays auditable)' })
  async remove(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.payrollService.remove(id, orgId, req.user.userId);
    return ResultEntity.ok(null, result.message);
  }
}
