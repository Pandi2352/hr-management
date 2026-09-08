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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { OrganizationService } from './organization.service';
import {
  UpdateOrganizationDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  UpdateDepartmentParentDto,
  CreateDesignationDto,
  UpdateDesignationDto,
  CreateLocationDto,
  UpdateLocationDto,
  CreateCostCenterDto,
  UpdateCostCenterDto,
} from './dto/organization.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';
import { ResultEntity } from '../../common/response';

@Controller('organization')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) {
      return req.user.organizationId;
    }
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  // ==========================================
  // 1. ORGANIZATION PROFILE
  // ==========================================
  @Get('profile')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  async getProfile(@Request() req: any) {
    const data = await this.orgService.getProfile(req.user.organizationId);
    return ResultEntity.ok(data);
  }

  @Patch('profile')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  async updateProfile(@Request() req: any, @Body() dto: UpdateOrganizationDto) {
    const data = await this.orgService.updateProfile(dto, req.user.userId, req.user.organizationId);
    return ResultEntity.ok(data, 'Organization profile updated successfully');
  }

  // ==========================================
  // 2. DEPARTMENTS
  // ==========================================
  @Get('departments')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  async getDepartments(
    @Request() req: any,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.orgService.getDepartments(orgId, {
      search,
      status,
      page: paginationQuery.page,
      pageSize: paginationQuery.pageSize,
    });
    if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
      return ResultEntity.ok(result.data, undefined, result.meta);
    }
    return ResultEntity.ok(result);
  }

  @Get('departments/:id')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  async getDepartmentById(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.getDepartmentById(id, orgId);
    return ResultEntity.ok(data);
  }

  @Post('departments')
  @RequirePermissions(PERMISSIONS.ORG_DEPARTMENTS_MANAGE)
  async createDepartment(@Request() req: any, @Body() dto: CreateDepartmentDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.createDepartment(dto, orgId, req.user.userId);
    return ResultEntity.created(data, 'Department created successfully');
  }

  @Patch('departments/:id')
  @RequirePermissions(PERMISSIONS.ORG_DEPARTMENTS_MANAGE)
  async updateDepartment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.updateDepartment(id, dto, orgId, req.user.userId);
    return ResultEntity.ok(data, 'Department updated successfully');
  }

  @Patch('departments/:id/parent')
  @RequirePermissions(PERMISSIONS.ORG_DEPARTMENTS_MANAGE)
  async updateDepartmentParent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentParentDto,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.updateDepartmentParent(
      id,
      dto.parentId || null,
      orgId,
      req.user.userId,
    );
    return ResultEntity.ok(data, 'Department hierarchy updated successfully');
  }

  @Patch('departments/:id/status')
  @RequirePermissions(PERMISSIONS.ORG_DEPARTMENTS_MANAGE)
  async toggleDepartmentStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.toggleDepartmentStatus(id, orgId, req.user.userId);
    return ResultEntity.ok(data, `Department marked as ${data.status.toLowerCase()}`);
  }

  @Delete('departments/:id')
  @RequirePermissions(PERMISSIONS.ORG_DEPARTMENTS_MANAGE)
  async deleteDepartment(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const result = await this.orgService.deleteDepartment(id, orgId, req.user.userId);
    return ResultEntity.ok(result);
  }

  // ==========================================
  // 3. DESIGNATIONS
  // ==========================================
  @Get('designations')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  async getDesignations(
    @Request() req: any,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.orgService.getDesignations(orgId, {
      search,
      status,
      page: paginationQuery.page,
      pageSize: paginationQuery.pageSize,
    });
    if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
      return ResultEntity.ok(result.data, undefined, result.meta);
    }
    return ResultEntity.ok(result);
  }

  @Post('designations')
  @RequirePermissions(PERMISSIONS.ORG_DESIGNATIONS_MANAGE)
  async createDesignation(@Request() req: any, @Body() dto: CreateDesignationDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.createDesignation(dto, orgId, req.user.userId);
    return ResultEntity.created(data, 'Designation created successfully');
  }

  @Patch('designations/:id')
  @RequirePermissions(PERMISSIONS.ORG_DESIGNATIONS_MANAGE)
  async updateDesignation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDesignationDto,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.updateDesignation(id, dto, orgId, req.user.userId);
    return ResultEntity.ok(data, 'Designation updated successfully');
  }

  @Patch('designations/:id/status')
  @RequirePermissions(PERMISSIONS.ORG_DESIGNATIONS_MANAGE)
  async toggleDesignationStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.toggleDesignationStatus(id, orgId, req.user.userId);
    return ResultEntity.ok(data, `Designation marked as ${data.status.toLowerCase()}`);
  }

  // ==========================================
  // 4. LOCATIONS
  // ==========================================
  @Get('locations')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  async getLocations(
    @Request() req: any,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.orgService.getLocations(orgId, {
      search,
      status,
      page: paginationQuery.page,
      pageSize: paginationQuery.pageSize,
    });
    if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
      return ResultEntity.ok(result.data, undefined, result.meta);
    }
    return ResultEntity.ok(result);
  }

  @Post('locations')
  @RequirePermissions(PERMISSIONS.ORG_LOCATIONS_MANAGE)
  async createLocation(@Request() req: any, @Body() dto: CreateLocationDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.createLocation(dto, orgId, req.user.userId);
    return ResultEntity.created(data, 'Location created successfully');
  }

  @Patch('locations/:id')
  @RequirePermissions(PERMISSIONS.ORG_LOCATIONS_MANAGE)
  async updateLocation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.updateLocation(id, dto, orgId, req.user.userId);
    return ResultEntity.ok(data, 'Location updated successfully');
  }

  @Patch('locations/:id/status')
  @RequirePermissions(PERMISSIONS.ORG_LOCATIONS_MANAGE)
  async toggleLocationStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.toggleLocationStatus(id, orgId, req.user.userId);
    return ResultEntity.ok(data, `Location marked as ${data.status.toLowerCase()}`);
  }

  // ==========================================
  // 5. COST CENTERS
  // ==========================================
  @Get('cost-centers')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  async getCostCenters(
    @Request() req: any,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const orgId = await this.getOrgId(req);
    const result = await this.orgService.getCostCenters(orgId, {
      search,
      status,
      page: paginationQuery.page,
      pageSize: paginationQuery.pageSize,
    });
    if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
      return ResultEntity.ok(result.data, undefined, result.meta);
    }
    return ResultEntity.ok(result);
  }

  @Post('cost-centers')
  @RequirePermissions(PERMISSIONS.ORG_COST_CENTERS_MANAGE)
  async createCostCenter(@Request() req: any, @Body() dto: CreateCostCenterDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.createCostCenter(dto, orgId, req.user.userId);
    return ResultEntity.created(data, 'Cost Center created successfully');
  }

  @Patch('cost-centers/:id')
  @RequirePermissions(PERMISSIONS.ORG_COST_CENTERS_MANAGE)
  async updateCostCenter(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
  ) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.updateCostCenter(id, dto, orgId, req.user.userId);
    return ResultEntity.ok(data, 'Cost Center updated successfully');
  }

  @Patch('cost-centers/:id/status')
  @RequirePermissions(PERMISSIONS.ORG_COST_CENTERS_MANAGE)
  async toggleCostCenterStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.toggleCostCenterStatus(id, orgId, req.user.userId);
    return ResultEntity.ok(data, `Cost Center marked as ${data.status.toLowerCase()}`);
  }
}
