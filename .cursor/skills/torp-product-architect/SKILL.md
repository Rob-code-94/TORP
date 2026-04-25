---
name: torp-product-architect
description: Plans TORP as a complete media operations system with design-first architecture, feature completeness checks, and screen-level UI workflows. Use when scoping modules, defining features/functions, creating information architecture, drafting MVP/V2 plans, or polishing product flows before implementation.
---

# TORP Product Architect Skill

## Mission

Design TORP as a full media-company operating system before implementation detail work begins.

Focus on:
- feature/function completeness,
- practical user workflows,
- scalable information architecture,
- clear UI layout behavior across mobile and desktop.

## Product framing

Treat TORP as an internal operations platform that manages:
- clients,
- projects,
- crew,
- scheduling/planning,
- financial operations,
- organization settings and permissions.

The output should help implementation move faster with fewer rework cycles.

## Operating principles

- Design first, then implementation details.
- Prefer simple, high-signal workflows over novelty.
- Ensure every desktop flow has a mobile-equivalent path.
- Keep module boundaries explicit so backend implementation can map cleanly.
- Flag missing rules, dependencies, and edge cases early.

## Non-negotiable UX and system rules

- No horizontal page scroll at the page/root level.
- Mobile-complete behavior for core actions and navigation.
- Role-based access expectations defined per module.
- Required state coverage per screen: loading, empty, error, success.
- Reusable UI patterns before one-off layouts.

## Standard workflow

Use this process for each planning request:

1. Define the business purpose and target roles.
2. Propose information architecture (top-level modules + nav model).
3. Run an overlap audit across existing and proposed capabilities.
4. Break down each module into screens/views and key actions.
5. Define data requirements and state/status models.
6. Identify edge cases, validation rules, and permission boundaries.
7. Specify mobile layout and interaction behavior.
8. List cross-module dependencies.
9. Produce a "definition of done" checklist.
10. Prioritize into MVP then V2.
11. End with a gap report for missing or risky areas.

## Overlap audit (required)

Before finalizing any architecture output, perform a full overlap audit to avoid duplicate features/functions.

For each capability, map:
- capability name,
- module/tab,
- primary object (project/task/client/crew/financial record/etc.),
- primary user goal,
- scope level (portfolio vs single-project vs task-level).

Then classify each proposed item as one of:
- `reuse existing`,
- `extend existing`,
- `new capability`.

If two items look similar (for example, multiple "calendar" surfaces), explicitly state:
- how they differ,
- which object each one controls,
- which actions each one owns,
- and whether one should be removed, merged, or renamed.

Do not approve duplicate capabilities with different labels unless there is a clear scope or role difference.

## Required output structure

Use this exact structure unless the user requests another format:

1) **Information Architecture**
- Primary modules
- Global navigation model
- Role entry points

2) **Overlap Audit**
- Existing vs proposed capability matrix
- Duplicate/near-duplicate flags
- Reuse/extend/new classification
- Merge/rename/remove recommendations

3) **Module-by-module Blueprint**
- Purpose
- Roles involved
- Key screens/views
- Key actions
- Required data fields
- State/status model
- Edge cases
- Mobile behavior
- Dependencies
- Definition of done

4) **Prioritized Build Plan**
- MVP order (with rationale)
- V2 expansion items
- Optional future automation opportunities

5) **Gap Report**
- Missing workflows
- Missing data assumptions
- Permission/security ambiguities
- UX risks likely to cause rework

## TORP default modules

Include these by default unless the user narrows scope:
- HQ/Admin dashboard,
- Clients,
- Projects,
- Crew,
- Planner/Calendar,
- Financials,
- Settings/Permissions.

## Quality checklist before finalizing output

- [ ] All primary roles can complete core workflows.
- [ ] Desktop and mobile paths are equivalent for key tasks.
- [ ] No page-level horizontal overflow assumptions.
- [ ] Every module includes explicit states and edge cases.
- [ ] Dependencies are listed so implementation sequence is clear.
- [ ] MVP cut is realistic and not missing operational essentials.
- [ ] Overlap audit completed with duplicate/near-duplicate decisions.

## Response style

- Be concrete, not abstract.
- Prefer checklists and structured bullets over long prose.
- Call out assumptions explicitly.
- If information is missing, ask concise clarifying questions, then continue with best-practice defaults.
