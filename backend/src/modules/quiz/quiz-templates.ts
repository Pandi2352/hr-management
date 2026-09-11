import type { QuizStatus } from './schemas/quiz.schema';

/**
 * Starting points for the five quizzes every company actually writes.
 *
 * Code rather than a collection, because these are defaults rather than data:
 * nobody edits them, every organization gets the same ones, and shipping them
 * as seed rows would mean a migration every time the wording improves. A quiz
 * records which template it came from and then owns its own copy.
 *
 * Each carries the settings that differ by *purpose*, not by topic. A
 * certification needs a high pass mark and one attempt; an onboarding check
 * needs a low bar and unlimited retries, because its job is to teach rather
 * than to filter.
 */
export interface QuizTemplate {
  id: string;
  name: string;
  /** One line on when to reach for it. */
  purpose: string;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  questionCount: number;
  timeLimitMinutes: number;
  passingScorePct: number;
  xpReward: number;
  tags: string[];
  attemptPolicy: {
    maxAttempts: number;
    scoring: 'BEST' | 'LATEST';
    mustPass: boolean;
    cooldownHours: number;
  };
  shuffleOptions: boolean;
  shuffleQuestions: boolean;
  /** Sections the blueprint builder starts from. */
  sections: { name: string; questionCount: number; difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' }[];
  /** Extra instruction appended to the generation prompt. */
  promptGuidance: string;
  /** The state a quiz from this template starts in. */
  initialStatus: QuizStatus;
}

export const QUIZ_TEMPLATES: QuizTemplate[] = [
  {
    id: 'compliance',
    name: 'Compliance check',
    purpose: 'Annual policy and regulation refreshers that must be evidenced.',
    category: 'Compliance & Safety',
    difficulty: 'INTERMEDIATE',
    questionCount: 10,
    timeLimitMinutes: 20,
    passingScorePct: 80,
    xpReward: 200,
    tags: ['compliance', 'policy', 'mandatory'],
    // Must pass, and retries are allowed because the point is compliance, not
    // ranking. The cooldown stops someone brute-forcing the answer key.
    attemptPolicy: { maxAttempts: 3, scoring: 'LATEST', mustPass: true, cooldownHours: 24 },
    shuffleOptions: true,
    shuffleQuestions: true,
    sections: [
      { name: 'Policy fundamentals', questionCount: 4, difficulty: 'BEGINNER' },
      { name: 'Applying the policy', questionCount: 4, difficulty: 'INTERMEDIATE' },
      { name: 'Edge cases and escalation', questionCount: 2, difficulty: 'ADVANCED' },
    ],
    promptGuidance:
      'Questions must test whether the employee would act correctly, not whether they can recite the policy. Use realistic workplace situations with one defensible answer.',
    initialStatus: 'DRAFT',
  },
  {
    id: 'onboarding',
    name: 'Onboarding check',
    purpose: 'First-week orientation for a new joiner.',
    category: 'Onboarding',
    difficulty: 'BEGINNER',
    questionCount: 8,
    timeLimitMinutes: 15,
    passingScorePct: 60,
    xpReward: 120,
    tags: ['onboarding', 'induction', 'new-joiner'],
    // Unlimited attempts and a low bar: this one teaches rather than filters,
    // and failing your first week should not be a record.
    attemptPolicy: { maxAttempts: 0, scoring: 'BEST', mustPass: false, cooldownHours: 0 },
    shuffleOptions: true,
    shuffleQuestions: false,
    sections: [
      { name: 'Who we are', questionCount: 3, difficulty: 'BEGINNER' },
      { name: 'How we work', questionCount: 3, difficulty: 'BEGINNER' },
      { name: 'Where to get help', questionCount: 2, difficulty: 'BEGINNER' },
    ],
    promptGuidance:
      'Keep the tone welcoming. Every explanation should teach something useful even when the answer was correct.',
    initialStatus: 'DRAFT',
  },
  {
    id: 'technical-skill',
    name: 'Technical skill check',
    purpose: 'Measuring depth in a tool, language or practice.',
    category: 'Product & Technology',
    difficulty: 'ADVANCED',
    questionCount: 12,
    timeLimitMinutes: 30,
    passingScorePct: 70,
    xpReward: 250,
    tags: ['technical', 'skill-assessment'],
    attemptPolicy: { maxAttempts: 2, scoring: 'BEST', mustPass: false, cooldownHours: 48 },
    shuffleOptions: true,
    shuffleQuestions: true,
    sections: [
      { name: 'Core concepts', questionCount: 4, difficulty: 'INTERMEDIATE' },
      { name: 'Applied problems', questionCount: 5, difficulty: 'ADVANCED' },
      { name: 'Debugging and trade-offs', questionCount: 3, difficulty: 'ADVANCED' },
    ],
    promptGuidance:
      'Favour questions where a plausible-looking wrong answer is genuinely tempting. Avoid trivia that a search would answer in seconds.',
    initialStatus: 'DRAFT',
  },
  {
    id: 'product-knowledge',
    name: 'Product knowledge',
    purpose: 'Making sure customer-facing teams know what they are selling.',
    category: 'Customer Experience',
    difficulty: 'INTERMEDIATE',
    questionCount: 10,
    timeLimitMinutes: 20,
    passingScorePct: 75,
    xpReward: 180,
    tags: ['product', 'enablement', 'customer-facing'],
    attemptPolicy: { maxAttempts: 3, scoring: 'BEST', mustPass: false, cooldownHours: 0 },
    shuffleOptions: true,
    shuffleQuestions: true,
    sections: [
      { name: 'What it does', questionCount: 4, difficulty: 'BEGINNER' },
      { name: 'Who it is for', questionCount: 3, difficulty: 'INTERMEDIATE' },
      { name: 'Handling objections', questionCount: 3, difficulty: 'ADVANCED' },
    ],
    promptGuidance:
      'Write from the customer\'s side of the conversation. The right answer should be the one that helps the customer, not the one that sounds most impressive.',
    initialStatus: 'DRAFT',
  },
  {
    id: 'certification',
    name: 'Certification exam',
    purpose: 'A formal, evidenced assessment that carries a pass or fail.',
    category: 'Certification',
    difficulty: 'ADVANCED',
    questionCount: 15,
    timeLimitMinutes: 45,
    passingScorePct: 85,
    xpReward: 500,
    tags: ['certification', 'formal-assessment'],
    // One attempt, high bar. A certificate that can be retaken until it passes
    // is not a certificate.
    attemptPolicy: { maxAttempts: 1, scoring: 'LATEST', mustPass: true, cooldownHours: 0 },
    shuffleOptions: true,
    shuffleQuestions: true,
    sections: [
      { name: 'Foundations', questionCount: 5, difficulty: 'INTERMEDIATE' },
      { name: 'Practical application', questionCount: 6, difficulty: 'ADVANCED' },
      { name: 'Judgement under pressure', questionCount: 4, difficulty: 'ADVANCED' },
    ],
    promptGuidance:
      'This carries a formal pass or fail, so every question must have exactly one unarguably correct answer. Reject anything where a knowledgeable person could defend a second option.',
    initialStatus: 'DRAFT',
  },
];

export function findTemplate(id: string | undefined): QuizTemplate | undefined {
  if (!id) return undefined;
  return QUIZ_TEMPLATES.find((t) => t.id === id);
}
