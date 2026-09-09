import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { extname } from 'path';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Public } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/roles.decorator';
import { PERMISSIONS } from '../../common/constants';
import { RecruitmentService } from './recruitment.service';
import { ApplyJobDto, CreateJobRequisitionDto, UpdateApplicationStatusDto } from './dto/recruitment.dto';
import { ResultEntity } from '../../common/response';

@ApiTags('Recruitment & Public Careers')
@Controller('recruitment')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // ==========================================
  // PUBLIC CAREERS & RECRUITMENT ENDPOINTS
  // ==========================================

  @Public()
  @Get('public/company')
  @ApiOperation({ summary: 'Public endpoint to get company mission, values, stats and perks' })
  async getCompanyOverview() {
    const result = await this.recruitmentService.getPublicCompanyInfo();
    return ResultEntity.ok(result);
  }

  @Public()
  @Get('public/jobs')
  @ApiOperation({ summary: 'Public endpoint to list active job requisitions and available filters' })
  async getPublicJobs(
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('location') location?: string,
  ) {
    const result = await this.recruitmentService.getPublicJobs({ search, department, location });
    return ResultEntity.ok(result);
  }

  @Public()
  @Get('public/jobs/:id')
  @ApiOperation({ summary: 'Public endpoint to view full job specification by ID' })
  async getPublicJobById(@Param('id') id: string) {
    const result = await this.recruitmentService.getPublicJobById(id);
    return ResultEntity.ok(result);
  }

  @Public()
  @Post('public/apply')
  @UseInterceptors(
    FileInterceptor('resume', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  @ApiOperation({ summary: 'Public candidate application submission with resume upload' })
  async applyForJob(
    @Body() dto: ApplyJobDto,
    @UploadedFile() file: any,
  ) {
    const result = await this.recruitmentService.applyForJob(dto, file);
    return ResultEntity.created(result);
  }

  @Public()
  @Get('resume/:filename')
  @ApiOperation({ summary: 'Stream or download uploaded candidate resume' })
  serveResume(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const filePath = this.recruitmentService.getResumeFilePath(filename);
      const ext = extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      createReadStream(filePath).pipe(res);
    } catch {
      throw new NotFoundException('Resume document not found or unavailable.');
    }
  }

  // ==========================================
  // INTERNAL PIPELINE RECRUITMENT ENDPOINTS
  // ==========================================

  @Get('admin/applications')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  @ApiOperation({ summary: 'List candidate applications for internal recruitment dashboard' })
  async getApplications(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('jobId') jobId?: string,
  ) {
    const result = await this.recruitmentService.getAllApplications({ search, status, jobId });
    return ResultEntity.ok(result);
  }

  @Patch('admin/applications/:id/status')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Update candidate pipeline status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    const result = await this.recruitmentService.updateApplicationStatus(id, dto);
    return ResultEntity.ok(result);
  }

  @Get('admin/jobs')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_READ)
  @ApiOperation({ summary: 'List all job openings for admin dashboard' })
  async getAdminJobs() {
    const result = await this.recruitmentService.getAllAdminJobs();
    return ResultEntity.ok(result);
  }

  @Post('admin/jobs')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Create a new job requisition' })
  async createJob(@Body() dto: CreateJobRequisitionDto & { description?: string }) {
    const result = await this.recruitmentService.createJobRequisition(dto);
    return ResultEntity.created(result);
  }

  @Delete('admin/jobs/:id')
  @RequirePermissions(PERMISSIONS.RECRUITMENT_MANAGE)
  @ApiOperation({ summary: 'Delete a job requisition' })
  async deleteJob(@Param('id') id: string) {
    const result = await this.recruitmentService.deleteJobRequisition(id);
    return ResultEntity.ok(result);
  }
}
