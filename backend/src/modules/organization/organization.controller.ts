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
    return { success: true, data };
  }

  @Patch('profile')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_WRITE)
  async updateProfile(@Request() req: any, @Body() dto: UpdateOrganizationDto) {
    const data = await this.orgService.updateProfile(dto, req.user.userId, req.user.organizationId);
    return { success: true, message: 'Organization profile updated successfully', data };
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
      return { success: true, data: result.data, meta: result.meta };
    }
    return { success: true, data: result };
  }

  @Get('departments/:id')
  @RequirePermissions(PERMISSIONS.ORG_PROFILE_READ)
  async getDepartmentById(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.getDepartmentById(id, orgId);
    return { success: true, data };
  }

  @Post('departments')
  @RequirePermissions(PERMISSIONS.ORG_DEPARTMENTS_MANAGE)
  async createDepartment(@Request() req: any, @Body() dto: CreateDepartmentDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.createDepartment(dto, orgId, req.user.userId);
    return { success: true, message: 'Department created successfully', data };
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
    return { success: true, message: 'Department updated successfully', data };
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
    return { success: true, message: 'Department hierarchy updated successfully', data };
  }

  @Patch('departments/:id/status')
  @RequirePermissions(PERMISSIONS.ORG_DEPARTMENTS_MANAGE)
  async toggleDepartmentStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.toggleDepartmentStatus(id, orgId, req.user.userId);
    return { success: true, message: `Department marked as ${data.status.toLowerCase()}`, data };
  }

  @Delete('departments/:id')
  @RequirePermissions(PERMISSIONS.ORG_DEPARTMENTS_MANAGE)
  async deleteDepartment(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    return this.orgService.deleteDepartment(id, orgId, req.user.userId);
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
      return { success: true, data: result.data, meta: result.meta };
    }
    return { success: true, data: result };
  }

  @Post('designations')
  @RequirePermissions(PERMISSIONS.ORG_DESIGNATIONS_MANAGE)
  async createDesignation(@Request() req: any, @Body() dto: CreateDesignationDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.createDesignation(dto, orgId, req.user.userId);
    return { success: true, message: 'Designation created successfully', data };
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
    return { success: true, message: 'Designation updated successfully', data };
  }

  @Patch('designations/:id/status')
  @RequirePermissions(PERMISSIONS.ORG_DESIGNATIONS_MANAGE)
  async toggleDesignationStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.toggleDesignationStatus(id, orgId, req.user.userId);
    return { success: true, message: `Designation marked as ${data.status.toLowerCase()}`, data };
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
      return { success: true, data: result.data, meta: result.meta };
    }
    return { success: true, data: result };
  }

  @Post('locations')
  @RequirePermissions(PERMISSIONS.ORG_LOCATIONS_MANAGE)
  async createLocation(@Request() req: any, @Body() dto: CreateLocationDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.createLocation(dto, orgId, req.user.userId);
    return { success: true, message: 'Location created successfully', data };
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
    return { success: true, message: 'Location updated successfully', data };
  }

  @Patch('locations/:id/status')
  @RequirePermissions(PERMISSIONS.ORG_LOCATIONS_MANAGE)
  async toggleLocationStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.toggleLocationStatus(id, orgId, req.user.userId);
    return { success: true, message: `Location marked as ${data.status.toLowerCase()}`, data };
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
      return { success: true, data: result.data, meta: result.meta };
    }
    return { success: true, data: result };
  }

  @Post('cost-centers')
  @RequirePermissions(PERMISSIONS.ORG_COST_CENTERS_MANAGE)
  async createCostCenter(@Request() req: any, @Body() dto: CreateCostCenterDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.createCostCenter(dto, orgId, req.user.userId);
    return { success: true, message: 'Cost Center created successfully', data };
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
    return { success: true, message: 'Cost Center updated successfully', data };
  }

  @Patch('cost-centers/:id/status')
  @RequirePermissions(PERMISSIONS.ORG_COST_CENTERS_MANAGE)
  async toggleCostCenterStatus(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.orgService.toggleCostCenterStatus(id, orgId, req.user.userId);
    return { success: true, message: `Cost Center marked as ${data.status.toLowerCase()}`, data };
  }
}
