import { useEffect, useState } from 'react';
import { CalendarPlus, Check, ExternalLink, FileText, Send, UserCheck, X } from 'lucide-react';
import { Avatar, Button } from '../../../components/ui';
import { Drawer } from '../../../components/overlay/Drawer';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { pipelineApi } from '../api/pipeline.api';
import { NEXT_STAGES, type CandidateDetail, type Interview } from '../types/pipeline.types';
import { CandidateAiScore } from '../../ai/components/CandidateAiScore';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { FeedbackModal } from './FeedbackModal';
import { OfferModal } from './OfferModal';
import { HireModal } from './HireModal';
import { cn } from '../../../utils/cn';

function StageTimeline({ current }: { current: string }) {
  const order = ['APPLIED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'HIRED'];
  const terminal = current === 'REJECTED' || current === 'WITHDRAWN';
  const idx = order.indexOf(current);
  return (
    <div className="flex items-center gap-1">
      {order.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-1 last:flex-none">
          <span
            title={s}
            className={cn(
              'h-2 flex-1 rounded-full',
              terminal
                ? 'bg-slate-200 dark:bg-slate-800'
                : i <= idx
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-500'
                  : 'bg-slate-200 dark:bg-slate-800',
            )}
          />
        </div>
      ))}
      <span className={cn(
        'ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap',
        current === 'HIRED'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
          : terminal
            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
            : 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
      )}>
        {current}
      </span>
    </div>
  );
}

export function CandidateDetailDrawer({
  candidateId,
  onClose,
  onChanged,
}: {
  candidateId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<Interview | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [hireOpen, setHireOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const load = async (id: string) => {
    setIsLoading(true);
    try {
      setDetail(await pipelineApi.detail(id));
    } catch {
      toast.error('Could not load candidate.');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) load(candidateId);
    else setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const refresh = async () => {
    if (detail) setDetail(await pipelineApi.detail(detail._id).catch(() => detail));
    onChanged();
  };

  const move = async (to: string) => {
    if (!detail) return;
    setIsWorking(true);
    try {
      await pipelineApi.moveStage(detail._id, to as never);
      toast.success(`Moved to ${to.toLowerCase()}.`);
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not move stage.');
    } finally {
      setIsWorking(false);
    }
  };

  const decideOffer = async (decision: string) => {
    if (!detail?.offer) return;
    setIsWorking(true);
    try {
      await pipelineApi.decideOffer(detail.offer._id, decision);
      toast.success(`Offer ${decision.toLowerCase()}.`);
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not record decision.');
    } finally {
      setIsWorking(false);
    }
  };

  const nextStages = detail ? NEXT_STAGES[detail.status] || [] : [];

  return (
    <Drawer
      isOpen={!!candidateId}
      onClose={onClose}
      title={detail ? detail.fullName : 'Candidate'}
      description={detail ? `${detail.jobTitle} · ${detail.email}` : undefined}
    >
      {isLoading || !detail ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={detail.fullName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{detail.fullName}</p>
              <p className="truncate text-[11px] text-slate-400">
                {detail.phone} · {detail.yearsExperience || '—'} exp
              </p>
            </div>
            {detail.resumeUrl && (
              <a
                href={detail.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold hover:bg-slate-50 dark:border-slate-700"
              >
                <FileText className="h-3.5 w-3.5" /> Resume <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <StageTimeline current={detail.status} />

          <CandidateAiScore
            applicationId={detail._id}
            score={
              detail.aiScore !== undefined && detail.aiScore !== null
                ? {
                    aiScore: detail.aiScore,
                    aiRecommendation: detail.aiRecommendation as never,
                    aiSummary: detail.aiSummary,
                    aiStrengths: detail.aiStrengths,
                    aiGaps: detail.aiGaps,
                    aiProvider: detail.aiProvider,
                    aiScoredAt: detail.aiScoredAt,
                  }
                : null
            }
            onScored={refresh}
          />

          {/* Stage actions */}
          {detail.status !== 'HIRED' && nextStages.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {nextStages.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === 'REJECTED' || s === 'WITHDRAWN' ? 'outline' : 'primary'}
                  onClick={() => move(s)}
                  disabled={isWorking}
                  className={s === 'REJECTED' ? 'text-rose-600' : ''}
                >
                  {s === 'SHORTLISTED' ? 'Shortlist' : s === 'INTERVIEWING' ? 'To Interview' : s === 'OFFERED' ? 'To Offer' : s === 'REJECTED' ? 'Reject' : 'Withdraw'}
                </Button>
              ))}
            </div>
          )}

          {/* Interviews */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase">Interviews</h4>
              {(detail.status === 'SHORTLISTED' || detail.status === 'INTERVIEWING') && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline"
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> Schedule round
                </button>
              )}
            </div>
            {detail.interviews.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No rounds scheduled yet.</p>
            ) : (
              <div className="space-y-2">
                {detail.interviews.map((iv) => (
                  <div key={iv._id} className="rounded-md border border-hairline bg-surface-2/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-bold">
                        {iv.title} <span className="font-medium text-ink-3">· {iv.interviewerName}</span>
                      </p>
                      <span className="rounded-full bg-surface-3 px-1.5 py-px text-[10px] font-bold text-ink-3">
                        {iv.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {iv.scheduledDate} · {iv.scheduledTime} · {iv.mode}
                      {iv.location ? ` · ${iv.location}` : ''}
                    </p>
                    {iv.status === 'COMPLETED' ? (
                      <p className="mt-1 text-[11px]">
                        <span className="font-bold text-amber-500">{iv.rating ? `${iv.rating}/5` : ''}</span>{' '}
                        <span className="font-bold">{iv.recommendation}</span>
                        {iv.feedback && <span className="text-ink-3"> — {iv.feedback}</span>}
                      </p>
                    ) : (
                      iv.status === 'SCHEDULED' && (
                        <button
                          type="button"
                          onClick={() => setFeedbackTarget(iv)}
                          className="mt-1.5 cursor-pointer text-[11px] font-semibold text-[var(--primary)] hover:underline"
                        >
                          Submit scorecard
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offer */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase">Offer</h4>
              {(detail.status === 'INTERVIEWING' || detail.status === 'OFFERED') && !detail.offer && (
                <button
                  type="button"
                  onClick={() => setOfferOpen(true)}
                  className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline"
                >
                  <Send className="h-3.5 w-3.5" /> Send offer
                </button>
              )}
            </div>
            {!detail.offer ? (
              <p className="text-[11px] text-slate-400 italic">No offer yet.</p>
            ) : (
              <div className="rounded-md border border-hairline p-2.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{detail.offer.salaryOffered || 'Salary on request'}</p>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                    {detail.offer.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  {detail.offer.designation || detail.offer.jobTitle}
                  {detail.offer.joiningDate ? ` · joining ${detail.offer.joiningDate}` : ''}
                  {detail.offer.expiryDate ? ` · expires ${detail.offer.expiryDate}` : ''}
                </p>
                {['SENT', 'DRAFT'].includes(detail.offer.status) && (
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => decideOffer('ACCEPTED')} disabled={isWorking} className="flex items-center gap-1 text-emerald-600">
                      <Check className="h-3.5 w-3.5" /> Accepted
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decideOffer('DECLINED')} disabled={isWorking} className="text-rose-600">
                      <X className="h-3.5 w-3.5" /> Declined
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hire */}
          {(detail.status === 'OFFERED' || detail.status === 'INTERVIEWING') && (
            <Button onClick={() => setHireOpen(true)} className="flex w-full items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <UserCheck className="h-4 w-4" /> Hire — Onboarding Handoff
            </Button>
          )}
        </div>
      )}

      {detail && (
        <>
          <ScheduleInterviewModal
            isOpen={scheduleOpen}
            applicationId={detail._id}
            candidateName={detail.fullName}
            roundNumber={detail.interviews.length + 1}
            onClose={() => setScheduleOpen(false)}
            onSaved={refresh}
          />
          <FeedbackModal
            isOpen={!!feedbackTarget}
            interview={feedbackTarget}
            onClose={() => setFeedbackTarget(null)}
            onSaved={refresh}
          />
          <OfferModal
            isOpen={offerOpen}
            candidate={detail}
            onClose={() => setOfferOpen(false)}
            onSaved={refresh}
          />
          <HireModal
            isOpen={hireOpen}
            candidate={detail}
            onClose={() => setHireOpen(false)}
            onSaved={() => {
              refresh();
              onClose();
            }}
          />
        </>
      )}
    </Drawer>
  );
}
