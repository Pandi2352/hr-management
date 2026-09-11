import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastRef } from '../../../components/ui/toast';
import { quizApi } from '../api/quiz.api';
import type { GenerationJob } from '../types/quiz.types';

/** How often a running job is asked how far it has got. */
const POLL_MS = 2500;

/** How long to wait between polls once nothing is running. */
const IDLE_POLL_MS = 20000;

const TOAST_ID = (jobId: string) => `quiz-job-${jobId}`;

/**
 * Watches background quiz generation from wherever the person happens to be.
 *
 * Mounted above the router rather than on the studio page, which is the whole
 * point: asking for fifty questions and then going to look at payroll should
 * not abandon the job or lose the news that it finished. The notification
 * follows the person around the application and rewrites itself in place as the
 * count climbs.
 *
 * Renders nothing. All of its output is notifications.
 */
export function QuizJobWatcher() {
  const toastRef = useToastRef();
  const navigate = useNavigate();

  /** Jobs already reported as finished, so the news is delivered once. */
  const announced = useRef<Set<string>>(new Set());
  /** Progress toasts currently on screen, so they can be replaced or dismissed. */
  const live = useRef<Set<string>>(new Set());

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const report = (job: GenerationJob) => {
      const id = TOAST_ID(job.jobId);
      const toast = toastRef.current;

      if (job.status === 'QUEUED' || job.status === 'RUNNING') {
        live.current.add(id);
        toast.toast({
          id,
          type: 'loading',
          title: `Writing "${job.topic}"`,
          // The count is the message. "Generating…" tells somebody nothing
          // about whether to wait or go and do something else.
          description:
            job.questionsDone > 0
              ? `${job.questionsDone} of ${job.questionsTotal} questions written`
              : `Starting on ${job.questionsTotal} questions`,
          duration: 0,
          action: {
            label: 'Cancel',
            onClick: () => {
              quizApi.cancelGenerationJob(job.jobId).catch(() => {});
            },
          },
        });
        return;
      }

      if (announced.current.has(job.jobId)) return;
      announced.current.add(job.jobId);
      live.current.delete(id);

      if (job.status === 'COMPLETED') {
        toast.toast({
          id,
          type: 'success',
          title: 'Quiz ready for review',
          description: `${job.questionsDone} questions written for "${job.quizTitle || job.topic}". Saved as a draft.`,
          duration: 12000,
          action: {
            label: 'Review it',
            onClick: () => navigate('/quizzes?tab=management&filter=review'),
          },
        });
        return;
      }

      if (job.status === 'FAILED') {
        toast.toast({
          id,
          type: 'error',
          title: 'Quiz generation stopped',
          description: job.error || 'The quiz could not be written.',
          duration: 12000,
        });
        return;
      }

      if (job.status === 'CANCELLED') {
        toast.toast({
          id,
          type: 'info',
          title: 'Generation cancelled',
          description:
            job.questionsDone > 0
              ? `${job.questionsDone} questions had been written and were kept.`
              : 'Nothing had been written yet.',
          duration: 6000,
        });
      }
    };

    const tick = async () => {
      if (stopped) return;

      let anyRunning = false;
      try {
        const jobs = await quizApi.listGenerationJobs();
        for (const job of jobs) {
          if (job.status === 'QUEUED' || job.status === 'RUNNING') anyRunning = true;
          report(job);
        }

        /*
         * A job that vanishes from the list without a terminal status — a
         * restarted server, say — would otherwise leave its loading toast on
         * screen for the rest of the session.
         */
        const seen = new Set(jobs.map((j) => TOAST_ID(j.jobId)));
        for (const id of Array.from(live.current)) {
          if (!seen.has(id)) {
            toastRef.current.dismiss(id);
            live.current.delete(id);
          }
        }
      } catch {
        // Not signed in, offline, or the endpoint is unavailable. Nothing here
        // is worth interrupting somebody's work to tell them about.
      }

      if (!stopped) {
        timer = setTimeout(tick, anyRunning ? POLL_MS : IDLE_POLL_MS);
      }
    };

    tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    // The toast API is reached through a ref precisely so it is not a
    // dependency; re-running this effect would restart the poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return null;
}
