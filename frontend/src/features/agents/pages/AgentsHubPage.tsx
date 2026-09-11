import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sliders } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui';
import { useTheme } from '../../../hooks/useTheme';
import { cn } from '../../../utils/cn';
import aiProviderLightBg from '../../../assets/ai_provider_light_banner.jpg';
import aiProviderDarkBg from '../../../assets/ai_provider_dark_banner.jpg';
import { AGENTS_REGISTRY, agentCounts, matchesAgentQuery, type AgentStatus } from '../agents.config';
import { AgentCard } from '../components/AgentCard';

type Filter = 'ALL' | AgentStatus;

const FILTER_LABELS: Record<Filter, string> = {
  ALL: 'All agents',
  ACTIVE: 'Ready to use',
  UPCOMING: 'Upcoming',
};

/**
 * The AI Agents Hub.
 *
 * A directory of what the product can do autonomously, and nothing more. Every
 * route into an agent's own workspace lives on that agent's card: the header
 * used to carry a Quiz Arena shortcut, which meant quiz work had two front
 * doors and the card was only one of them. One agent, one card, one way in.
 *
 * The page renders entirely from `agents.config.ts`. Counts, filters and search
 * are derived, so a new agent cannot arrive with a stale headline number beside
 * it.
 */
export function AgentsHubPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('ALL');

  const bgBanner = theme === 'dark' ? aiProviderDarkBg : aiProviderLightBg;
  const counts = useMemo(() => agentCounts(), []);

  const filteredAgents = useMemo(
    () =>
      AGENTS_REGISTRY.filter(
        (agent) =>
          (activeFilter === 'ALL' || agent.status === activeFilter) &&
          matchesAgentQuery(agent, search),
      ),
    [activeFilter, search],
  );

  // With a single agent the filter row is noise, so it appears once there is
  // something to filter between.
  const showFilters = counts.total > 1;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="AI Agents Hub"
        description="Autonomous agents that do a job end to end. Each one opens into its own workspace."
        actions={
          <Link to="/settings/ai-providers">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              <span>AI Engine Settings</span>
            </Button>
          </Link>
        }
      />

      <div
        className="relative overflow-hidden rounded-md border border-hairline bg-cover bg-center"
        style={{ backgroundImage: `url(${bgBanner})` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-surface/95 via-surface/85 to-surface/65 p-6 backdrop-blur-md">
          <div className="max-w-2xl space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {counts.active === 1 ? '1 agent live' : `${counts.active} agents live`}
              </span>
              <span className="text-xs text-ink-3">· Unified LLM routing</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-ink md:text-xl">
              One engine, every agent
            </h2>
            <p className="text-xs leading-relaxed text-ink-2">
              Agents share the AI provider you configured once in AI Engine Settings. Switch
              provider or model there and every agent follows, with no per-agent key to manage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="min-w-[100px] rounded-md border border-hairline bg-surface/85 p-3 text-center backdrop-blur-sm">
              <div className="text-xl font-bold text-ink">{counts.active}</div>
              <div className="text-[10px] font-semibold uppercase text-ink-3">Live</div>
            </div>
            <div className="min-w-[100px] rounded-md border border-hairline bg-surface/85 p-3 text-center backdrop-blur-sm">
              <div className="text-xl font-bold text-ink">{counts.upcoming}</div>
              <div className="text-[10px] font-semibold uppercase text-ink-3">In pipeline</div>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface p-1">
            {(['ALL', 'ACTIVE', 'UPCOMING'] as Filter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  activeFilter === filter
                    ? 'border border-hairline bg-surface-2 font-semibold text-ink'
                    : 'text-ink-3 hover:bg-surface-2/50 hover:text-ink',
                )}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents or capabilities..."
              className="h-8 w-full rounded-md border border-hairline bg-surface pl-8 pr-3 text-xs text-ink placeholder:text-ink-3/60 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      {filteredAgents.length === 0 ? (
        <div className="rounded-md border border-hairline bg-surface py-16 text-center text-xs text-ink-3">
          No agent matches that search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
