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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { extname } from 'path';
import { RecruitmentService } from './recruitment.service';
import { ApplyJobDto, CreateJobRequisitionDto, UpdateApplicationStatusDto } from './dto/recruitment.dto';

@ApiTags('Recruitment & Public Careers')
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // ==========================================
  // PUBLIC CAREERS & RECRUITMENT ENDPOINTS
  // ==========================================

  @Get('public/company')
  @ApiOperation({ summary: 'Public endpoint to get company mission, values, stats and perks' })
  getCompanyOverview() {
    return this.recruitmentService.getPublicCompanyInfo();
  }

  @Get('public/jobs')
  @ApiOperation({ summary: 'Public endpoint to list active job requisitions and available filters' })
  getPublicJobs(
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('location') location?: string,
  ) {
    return this.recruitmentService.getPublicJobs({ search, department, location });
  }

  @Get('public/jobs/:id')
  @ApiOperation({ summary: 'Public endpoint to view full job specification by ID' })
  getPublicJobById(@Param('id') id: string) {
    return this.recruitmentService.getPublicJobById(id);
  }

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
    return this.recruitmentService.applyForJob(dto, file);
  }

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
  @ApiOperation({ summary: 'List candidate applications for internal recruitment dashboard' })
  getApplications(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('jobId') jobId?: string,
  ) {
    return this.recruitmentService.getAllApplications({ search, status, jobId });
  }

  @Patch('admin/applications/:id/status')
  @ApiOperation({ summary: 'Update candidate pipeline status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.recruitmentService.updateApplicationStatus(id, dto);
  }

  @Get('admin/jobs')
  @ApiOperation({ summary: 'List all job openings for admin dashboard' })
  getAdminJobs() {
    return this.recruitmentService.getAllAdminJobs();
  }

  @Post('admin/jobs')
  @ApiOperation({ summary: 'Create a new job requisition' })
  createJob(@Body() dto: CreateJobRequisitionDto & { description?: string }) {
    return this.recruitmentService.createJobRequisition(dto);
  }

  @Delete('admin/jobs/:id')
  @ApiOperation({ summary: 'Delete a job requisition' })
  deleteJob(@Param('id') id: string) {
    return this.recruitmentService.deleteJobRequisition(id);
  }
}
