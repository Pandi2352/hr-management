# Quiz Arena & AI Quiz Agent — what is not built

Written 11 September 2026, against the module as it stands after the Learning
Loop, Skill Passport, Training ROI, Explainable Score, background generation and
question-types work.

This is a list of gaps, not a roadmap. Nothing here is scheduled or estimated.
Each entry says what is missing and why it matters, so that whoever picks the
next piece of work is choosing rather than guessing.

For what *is* built, read `QUIZ_AGENT_PLAN.md` alongside this — the two are
meant to be read together.

---

## 1. Authoring

**Sections and blueprints are declared but never used.**
The quiz schema carries `sections`, and every template defines them, but no
screen builds or edits a section and generation ignores them. So a template's
promise of "3 on policy, 2 on escalation" is not kept — the generator is simply
asked for five questions.

**Source-grounded generation has no source.**
A question carries `sourceEvidence` and the Question Doctor displays it, but
there is nowhere to upload the policy, handbook or SOP the questions should come
from. Whatever appears in that field today is the model asserting its own
citation, which is the one thing a citation may not be.

**No smart topic generator.**
The prompt enhancer improves a topic somebody has already had. Nothing proposes
topics from a role, a department, an incident, or the skills the Training ROI
dashboard has just reported as weakest — which is where the best topics
actually are.

**A published quiz cannot be edited from the arena.**
`PATCH /quizzes/:id` accepts title, tags, locale, attempt policy and shuffle,
and a full question editor component exists, but the management tab only
displays those values. Fixing a typo in a live quiz means building a new one.

**No bulk import.**
Questions arrive one at a time, from the model or by hand. A CSV or spreadsheet
import is the normal way an organisation brings across an existing question set,
and without it the first quiz is always written from scratch.

**Media questions are not supported.**
Text prompts and text options only. No image, diagram, screenshot or code block,
which rules out a large class of technical and safety assessment.

**Question types stop at four.**
Single choice, multiple answers, true/false and fill-in-the-blank are built and
graded. Ordering, matching, numeric tolerance and long-form written answers are
not — the last of those needs marking by a person or a model, which is a
different feature from grading.

---

## 2. Review and governance

**Review is a single gate, not a workflow.**
Anybody with management rights can approve, including the person who wrote the
quiz. There is no second-reviewer requirement, no reviewer assignment, and no
record of who else looked at it.

**Rejection notes are not kept.**
`reviewNote` holds only the most recent one. Sending a quiz back twice loses
what was said the first time, so an author cannot see the history of what was
asked of them.

**No per-question approval in the UI.**
`isApproved` exists on every question and approval sets it in bulk. Nothing
lets a reviewer accept nine questions and hold one back.

**No audit trail for the module.**
Employee and organisation changes write to `audit_logs`. Quiz creation,
approval, publication, assignment and deletion write nothing. For a module that
now produces compliance evidence, that is the wrong way round.

**Localisation is generation-time only.**
A locale is chosen before the questions are written. An approved English quiz
cannot be translated, so a second language means a second quiz with its own
separate review and its own separate results.

---

## 3. Assignment and delivery

**Assignment is a single event with no lifecycle.**
A quiz is assigned once, to everybody or to a list. There is no recurrence, no
"assign on joining", no assignment by department or role rather than by named
person, and no way to add somebody to an existing assignment without reassigning
the whole thing.

**Nothing chases anybody.**
Due dates are stored and displayed. No reminder is sent as one approaches, no
notice when one passes, and no escalation to a manager. The dashboard can tell
you 73 assignments are outstanding; nothing acts on that.

**No manager view of an assignment.**
The Training ROI dashboard reports across the organisation. A manager cannot
open one assignment and see their own team's progress through it.

**Certificates do not exist.**
Passing produces XP and a leaderboard position. There is no certificate, no
expiry on one, and no record an auditor would accept as proof that a named
person passed a named assessment on a date.

**No proctoring or integrity signals.**
Tab switching, paste, time-per-question and impossible-speed submissions are
neither recorded nor flagged. For an assessment with a certificate attached,
that gap matters more than it does today.

---

## 4. Taking a quiz

**Attempt policy is invisible to the person it governs.**
The server enforces maximum attempts, cooldown and the already-passed rule
correctly. The play page never says how many attempts remain or when a retry
unlocks, so somebody discovers the limit as an error after clicking start.

**No save and resume.**
Answers live in component state and the deadline in session storage. Closing the
tab loses the answers; the clock keeps running. For a 60-minute assessment that
is a real failure mode.

**No accessibility pass.**
Keyboard navigation through options, screen-reader announcement of the timer,
and focus management on question change have not been tested or built for.

---

## 5. Learning loop, passport and reporting

**The passport rests on quiz answers alone.**
The `evidence` field on every skill is designed for more, and the panel says so,
but completed training and self-rated confidence are not collected anywhere,
so a passport reflects only what has been quizzed.

**Skills are tags, and tags are freeform.**
There is no skill taxonomy. "Mongo", "MongoDB" and "MongoDB Indexes" are three
skills, reconciled only by exact case-insensitive match. Nothing maps a skill
to a role, so "ready for this job" cannot be answered.

**Nothing feeds question analytics back into authoring.**
The ROI dashboard flags questions almost nobody gets right. Acting on that flag
means finding the quiz, opening it and editing by hand; the Question Doctor is
not offered at the point the problem is reported.

**No history on the ROI dashboard.**
Every figure is current. There is no time window, no previous-period comparison
and no trend, so "is this getting better" cannot be answered from it.

**No export.**
Nothing on the passport, the dashboard or an explained score can be exported to
CSV or PDF. In a compliance dispute the record has to leave the system.

**Practice sets have no lifetime.**
An unfinished set is closed the moment another is built, and completed ones are
never cleaned up. Neither is wrong today; neither has been thought about at
volume.

---

## 6. Explainable score

**The explanation covers grading, not authorship.**
It answers "why did I get this score" completely. It does not say who wrote the
question, who approved it, or when — which is the second half of the same
question in a real dispute.

**There is no dispute flow.**
An employee who disagrees with a score has nothing to press. No flag, no
comment, no route to a human, and no record that a score was ever questioned.

**Old attempts carry no snapshots.**
Attempts sat before this work have no stored copy of their questions, so their
explanations read from the live quiz. The response says so honestly, but the
underlying evidence for those attempts is gone and cannot be recovered.

**Grading version one has never been superseded.**
The mechanism is in place and the rules are published. It has not yet been
exercised by an actual change, so the migration path for old attempts under a
new version is untested.

---

## 7. Platform concerns

**Everything is computed on read.**
The ROI dashboard loads every assignment, attempt and loop for the organisation
and aggregates in memory on each request. That is fine at 36 employees and will
not be at 3,600.

**No caching, no pagination anywhere in the module.**
Quiz lists, the question bank, the mastery board and the dashboard all return
everything.

**Background generation runs in the API process.**
The job document is the seam, and `run()` would move behind a queue unchanged,
but as it stands a second API instance would have two processes racing the same
job. Stale jobs are closed after five minutes without progress, which covers a
restart but is a recovery mechanism, not a design for more than one instance.

**Nothing resumes a cancelled or failed job.**
The questions written before it stopped are kept on the job record, but there is
no way to pick it up from there — only to start again.

**AI cost is neither measured nor capped.**
Generation, prompt enhancement, the Question Doctor, coaching and practice
questions all call a provider. Nothing counts the calls, attributes them to an
organisation, or stops a runaway.

**No rate limiting on generation.**
A user can trigger unlimited generations and practice builds.

**Test coverage is uneven.**
The pure logic — categories, the learning loop, the insights maths — is well
covered by unit tests. The services and controllers are covered only by the
end-to-end scripts used during development, which are not in the test suite and
do not run in CI.
