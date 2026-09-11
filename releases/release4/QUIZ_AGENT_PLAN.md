# Quiz Master Agent — Feature Plan

**Agent:** `AGENT-QZ-01` · Learning & Development
**Status:** shipped as a first pass; this document is what it should become.
**Scope of this document:** features only. No sprint breakdown, no estimates —
those come after the list below is agreed.

---

## 1. What exists today

Worth writing down plainly, because half of the plan below is finishing things
that are already half-built, and the other half is genuinely new.

**Backend** — `backend/src/modules/quiz/`

| Endpoint | What it does |
|---|---|
| `POST /quizzes/enhance-prompt` | Turns a bare topic into a blueprint with learning objectives |
| `POST /quizzes/generate-ai` | Generates a full quiz from a topic via the active AI provider |
| `POST /quizzes` | Saves a quiz |
| `POST /quizzes/:id/assign` | Assigns to named employees or everyone |
| `GET /quizzes` | Lists quizzes, optionally by category |
| `GET /quizzes/my-assignments` | What the signed-in employee owes |
| `GET /quizzes/:id/play` | The quiz without its answer key |
| `POST /quizzes/:id/submit` | Grades an attempt, awards XP, updates badges |
| `GET /quizzes/leaderboard` | Ranked by XP, optionally per department |
| `GET /quizzes/my-stats` | One person's XP, level, streak and badges |

Four collections: `quizzes`, `quiz_assignments`, `quiz_attempts`, and a
gamification profile per employee.

**Frontend** — a four-step studio at `/agents/quiz` (topic → blueprint →
review → assign), plus an arena at `/quizzes` with a leaderboard and a play
page.

**What is already right.** Answers are stripped from the play payload rather
than hidden in the client. Generation degrades to a template when no provider
is configured, so the studio never dead-ends. Grading is server-side.

**The honest gaps.** There is no retake policy, no question shuffling, no
review-your-answers screen after the fact, no reminder when an assignment is
due, no way to edit a quiz once saved, and the leaderboard is all-time only.
Those are the first four sections below.

---

## 2. Authoring — getting a good quiz out of a topic

The generator works. What it lacks is everything between "generated" and
"ready to send to 200 people".

- **Edit a saved quiz.** Today a quiz is write-once. Fix a typo in a question,
  correct a wrong answer key, adjust the pass mark, add or delete a question.
- **Regenerate one question.** The usual failure is that four of five questions
  are good. Rewriting the whole quiz to fix one is the wrong unit of work.
- **Answer-key confidence.** Ask the model to justify the key, and flag any
  question where two options are defensible. A quiz with a wrong key teaches
  the wrong thing and destroys trust in the agent.
- **Duplicate and adapt.** Clone a quiz to a new difficulty or department
  without starting from a blank topic field.
- **Source-grounded generation.** Generate from an uploaded policy document or
  an existing handbook page, not just from the model's own knowledge. This is
  the difference between a general-knowledge quiz and one that tests *your*
  leave policy.
- **Question bank.** Save good questions to a reusable pool, tagged by topic,
  so a later quiz can draw from what already worked.
- **Import and export.** CSV or JSON in and out, so a quiz written elsewhere
  does not have to be retyped.

---

## 3. Assignment — getting it to the right people

- **Assign by department, designation, location or cohort**, not only by named
  employees or everyone. The current all-or-individuals choice forces a
  200-checkbox exercise for "everyone in Engineering".
- **Recurring assignment.** Annual compliance refreshers are the obvious case:
  assign every 12 months from joining date, automatically.
- **Assign on a lifecycle event.** New joiner gets the induction quiz on day
  one. A promotion triggers the manager-track quiz.
- **Due dates that do something.** A reminder before the due date, an overdue
  state after it, and an escalation to the manager when it stays overdue.
- **Reassignment on failure.** A configurable "must pass, retake after 24
  hours" rather than a single attempt with no recourse.
- **Cancel or withdraw** an assignment sent by mistake, without deleting the
  attempt history of people who already took it.

---

## 4. Taking a quiz — the part every employee sees

- **Retake policy.** Attempts allowed, cooling-off period, and whether the best
  or the latest attempt counts. Currently unbounded and unspecified.
- **Shuffle questions and options.** Two people sitting together should not see
  the same order. This is cheap and it matters.
- **Resume an interrupted attempt.** A closed laptop should not cost the
  attempt. Persist progress and the remaining time server-side.
- **Server-authoritative timer.** The time limit is currently a client
  countdown, which is a suggestion rather than a rule.
- **Review after submission.** Show which questions were wrong and the
  explanation that is already being generated and stored but never shown back.
- **Accessibility pass.** Keyboard-only navigation, screen-reader labels on
  options, and no reliance on colour alone for correct and incorrect.

---

## 5. Gamification — making it worth doing twice

The XP, level, streak and badge machinery exists. It needs to be intentional
rather than incidental.

- **A defined badge catalogue.** Badges are currently string literals created
  at grading time. Make them a catalogue with an id, a name, a rule and an
  icon, so they can be listed, explained and earned predictably.
- **Streaks that are defensible.** Define what breaks a streak and over what
  window, and show someone how close they are to losing one.
- **Leaderboard time windows.** This week, this month, all time. An all-time
  board calcifies after a quarter and stops motivating anyone who joined late.
- **Team and department boards**, so a small team competes with its peers
  rather than with the whole company.
- **Opt-out.** Not everyone wants their score ranked publicly. A person should
  be able to take quizzes without appearing on a board, without being excluded
  from the assignment.
- **Certificates.** A downloadable record of a passed compliance quiz, which is
  the artefact an auditor actually asks for.

---

## 6. For managers and HR — the reason this gets bought

- **Completion dashboard.** Per quiz, per department: assigned, started,
  completed, passed, overdue.
- **Question-level analytics.** Which question does everybody get wrong? That
  is either a bad question or a real training gap, and both are worth knowing.
- **Skill-gap view.** Aggregate scores by category to show where the
  organization is weak, feeding what to train next.
- **Per-person history.** Every quiz someone has taken, with scores and dates,
  on their employee record.
- **Export.** Completion and score data out as CSV for compliance reporting.

---

## 7. Trust, safety and cost

Unglamorous, and the reason a feature like this survives contact with a real
company.

- **Rate limit generation.** An AI call per click with no ceiling is an
  unbounded bill. Cap per organization per day, and show what is left.
- **Review before publish.** A generated quiz should not be assignable until a
  person has approved it. Currently the studio allows generate-and-send.
- **Audit the consequential actions.** Who created, edited, assigned, cancelled
  or deleted. Grading changes what appears on someone's record, so it belongs
  in the audit trail like any other HR action.
- **Organization isolation on every read.** Already the pattern elsewhere in
  this codebase; must hold for quizzes, attempts and leaderboards without
  exception.
- **No answer key in any client payload**, including in the review screen for a
  quiz the person has not yet submitted.
- **Provider failure is visible.** When generation falls back to the template,
  say so in the UI rather than silently handing over generic questions.

---

## 8. Deliberately out of scope

Naming these now so they do not creep in.

- Question types beyond multiple choice. Free text needs grading judgement,
  which is a different feature with a different risk profile.
- Proctoring, webcam monitoring or tab-switch detection. Wrong tool, wrong
  relationship with employees.
- Public or external-facing quizzes. This is an internal L&D tool.
- Course sequencing and learning paths. That is an LMS, and it is a much larger
  product than an agent.

---

## 9. What to build first

If only one section ships, it should be **§4 Taking a quiz** — retakes,
shuffling, the server-side timer and the review screen. Those four turn the
current implementation from a demo into something defensible to run against
real employees, and the explanation text is already generated and stored, so
the review screen is mostly a matter of showing what is there.

**§7 Trust, safety and cost** ships alongside, not after. Generation rate limits
and review-before-publish are cheap now and expensive to retrofit once people
are already assigning quizzes.
