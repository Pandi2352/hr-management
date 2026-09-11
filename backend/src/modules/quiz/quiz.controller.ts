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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResultEntity } from '../../common/response';
import { QuizService } from './quiz.service';
import { QuizAuthoringService } from './quiz-authoring.service';
import { QUIZ_TEMPLATES } from './quiz-templates';
import { QUIZ_LOCALE_LABELS, QUIZ_LOCALES } from './schemas/quiz.schema';
import {
  CreateQuizDto,
  GenerateAiQuizDto,
  EnhanceQuizPromptDto,
  AssignQuizDto,
  SubmitQuizAttemptDto,
  DiagnoseQuestionDto,
  RegenerateQuestionDto,
  UpdateQuizDto,
  ReviewQuizDto,
  AddBankQuestionDto,
  PullFromBankDto,
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
    private readonly authoringService: QuizAuthoringService,
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

  /**
   * Categories already in use, for the studio's picker.
   *
   * Read-only and derived, so it needs no write endpoint: a category exists
   * because a quiz uses it.
   */
  @Get('categories')
  @ApiOperation({ summary: 'Quiz categories in use, with counts' })
  async listCategories(@Request() req: any) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(await this.quizService.listCategories(orgId));
  }

  /** The five starting points, with the settings that differ by purpose. */
  @Get('templates')
  @ApiOperation({ summary: 'Quiz templates' })
  async listTemplates() {
    return ResultEntity.ok(QUIZ_TEMPLATES);
  }

  /** Languages a quiz can be generated in. */
  @Get('locales')
  @ApiOperation({ summary: 'Supported quiz languages' })
  async listLocales() {
    return ResultEntity.ok(
      QUIZ_LOCALES.map((code) => ({ code, label: QUIZ_LOCALE_LABELS[code] })),
    );
  }

  // --- Authoring -----------------------------------------------------------

  /**
   * The Question Doctor.
   *
   * Stateless on purpose: it reviews a question as posted, so it works on a
   * draft in the editor before anything has been saved.
   */
  @Post('question-doctor')
  @ApiOperation({ summary: 'Review one question: clarity, ambiguity, distractors, rewrite' })
  async diagnoseQuestion(@Request() req: any, @Body() dto: DiagnoseQuestionDto) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(await this.authoringService.diagnoseQuestion(orgId, dto));
  }

  @Post(':id/questions/:index/regenerate')
  @ApiOperation({ summary: 'Rewrite one question, keeping the rest of the quiz as context' })
  async regenerateQuestion(
    @Request() req: any,
    @Param('id') quizId: string,
    @Param('index') index: string,
    @Body() dto: RegenerateQuestionDto,
  ) {
    const orgId = await this.getOrgId(req);
    const quiz = await this.authoringService.regenerateQuestion(
      orgId,
      quizId,
      Number(index),
      dto.instruction,
    );
    return ResultEntity.ok(quiz, 'Question regenerated');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a quiz that is not yet published' })
  async updateQuiz(@Request() req: any, @Param('id') quizId: string, @Body() dto: UpdateQuizDto) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(await this.quizService.updateQuiz(orgId, quizId, dto), 'Quiz updated');
  }

  // --- Review before publish ----------------------------------------------

  @Post(':id/submit-for-review')
  @ApiOperation({ summary: 'Move a draft into review' })
  async submitForReview(@Request() req: any, @Param('id') quizId: string) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(
      await this.quizService.transition(orgId, quizId, 'IN_REVIEW', req.user),
      'Sent for review',
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a reviewed quiz, making it assignable' })
  async approveQuiz(@Request() req: any, @Param('id') quizId: string, @Body() dto: ReviewQuizDto) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(
      await this.quizService.transition(orgId, quizId, 'APPROVED', req.user, dto.note),
      'Quiz approved',
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Send a quiz back to draft with a note' })
  async rejectQuiz(@Request() req: any, @Param('id') quizId: string, @Body() dto: ReviewQuizDto) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(
      await this.quizService.transition(orgId, quizId, 'DRAFT', req.user, dto.note),
      'Sent back to draft',
    );
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish an approved quiz into the arena' })
  async publishQuiz(@Request() req: any, @Param('id') quizId: string) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(
      await this.quizService.transition(orgId, quizId, 'PUBLISHED', req.user),
      'Quiz published',
    );
  }

  // --- Question bank -------------------------------------------------------

  @Get('bank')
  @ApiOperation({ summary: 'Browse approved questions' })
  async listBank(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(
      await this.authoringService.listBank(orgId, { category, difficulty, tag, search }),
    );
  }

  @Post('bank')
  @ApiOperation({ summary: 'Keep a reviewed question for reuse' })
  async addToBank(@Request() req: any, @Body() dto: AddBankQuestionDto) {
    const orgId = await this.getOrgId(req);
    const userId = req.user?.userId || req.user?.id || '';
    const userName = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ');
    return ResultEntity.ok(
      await this.authoringService.addToBank(orgId, userId, userName, dto),
      'Saved to the question bank',
    );
  }

  @Delete('bank/:id')
  @ApiOperation({ summary: 'Remove a question from the bank' })
  async removeFromBank(@Request() req: any, @Param('id') id: string) {
    const orgId = await this.getOrgId(req);
    await this.authoringService.removeFromBank(orgId, id);
    return ResultEntity.ok({ removed: true }, 'Removed from the bank');
  }

  @Post(':id/pull-from-bank')
  @ApiOperation({ summary: 'Copy banked questions into a quiz' })
  async pullFromBank(@Request() req: any, @Param('id') quizId: string, @Body() dto: PullFromBankDto) {
    const orgId = await this.getOrgId(req);
    return ResultEntity.ok(
      await this.authoringService.pullFromBank(orgId, quizId, dto.bankIds),
      'Questions added',
    );
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
    const employeeId = await this.getEmployeeId(req, orgId);
    const data = await this.quizService.getQuizForPlay(orgId, quizId, employeeId);
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
