import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { OnboardingService } from './onboarding.service';
import { OrganizationService } from '../../organization/organization.service';
import {
  InitializeOnboardingDto,
  UpdateTaskStatusDto,
  CandidateSubmitStepDto,
  QueryOnboardingDto,
} from './dto/onboarding.dto';
import { ResultEntity } from '../../../common/response';

@ApiTags('Lifecycle - Onboarding')
@ApiBearerAuth()
@Controller('lifecycle/onboarding')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) {
      return req.user.organizationId;
    }
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  @Post()
  @ApiOperation({ summary: 'Initialize an onboarding session for an employee' })
  async initialize(@Request() req: any, @Body() dto: InitializeOnboardingDto) {
    const orgId = await this.getOrgId(req);
    const actorId = req.user?.userId || 'system';
    const result = await this.onboardingService.initializeOnboarding(orgId, dto, actorId);
    return ResultEntity.created(result);
  }

  @Get()
  @ApiOperation({ summary: 'Query all onboarding sessions with KPI metrics' })
  async findAll(@Request() req: any, @Query() query: QueryOnboardingDto): Promise<any> {
    const orgId = await this.getOrgId(req);
    const result = await this.onboardingService.findAll(orgId, query);
    return ResultEntity.ok(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full onboarding checklist details by ID' })
  async findById(@Request() req: any, @Param('id') id: string): Promise<any> {
    const orgId = await this.getOrgId(req);
    const result = await this.onboardingService.findById(orgId, id);
    return ResultEntity.ok(result);
  }

  @Patch(':id/tasks/:taskId')
  @ApiOperation({ summary: 'Update an onboarding task status and review comments' })
  async updateTask(
    @Request() req: any,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    const orgId = await this.getOrgId(req);
    const actorId = req.user?.userId || 'system';
    const result = await this.onboardingService.updateTask(orgId, id, taskId, dto, actorId);
    return ResultEntity.ok(result);
  }

  @Post(':id/remind')
  @ApiOperation({ summary: 'Dispatch reminder notifications for pending tasks' })
  async sendReminder(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.onboardingService.sendReminder(orgId, id);
    return ResultEntity.ok(result);
  }
}

@ApiTags('Candidate Self-Service Onboarding')
@ApiBearerAuth()
@Controller('onboarding/candidate')
@UseGuards(JwtAuthGuard)
export class CandidateOnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly orgService: OrganizationService,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) {
      return req.user.organizationId;
    }
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  @Get('me')
  @ApiOperation({ summary: 'Get candidate self-service onboarding checklist' })
  async getMyOnboarding(@Request() req: any): Promise<any> {
    const orgId = await this.getOrgId(req);
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Current user account is not linked to an employee record');
    }
    const result = await this.onboardingService.findByEmployeeId(orgId, employeeId);
    return ResultEntity.ok(result);
  }

  @Post('submit-step')
  @ApiOperation({ summary: 'Candidate submits personal, bank, or policy confirmation' })
  async submitStep(@Request() req: any, @Body() dto: CandidateSubmitStepDto) {
    const orgId = await this.getOrgId(req);
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('Current user account is not linked to an employee record');
    }
    const result = await this.onboardingService.candidateSubmitStep(orgId, employeeId, dto);
    return ResultEntity.ok(result);
  }
}
