import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../../components/ui';
import { cn } from '../../../utils/cn';
import type { AgentDescriptor } from '../agents.config';

/**
 * One agent in the hub.
 *
 * Split out of the page so the card is the same object wherever an agent is
 * shown — the hub today, a dashboard tile or a picker later. It renders purely
 * from a descriptor and holds no state of its own, so nothing about a new agent
 * requires touching this file.
 */
export function AgentCard({ agent }: { agent: AgentDescriptor }) {
  const navigate = useNavigate();
  const Icon = agent.icon;
  const isActive = agent.status === 'ACTIVE';

  return (
    <article
      className={cn(
        'relative flex flex-col justify-between rounded-md border border-hairline bg-surface p-5 transition-colors',
        isActive ? 'hover:border-primary/50' : 'opacity-85',
      )}
    >
      <div>
        <header className="flex items-start justify-between gap-3 border-b border-hairline pb-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border p-2.5',
                agent.accentColor,
              )}
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-snug text-ink">{agent.name}</h3>
              <p className="font-mono text-[11px] text-ink-3">{agent.codename}</p>
            </div>
          </div>

          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-3">
              <Clock className="h-3 w-3" />
              Soon
            </span>
          )}
        </header>

        <div className="flex flex-wrap items-center gap-2 pb-2 pt-3">
          <span className="rounded-md border border-hairline bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-2">
            {agent.domain}
          </span>
          <span className="text-[11px] text-ink-3">· {agent.role}</span>
        </div>

        <p className="pb-3 pt-1 text-xs leading-relaxed text-ink-2">{agent.description}</p>

        <div className="space-y-1.5 pb-4 pt-1">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-3">
            Key capabilities
          </div>
          {agent.capabilities.map((capability) => (
            <div key={capability} className="flex items-start gap-1.5 text-xs text-ink-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{capability}</span>
            </div>
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <span className="font-mono text-[10px] text-ink-3">{agent.modelFamily}</span>

        {isActive && agent.actionHref ? (
          <Button
            size="sm"
            onClick={() => navigate(agent.actionHref!)}
            className="gap-1.5 text-xs"
          >
            <span>{agent.actionLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled className="rounded-md text-xs opacity-60">
            <span>Upcoming</span>
          </Button>
        )}
      </footer>
    </article>
  );
}
