# Atrium — The Social Layer for PeopleOS

> **Status: PLAN. Nothing implemented.**
> Proposed as the flagship feature of Release 4. Sprints 1–2 are independently
> shippable and could be pulled into Release 3 if you want the directory and
> follow graph sooner.

---

## 1. The name

**Atrium.**

An atrium is the open, glass-roofed space at the centre of an office building —
the one place where people from every floor cross paths, where you bump into
someone from a team you never work with. That is exactly what this feature is:
the shared middle of the organization, deliberately outside the reporting
hierarchy.

It reads well everywhere it has to appear: *"Share to Atrium"*, *"Your Atrium"*,
*"they're new to the Atrium"*. It is short, pronounceable, has no baggage from
an existing HR or social product, and — unlike *Pulse*, *Buzz*, *Huddle* or
*Watercooler* — is not already three other tools in the market.

### Vocabulary

| Term | Means |
|---|---|
| **Atrium** | The feature as a whole |
| **Feed** | The timeline: people you follow + org-wide posts |
| **Post** | One share — text, optionally an image |
| **Kudos** | A peer appreciation reaction tied to a company value |
| **Spotlight** | A post pinned org-wide by HR |
| **Milestone** | A post the system writes itself from an HR event |

---

## 2. What it is, and what it deliberately is not

**Is:** an internal, org-only space where any employee can browse every
colleague, follow the ones they want to hear from, keep a personal profile with
a bio and interests, and share and react to content.

**Is not:**

- **Not a chat tool.** No DMs, no threads-as-conversation. Slack and Teams exist;
  competing with them is how this feature dies.
- **Not a permission bypass.** Following someone never widens what you can see
  about them. See §4.
- **Not a second HR record.** Atrium reads a narrow *profile projection*, never
  the employee document.
- **Not unmoderated.** Workplace user-generated content without moderation is a
  harassment vector, not a feature. See §7.

---

## 3. The differentiator: the feed writes itself

Any team can build a follow button. What makes Atrium worth building **inside**
PeopleOS is that the HR system already knows the things people actually want to
celebrate — and no standalone social tool does:

| The system already knows | Atrium posts |
|---|---|
| `joiningDate` | "Anika joined Engineering today — say hello" |
| Work anniversaries (from `joiningDate` + `DateHelper.getTenure`) | "3 years at Nexora today" |
| `dateOfBirth` | Birthday wishes (opt-in — see §4) |
| Probation confirmation (`lifecycle/probation`) | "Confirmed to full-time" |
| Designation change (already audited) | "Promoted to Senior Engineer" |
| Recruitment: role filled | "Welcome to the team" |

**This is the feature's whole reason to exist in-product.** A brand-new Atrium
is not an empty timeline — on day one it already has content, because the HR
data generates it. Every social tool's failure mode is the empty feed; this one
starts full.

Milestones are **generated, not manual**, so nobody has to remember. Each is
opt-outable per employee.

---

## 4. Privacy model — the part that must be right

This is the hardest design problem in the feature and the one most likely to be
got wrong.

### 4.1 The tension

PeopleOS enforces **department-scoped visibility**: `EmployeeScopeService`
narrows managers to their own departments and descendants. Atrium's entire
premise is that *everyone can see everyone*. These two rules are in direct
conflict, and the resolution must be explicit rather than accidental.

### 4.2 The resolution: a separate read model

Atrium **never reads the employee document**. It reads an `AtriumProfile` — a
distinct collection holding only what is safe to show the whole company:

| In the profile | Never in the profile |
|---|---|
| Display name, avatar | Compensation, payroll, bank details |
| Designation, department | Personal email, phone, home address |
| Bio, interests, "ask me about" | Date of birth (only day/month, and only if opted in) |
| Skills (already on the employee record) | Documents, national ID, tax id |
| Work anniversary month | Manager chain, performance data, leave balances |
| Follower/following counts | Employment status beyond ACTIVE/INACTIVE |

Two rules make this hold under change:

1. **Projection, not spread.** The profile is built from an explicit field
   allow-list — the same discipline the audit sanitizer and the JWT auth
   snapshot already use. A `{...employee}` spread would start leaking the moment
   someone adds a field.
2. **A dedicated permission.** `atrium:participate` is granted to every
   employee. It is *not* `employee:read`, so widening Atrium can never
   accidentally widen the HR directory, and vice versa.

### 4.3 Following grants nothing

Following is a **content subscription, not an access grant**. It changes what
appears in your feed. It never changes what you can see on a profile, and it is
not mutual-consent — you do not approve followers. (Consider a private-account
mode only if leadership asks; it is out of scope here.)

### 4.4 Offboarding

When an employee leaves, their profile is hidden from the directory and feed
within one sweep. Their **posts are retained but attributed to a tombstoned
profile** ("Former colleague"), because deleting them would silently gut threads
other people participated in. Follow edges are pruned so counts stay honest.
This must be decided before launch, not after the first leaver.

---

## 5. Data model

Four new collections. All org-scoped, all soft-deleting, all following the
existing UUID `_id` convention.

```
atrium_profiles      one per employee — bio, interests, opt-outs, counters
atrium_follows       edge: followerId -> followeeId
atrium_posts         author, body, image, visibility, kind, counters
atrium_reactions     one per (postId, userId, kind)  ← unique index
atrium_comments      postId, author, body
atrium_reports       postId/commentId, reporter, reason, moderation state
```

### Decisions worth stating up front

**Counters are denormalised.** `followerCount`, `followingCount`, `kudosCount`,
`commentCount` live on the document and are incremented atomically with `$inc`.
Computing them with `countDocuments` per row turns a 20-row feed into 80
queries. The write path must keep them honest; a nightly reconciliation job
catches drift.

**Follows carry a unique compound index** on `(organizationId, followerId,
followeeId)`. A double-tapped follow button otherwise creates two edges and the
counter is permanently wrong — the same class of bug the payroll unique index
prevents.

**Reactions carry a unique index** on `(postId, userId, kind)`, so a reaction is
idempotent rather than something you can spam.

**Self-follow is rejected** at the service and by a partial index. It sounds
trivial; it is the first thing anyone tries.

**Feed is fan-out-on-read.** For an organization of hundreds to low thousands,
querying `posts where authorId in (followees) or visibility = ORG` against a
compound index is simpler, always consistent, and fast enough. Fan-out-on-write
(materialising a timeline per user) is the Twitter-scale answer to a problem
this feature does not have, and it makes deletes and privacy changes far harder.
Revisit only if a real org exceeds ~5,000 employees.

---

## 6. API surface

All under `/atrium`, all requiring `atrium:participate`.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/atrium/directory` | Browse/search every colleague (paginated) |
| `GET` | `/atrium/profiles/:employeeId` | One profile + follow state |
| `PATCH` | `/atrium/profiles/me` | Edit own bio, interests, opt-outs |
| `POST` | `/atrium/profiles/me/avatar` | Change photo |
| `POST` | `/atrium/follow/:employeeId` | Follow |
| `DELETE` | `/atrium/follow/:employeeId` | Unfollow |
| `GET` | `/atrium/profiles/:id/followers` | Followers list |
| `GET` | `/atrium/profiles/:id/following` | Following list |
| `GET` | `/atrium/suggestions` | Who to follow |
| `GET` | `/atrium/feed` | Personal feed |
| `POST` | `/atrium/posts` | Create a post |
| `DELETE` | `/atrium/posts/:id` | Delete own post |
| `POST` | `/atrium/posts/:id/kudos` | React |
| `POST` | `/atrium/posts/:id/comments` | Comment |
| `POST` | `/atrium/posts/:id/report` | Report content |
| `GET` | `/atrium/moderation/queue` | *(moderator)* Reported content |
| `POST` | `/atrium/moderation/:id/hide` | *(moderator)* Hide + reason |
| `POST` | `/atrium/spotlight/:postId` | *(HR)* Pin org-wide |

Every response goes through `ResultEntity`, so the envelope matches the rest of
the API for free.

### Permissions

| Key | Granted to |
|---|---|
| `atrium:participate` | Every employee |
| `atrium:moderate` | HR admins, designated moderators |
| `atrium:broadcast` | HR admins — org-wide posts and Spotlight |

---

## 7. Moderation and safety

**Non-negotiable, and shipped in the same release as posting — not after.**
User-generated content in a workplace carries real legal and HR exposure. A
"we'll add moderation later" feature is one bad post away from being switched
off permanently.

1. **Report** on every post and comment, by anyone, with a reason.
2. **Moderation queue** for `atrium:moderate`, showing reported content with
   context.
3. **Hide with a recorded reason** — content is hidden, never hard-deleted, so
   an HR investigation still has the evidence.
4. **Every moderation action is audited** via the existing `AuditService`
   (`ATRIUM_CONTENT_HIDDEN`, `ATRIUM_USER_MUTED`). Ordinary follows and posts
   are *not* audited — that would drown the compliance trail in noise.
5. **Rate limits**: posts and comments per hour, per user. Backed by the cache
   layer's counter, failing closed like the login throttle.
6. **Image uploads reuse `DocumentStorageService`'s discipline** — MIME
   whitelist, size cap, generated filenames, path-traversal guard. That code is
   already written and tested; do not write a second uploader.
7. **Author-only delete** for own content; moderators hide rather than delete.

---

## 8. What this reuses (and must not rebuild)

The groundwork is already in place. Atrium should add almost no infrastructure:

| Need | Existing piece |
|---|---|
| Response envelope | `ResultEntity` / `ErrorEntity` |
| Structured logs with request correlation | `LoggerHelper` |
| Feed pages, counters, suggestions caching | `CacheHelper` (`atrium-feed`, `atrium-profile` namespaces) |
| Anniversaries, birthdays, tenure | `DateHelper` (`getTenure`, `addMonths`, `eachDayBetween`) |
| Image upload safety | `DocumentStorageService` pattern |
| Moderation audit trail | `AuditService` |
| Org isolation | `organizationId` on every collection, as everywhere else |
| Email (digests, mentions) | `MailService` + a new `atrium-digest.template.ts` |

**One genuine gap: there is no notification infrastructure.** Nothing in the
codebase does in-app notifications today. Sprint 4 either builds a minimal
`notifications` module (a collection, a bell, a mark-read endpoint) or Atrium
ships silent — and a silent social feature does not get used. This is the
largest single unknown in the estimate.

---

## 9. Sprint plan

Four two-week sprints. Each ends with something demonstrable, and **each sprint
is independently valuable** — if the project is stopped after Sprint 2, the
directory and follow graph still stand on their own.

---

### Sprint 1 — Profiles & Directory *(Weeks 1–2)*

**Goal:** every employee can browse the whole company and make their profile
theirs. No social mechanics yet.

| # | Story |
|---|---|
| AT-101 | `AtriumProfile` schema + backfill from existing employees |
| AT-102 | Profile **projection** with explicit allow-list (§4.2) |
| AT-103 | `GET /atrium/directory` — search, department filter, pagination |
| AT-104 | `GET /atrium/profiles/:employeeId` |
| AT-105 | `PATCH /atrium/profiles/me` — bio, interests, "ask me about", opt-outs |
| AT-106 | Avatar upload reusing the document-storage guards |
| AT-107 | `atrium:participate` permission + grant to the EMPLOYEE role |
| AT-108 | FE: Directory grid, profile page, edit-profile drawer |

**Exit criteria**
- A non-admin employee can browse every colleague and open any profile.
- The profile response contains **no** compensation, personal email, phone,
  address or document data — asserted by a test that fails on leakage.
- Department scoping still constrains the *HR* employee directory, unchanged.

**Risks:** the privacy projection is the whole sprint's value. Review it
explicitly before merging.

---

### Sprint 2 — The Follow Graph *(Weeks 3–4)*

**Goal:** the social graph, with counts that are correct under concurrency.

| # | Story |
|---|---|
| AT-201 | `AtriumFollow` schema + unique compound index + self-follow guard |
| AT-202 | Follow / unfollow, atomic `$inc` on both counters |
| AT-203 | Followers and following lists, paginated |
| AT-204 | `GET /atrium/suggestions` — same department, new joiners, popular |
| AT-205 | Counter reconciliation job + drift check |
| AT-206 | Cache follower counts and suggestions; invalidate on follow/unfollow |
| AT-207 | FE: follow button with optimistic state, followers/following tabs |

**Exit criteria**
- Double-submitting follow creates **one** edge; the counter matches a live
  `countDocuments` — proven by a concurrent-request test.
- Unfollow is idempotent.
- Following someone changes **nothing** about what their profile returns.

---

### Sprint 3 — Feed, Posts & Kudos *(Weeks 5–6)*

**Goal:** the actual sharing. This is the sprint people will call "the feature".

| # | Story |
|---|---|
| AT-301 | `AtriumPost` schema — body, image, visibility (`FOLLOWERS` \| `ORG`), kind |
| AT-302 | Create/delete own post; image upload |
| AT-303 | `GET /atrium/feed` — followees + org posts, cursor pagination |
| AT-304 | Kudos reactions tied to company values, unique per user/post |
| AT-305 | Comments, with counter |
| AT-306 | Rate limiting on posts and comments |
| AT-307 | FE: composer, feed, post card, kudos picker, comment thread |
| AT-308 | Empty-state seeded by Sprint 4's milestones (stub until then) |

**Exit criteria**
- A 20-post feed loads in a bounded number of queries — **no N+1** on authors,
  counts or reaction state.
- A user cannot react twice or post beyond the rate limit.
- Deleting a post removes it from every feed immediately.

---

### Sprint 4 — Milestones, Moderation & Notifications *(Weeks 7–8)*

**Goal:** make it safe and make it self-sustaining. Without this sprint the
feature should not be enabled for real users.

| # | Story |
|---|---|
| AT-401 | Milestone generator: joiners, anniversaries, confirmations, promotions |
| AT-402 | Per-employee milestone opt-outs (esp. birthdays) |
| AT-403 | Report content — posts and comments |
| AT-404 | Moderation queue + hide-with-reason, audited |
| AT-405 | `atrium:moderate` / `atrium:broadcast` permissions; Spotlight pinning |
| AT-406 | Offboarding rules: hide profile, tombstone authorship, prune edges |
| AT-407 | Minimal notification module + bell (**or** decide: weekly email digest only) |
| AT-408 | Weekly digest email — new joiners, anniversaries, top posts |
| AT-409 | FE: moderation screens, notification centre, Spotlight banner |

**Exit criteria**
- A brand-new tenant's feed is **not empty** — milestones populate it.
- Reported content reaches a moderator and can be hidden, with an audit row.
- A terminated employee disappears from the directory within one sweep, and
  their posts remain readable without a live profile link.

---

### Sequencing rationale

Profiles before follows before posts before moderation is not arbitrary. Each
sprint's output is the next one's input, and the risky, reputation-bearing work
(user-generated content) lands only once the identity and graph beneath it are
stable. Moderation ships **with** posting in the same release, never behind it.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Profile projection leaks HR data | Explicit allow-list + a leakage test; separate permission from `employee:read` |
| Follower counters drift | Atomic `$inc`, unique index, reconciliation job, drift test |
| Feed N+1 at 20 posts | Batch author/reaction lookups; assert query count in a test |
| Harassment or inappropriate content | Report + moderation queue + audit, shipped in the same release |
| Empty feed on launch | Milestones generate content from day one (§3) |
| Silent feature, low adoption | Notifications or digest in Sprint 4 — decide early, it is the biggest unknown |
| Becomes a second Slack | No DMs, no chat. Scope held deliberately |
| Leavers' content orphaned | Tombstoned authorship decided before launch (§4.4) |
| Feed queries slow as posts grow | Compound index on `(organizationId, createdAt, authorId)`; cursor pagination, not offset |

---

## 11. Decisions needed before Sprint 1

1. **Birthdays** — opt-in or opt-out? Opt-**in** is the safer default; some
   people actively do not want their birthday known at work.
2. **Notifications** — build the module (larger, better adoption) or ship a
   weekly email digest only (smaller, likely lower engagement)? This changes
   Sprint 4's size materially.
3. **Who moderates?** HR admins by default, or a named moderator group?
4. **Leaver content** — tombstone (recommended) or remove entirely?
5. **Is Atrium on by default**, or an organization-level toggle? A toggle is
   cheap now and expensive to retrofit.
