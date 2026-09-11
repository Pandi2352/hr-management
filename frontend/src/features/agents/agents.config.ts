import { Trophy } from 'lucide-react';

/**
 * The agent registry.
 *
 * This file is the whole contract for the hub. Adding an agent is one entry
 * here and nothing else: no edit to the page, no new card component, no
 * counter to bump. The page derives its filters, its search and its headline
 * numbers from this array.
 *
 * Only real agents belong here. The hub previously listed five, three of them
 * marked Active while pointing at unrelated pages, and two labelled "coming
 * soon" that nothing was building. A hub that advertises capability the product
 * does not have teaches people to distrust it, so the list is now exactly what
 * exists.
 */

export type AgentStatus = 'ACTIVE' | 'UPCOMING';

export interface AgentDescriptor {
  id: string;
  name: string;
  /** Stable identifier shown under the name, e.g. AGENT-QZ-01. */
  codename: string;
  /** What the agent does, in the org's language. */
  role: string;
  /** Which part of the business owns it. */
  domain: string;
  description: string;
  capabilities: string[];
  status: AgentStatus;
  /** Label on the card's primary button. */
  actionLabel: string;
  /** Where that button goes. Absent for an agent that is not built yet. */
  actionHref?: string;
  icon: typeof Trophy;
  /** Icon tile classes. Written literally so Tailwind can see them. */
  accentColor: string;
  /** One line on what is powering it, shown beside the action. */
  modelFamily: string;
}

export const AGENTS_REGISTRY: AgentDescriptor[] = [
  {
    id: 'quiz-master',
    name: 'Quiz Master Agent',
    codename: 'AGENT-QZ-01',
    role: 'Employee Assessment & Gamification',
    domain: 'Learning & Development',
    description:
      'Turns a topic into a graded quiz: writes the questions and answer explanations, assigns them to people or whole departments, and scores every attempt.',
    capabilities: [
      'Generate a full quiz from a single topic',
      'Difficulty tuning from beginner to advanced',
      'Assign to individuals, departments or everyone',
      'Automatic grading with XP, streaks and leaderboards',
    ],
    status: 'ACTIVE',
    actionLabel: 'Open Quiz Agent Studio',
    actionHref: '/agents/quiz',
    icon: Trophy,
    accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
    modelFamily: 'Runs on your active AI provider',
  },
];

/** Counts for the hub's headline, derived so they cannot drift from the list. */
export function agentCounts(agents: AgentDescriptor[] = AGENTS_REGISTRY) {
  return {
    total: agents.length,
    active: agents.filter((a) => a.status === 'ACTIVE').length,
    upcoming: agents.filter((a) => a.status === 'UPCOMING').length,
  };
}

/** Free-text match across the fields a person would actually search by. */
export function matchesAgentQuery(agent: AgentDescriptor, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    agent.name.toLowerCase().includes(q) ||
    agent.domain.toLowerCase().includes(q) ||
    agent.role.toLowerCase().includes(q) ||
    agent.description.toLowerCase().includes(q) ||
    agent.capabilities.some((c) => c.toLowerCase().includes(q))
  );
}
