import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResultEntity } from '../../common/response';
import { QuizService } from './quiz.service';
import {
  CreateQuizDto,
  GenerateAiQuizDto,
  EnhanceQuizPromptDto,
  AssignQuizDto,
  SubmitQuizAttemptDto,
} from './dto/quiz.dto';
import { OrganizationService } from '../organization/organization.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';

@ApiTags('Quizzes & Gamification')
@Controller('quizzes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
    private readonly orgService: OrganizationService,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  private async getOrgId(req: any): Promise<string> {
    if (req.user?.organizationId) return req.user.organizationId;
    const defaultOrg = await this.orgService.getProfile();
    return defaultOrg._id;
  }

  private async getEmployeeId(req: any, orgId: string): Promise<string> {
    if (req.user?.employeeId) return req.user.employeeId;
    const userId = req.user?.userId || req.user?.id;
    const emp = await this.employeeModel.findOne({ organizationId: orgId, userId }).select('_id').lean();
    return emp ? String(emp._id) : userId;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quiz (HR / Manager)' })
  async createQuiz(@Request() req: any, @Body() dto: CreateQuizDto) {
    const orgId = await this.getOrgId(req);
    const userId = req.user?.userId || req.user?.id;
    const userName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email : 'HR Manager';
    const data = await this.quizService.createQuiz(orgId, userId, userName, dto);
    return ResultEntity.ok(data, 'Quiz created successfully.');
  }

  @Post('enhance-prompt')
  @ApiOperation({ summary: 'Enhance and structure a raw quiz topic prompt with AI' })
  async enhancePrompt(@Request() req: any, @Body() dto: EnhanceQuizPromptDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.quizService.enhancePrompt(orgId, dto);
    return ResultEntity.ok(data, 'Prompt enhanced successfully.');
  }

  @Post('generate-ai')
  @ApiOperation({ summary: 'Generate a quiz with active AI Quiz Master Agent' })
  async generateAiQuiz(@Request() req: any, @Body() dto: GenerateAiQuizDto) {
    const orgId = await this.getOrgId(req);
    const data = await this.quizService.generateWithAi(orgId, dto);
    return ResultEntity.ok(data, 'AI generated quiz draft ready.');
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a quiz to employees or ALL employees company-wide' })
  async assignQuiz(@Request() req: any, @Param('id') quizId: string, @Body() dto: AssignQuizDto) {
    const orgId = await this.getOrgId(req);
    const assignedBy = req.user?.userId || req.user?.id;
    const data = await this.quizService.assignQuiz(orgId, assignedBy, quizId, dto);
    return ResultEntity.ok(
      data,
      dto.assignAll
        ? `Quiz assigned to all ${data.assignedCount} active employees company-wide!`
        : `Quiz assigned to ${data.assignedCount} selected employees.`,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all quizzes in the organization (HR / Manager)' })
  async listQuizzes(@Request() req: any, @Query('category') category?: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.quizService.listQuizzes(orgId, category);
    return ResultEntity.ok(data);
  }

  @Get('my-assignments')
  @ApiOperation({ summary: 'Get quizzes assigned to the current employee' })
  async getMyAssignments(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const employeeId = await this.getEmployeeId(req, orgId);
    const data = await this.quizService.getMyAssignments(orgId, employeeId);
    return ResultEntity.ok(data);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get gamification leaderboard rankings' })
  async getLeaderboard(@Request() req: any, @Query('departmentId') departmentId?: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.quizService.getLeaderboard(orgId, departmentId);
    return ResultEntity.ok(data);
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get current employee XP, badges, streak, and rank' })
  async getMyStats(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    const employeeId = await this.getEmployeeId(req, orgId);
    const data = await this.quizService.getMyStats(orgId, employeeId);
    return ResultEntity.ok(data);
  }

  @Get(':id/play')
  @ApiOperation({ summary: 'Get quiz questions for taking a quiz session' })
  async getQuizForPlay(@Request() req: any, @Param('id') quizId: string) {
    const orgId = await this.getOrgId(req);
    const data = await this.quizService.getQuizForPlay(orgId, quizId);
    return ResultEntity.ok(data);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit quiz answers, grade attempt, and award XP' })
  async submitAttempt(
    @Request() req: any,
    @Param('id') quizId: string,
    @Body() dto: SubmitQuizAttemptDto,
  ) {
    const orgId = await this.getOrgId(req);
    const employeeId = await this.getEmployeeId(req, orgId);
    const data = await this.quizService.submitAttempt(orgId, employeeId, quizId, dto);
    return ResultEntity.ok(data, data.passed ? 'Congratulations! You passed the quiz!' : 'Quiz submitted.');
  }
}
