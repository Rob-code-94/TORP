---
name: torp-optimizer
description: >-
  TORP-specific workflow and product optimizer for media companies: validates CRM
  and production flows against intent, finds cleaner implementations, surfaces
  collateral issues (auth, sensitive materials, data, UX), and fixes in-scope with
  verification. Use for TORP workflow audits, media ops or CRM reviews,
  post-feature verification, PR hardening, “working as designed” checks,
  collateral-risk review, or before Firebase rules and auth-sensitive changes.
---

# TORP Optimizer

## Mission

Close the gap between **design intent** and **runtime behavior** for **TORP**—a product shaped for **media production and operations** (studios, production companies, creative vendors) and the **CRM-style** work that surrounds it: relationships, pipeline, deliverables, and coordination.

Prefer simpler, clearer implementations where they reduce operational risk. Explicitly discover **collateral** issues (permissions, wrong audience seeing materials, broken handoffs between modules, regressions on mobile set). Fix what is in scope, then **re-verify**.

## TORP domain lens (apply on every pass)

Use this lens when mapping intent and scanning for gaps—typical pain points in media + CRM stacks:

- **Pipeline visibility**: Deals, productions, or jobs should not be an opaque “black box”; statuses and ownership should be truthful under load and partial failures.
- **Relationships**: Contacts, companies, and roles (buyer vs vendor vs talent) imply **different permissions and surfaces**—catch mixed contexts early.
- **Assets and versions**: Deliverables, masters, references, and WIP confuse users when versioning, naming, or permissions are ambiguous; prioritize clarity and unauthorized-access prevention.
- **Feedback and decisions**: Approval threads scattered across channels become product debt; TORP flows should consolidate **who said what** and **what changed**.
- **Field / mobile use**: Coordinators work from phones and uneven networks; resilient states and **no page-level horizontal scroll** matter (`ui-responsive-guardrails`).
- **Confidentiality**: Treat unreleased work, rates, and personal data as **high-sensitivity** by default in rules and UI.

## When to use

- Auditing a **CRM-adjacent** flow (contacts, companies, pipeline, tasks, communications) or **production / delivery** tooling inside TORP.
- After shipping a module tied to revenue, deadlines, or client-facing deliverables.
- Refactors that might break **navigation, shared shells, or org-wide lists**.
- Firebase Auth/Firestore/Storage rules or client write paths involving **roles or assets**.
- Pre-merge PR hardening when **permissions or sensitive media** could leak.

## Companion reads (do not skip when relevant)

- **UI / layout**: Read `.cursor/skills/ui-responsive-guardrails/SKILL.md` and enforce `.cursor/rules/ui-layout-guardrails.mdc`.
- **Visual language**: Read `.cursor/skills/torp-aesthetic/SKILL.md` when auditing or changing React/Tailwind surfaces.
- **Tickets / sequencing**: Shape handoff items with `.cursor/skills/torp-feature-spec-writer/SKILL.md`.
- **Product framing**: Use `.cursor/skills/torp-product-architect/SKILL.md` when intent vs implementation is ambiguous.

## Inputs

1. Complete [intake-questionnaire.md](intake-questionnaire.md). Record unknowns under **Assumptions**.
2. Gather links: routes, PRs, specs, CRM field definitions, or sample records (sanitized).

## Workflow

1. **Intake** — Questionnaire + assumptions.
2. **Map intent** — User-visible steps, **roles**, acceptance criteria, **entities** touched (contacts, deals, productions, assets).
3. **Trace implementation** — Routes → components → hooks/services → Firebase and server paths. Map loading / empty / error / success states.
4. **Collateral sweep** — Security and rules, **authz by role and org**, data integrity, performance on large lists, a11y, copy consistency, responsive regressions, race conditions.
5. **Verify** — After any code change: `npm run build`, `npm test`. Add manual checks from [workflow-audit-template.md](workflow-audit-template.md) where automation is thin.
6. **Remediate** — Smallest fix that satisfies acceptance criteria; no drive-by refactors.
7. **Re-verify** — Repeat targeted verification until checks pass or scope is explicitly deferred.

Use [output-templates.md](output-templates.md) for structured findings and handoff.

## Severity rubric

| Level | Meaning |
| --- | --- |
| **P0 — Blocker** | Wrong behavior, **wrong audience access**, data loss risk, security/authz hole, or broken revenue/critical path. |
| **P1 — High** | Major UX failure, inconsistent permissions, missing error handling on common failures, or serious maintainability hazard. |
| **P2 — Medium** | Edge-case behavior, polish gaps, duplicate logic, unclear states, or perf concerns with clear repro. |
| **P3 — Low** | Minor copy, trivial cleanup, nice-to-have consistency; safe to batch or defer with explicit acceptance. |

## Verification defaults (TORP stack)

- **Always** (when code changed): `npm run build`, `npm test`.
- **Firebase**: If reads/writes or rules changed, trace rule implications and document manual checks (emulators, staging).
- **Responsive**: Walk `320` / `375` / `390` against guardrails; fix page-level horizontal scroll.

## Stop and escalate

Ask the user before proceeding when:

- Production data, destructive migrations, or elevated credentials are required.
- Product intent or **deal/production semantics** are unclear or contradictory.
- Verification needs billing, legal review, or third-party integrations you cannot access.

## Supporting files

- [intake-questionnaire.md](intake-questionnaire.md)
- [workflow-audit-template.md](workflow-audit-template.md)
- [output-templates.md](output-templates.md)
