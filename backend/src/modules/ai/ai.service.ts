import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobApplication, JobApplicationDocument } from '../recruitment/schemas/job-application.schema';
import { JobVacancy, JobVacancyDocument } from '../recruitment/schemas/job-vacancy.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { LoggerHelper } from '../../common/logger';
import { aiConfig, type AiModuleConfig, type AiProviderId } from './config/ai.config';
import { OpenAiProvider } from './providers/openai.provider';
import { OpencodeProvider } from './providers/opencode.provider';
import type { AiProvider } from './providers/ai-provider.interface';

export interface ProviderStatus {
  id: AiProviderId;
  displayName: string;
  configured: boolean;
  model: string;
  isDefault: boolean;
  hint: string;
}

@Injectable()
export class AiService {
  private readonly logger = LoggerHelper.Instance.child(AiService.name);
  private readonly moduleCfg: AiModuleConfig;
  private readonly providers: Record<AiProviderId, AiProvider>;

  constructor(
    configService: ConfigService,
    @InjectModel(JobApplication.name) private readonly applicationModel: Model<JobApplicationDocument>,
    @InjectModel(JobVacancy.name) private readonly vacancyModel: Model<JobVacancyDocument>,
    private readonly auditService: AuditService,
  ) {
    this.moduleCfg = aiConfig(configService);
    this.providers = {
      openai: new OpenAiProvider(configService),
      opencode: new OpencodeProvider(configService),
    };
  }

  isEnabled(): boolean {
    return this.moduleCfg.enabled;
  }

  /** Default provider, validated as configured (copilot entry point). */
  defaultProvider(): AiProvider {
    return this.pickProvider(undefined);
  }

  listProviders(): ProviderStatus[] {    return (Object.keys(this.providers) as AiProviderId[]).map((id) => {
      const provider = this.providers[id];
      const configured = this.isEnabled() && provider.isConfigured();
      return {
        id,
        displayName: provider.displayName,
        configured,
        model: provider.modelLabel(),
        isDefault: this.moduleCfg.defaultProvider === id,
        hint:
          id === 'openai'
            ? 'Set OPENAI_API_KEY to enable.'
            : 'Run `opencode serve` (default http://localhost:4096).',
      };
    });
  }

  /**
   * Live connectivity test for the in-menu Test button. Always resolves —
   * failures are data (`{ok: false}`), never throws (except unknown id or
   * globally disabled AI).
   */
  async testProvider(id: AiProviderId): Promise<{ ok: boolean; latencyMs: number; detail: string }> {
    if (!this.isEnabled()) {
      throw new BadRequestException('AI features are disabled (AI_ENABLED=false).');
    }
    const provider = this.providers[id];
    if (!provider) throw new BadRequestException(`Unknown AI provider "${id}".`);
    return provider.test();
  }

  private pickProvider(requested?: AiProviderId): AiProvider {
    if (!this.isEnabled()) {
      throw new BadRequestException('AI features are disabled (AI_ENABLED=false).');
    }
    let id = requested || this.moduleCfg.defaultProvider;
    let provider = this.providers[id];
    if (!provider) throw new BadRequestException(`Unknown AI provider "${id}".`);
    if (!provider.isConfigured()) {
      const fallbackId = (Object.keys(this.providers) as AiProviderId[]).find(
        (k) => k !== id && this.providers[k]?.isConfigured(),
      );
      if (fallbackId) {
        provider = this.providers[fallbackId];
      } else {
        throw new BadRequestException(
          `${provider.displayName} is not configured. ${id === 'openai' ? 'Set OPENAI_API_KEY.' : 'Start `opencode serve` or set OPENCODE_BASE_URL.'}`,
        );
      }
    }
    return provider;
  }

  /**
   * Scores a candidate for HR shortlisting and stores the snapshot on the
   * application. Resume files are binary (PDF/DOCX) — scoring uses the
   * structured application fields until document parsing lands.
   */
  async scoreCandidate(applicationId: string, providerId: AiProviderId | undefined, orgId: string | null, actorId: string) {
    const provider = this.pickProvider(providerId);
    const application: any = await this.applicationModel.findById(applicationId).lean();
    if (!application) throw new NotFoundException('Candidate application not found.');
    if (['HIRED', 'REJECTED', 'WITHDRAWN'].includes(application.status)) {
      throw new BadRequestException(`Application is already ${application.status.toLowerCase()}.`);
    }

    const vacancy: any = await this.vacancyModel.findById(application.jobId).lean().catch(() => null);
    let result;
    try {
      result = await provider.shortlist({
        jobTitle: application.jobTitle,
        department: application.department,
        location: vacancy?.location || '',
        overview: vacancy?.overview || '',
        requirements: vacancy?.requirements || [],
        experienceLevel: vacancy?.experienceLevel || '',
        candidateName: application.fullName,
        candidateEmail: application.email,
        candidatePhone: application.phone,
        yearsExperience: application.yearsExperience || '',
        earliestStartDate: application.earliestStartDate || '',
        coverLetter: application.coverLetter || '',
      });
    } catch (err: unknown) {
      // Upstream AI failures surface as 502 with the provider's own message
      // (the global filter hides plain-Error text behind a generic 500).
      const message = err instanceof Error ? err.message : 'AI provider request failed.';
      throw new HttpException({ message }, HttpStatus.BAD_GATEWAY);
    }

    const updated = await this.applicationModel.findByIdAndUpdate(
      applicationId,
      {
        aiScore: result.score,
        aiRecommendation: result.recommendation,
        aiSummary: result.summary,
        aiStrengths: result.strengths,
        aiGaps: result.gaps,
        aiProvider: provider.id,
        aiScoredAt: new Date(),
      },
      { new: true },
    );

    await this.auditService.record({
      action: AuditAction.CREATE,
      resourceType: AuditResource.CANDIDATE,
      resourceId: applicationId,
      organizationId: orgId,
      actorUserId: actorId,
      description: `AI shortlist (${provider.id}): ${application.fullName} scored ${result.score} — ${result.recommendation}`,
      after: { score: result.score, recommendation: result.recommendation, provider: provider.id },
    });

    this.logger.info(null, 'Candidate scored', { applicationId, provider: provider.id, score: result.score });
    return updated;
  }
}
