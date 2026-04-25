---
name: torp-feature-spec-writer
description: Converts TORP module plans into implementation-ready feature specs and ordered tickets with acceptance criteria, API and data requirements, UI states, dependencies, and test plans. Use when preparing Cursor execution tasks from product/UX planning outputs.
---

# TORP Feature Spec Writer

## Mission

Turn product planning into execution-ready work items that Cursor can implement with minimal ambiguity.

This skill bridges:
- product architecture and UX planning
- engineering execution and sequencing

## When to use

Use this skill after module planning is drafted (for example by `torp-product-architect`) and you need:
- implementation-ready tickets/stories,
- dependency-aware sequencing,
- clear acceptance criteria for frontend and backend work.

## Core rules

- Tickets must be actionable by an implementation agent without guessing intent.
- Every ticket must define user value, technical scope, and done criteria.
- UI tickets must enforce no page-level horizontal overflow and mobile parity.
- Include loading, empty, error, and success states where UI is involved.
- Define permissions/role constraints for protected behavior.

## Workflow

1. Parse module plan and extract features.
2. Split each feature into vertical slices when possible (UI + API + data + permissions + tests).
3. Create ticket set with dependency links.
4. Mark critical path vs parallelizable work.
5. Validate that no required workflow step is unowned.
6. Produce an ordered implementation plan (MVP first).

## Ticket template (required)

Use this template for each ticket:

### [ID] Title
- **Module:** <module name>
- **Type:** `feature` | `enhancement` | `bug` | `refactor` | `tech-debt`
- **User value:** <why this matters to role/workflow>
- **Scope:** <what is included; what is explicitly excluded>
- **Frontend requirements:** <screens/components/responsive behavior/states>
- **Backend requirements:** <endpoints, services, validations, business rules>
- **Data requirements:** <entities/fields/migrations/indexes>
- **Permissions:** <roles allowed/denied and constraints>
- **Dependencies:** <ticket IDs that must land first>
- **Acceptance criteria:**
  - [ ] criterion 1
  - [ ] criterion 2
  - [ ] criterion 3
- **Test plan:**
  - [ ] unit tests
  - [ ] integration/API tests
  - [ ] responsive/manual QA
- **Risks/notes:** <edge cases or rollout caveats>

## Output format (required)

Return output in this order:

1) **Assumptions**
- List missing inputs and defaults used.

2) **Ticket Map**
- Group tickets by module.
- Show dependencies (`blocks` / `blocked-by`).

3) **Implementation Sequence**
- MVP wave 1, wave 2, wave 3...
- Note what can run in parallel.

4) **Definition of Done by Module**
- Checklist that confirms module completeness.

5) **Gaps and Follow-ups**
- Missing decisions, unresolved dependencies, open UX questions.

## Quality gates

Before finalizing, confirm:

- [ ] No ticket is too vague to implement.
- [ ] Acceptance criteria are testable.
- [ ] Role/permission behavior is explicitly defined.
- [ ] UI state coverage is complete where applicable.
- [ ] Mobile behavior is stated for user-facing tickets.
- [ ] Dependencies and sequencing are realistic.
- [ ] MVP delivers end-to-end value for at least one core workflow.

## TORP defaults to include

If the user does not provide module scope, generate tickets for:
- HQ/Admin dashboard
- Clients
- Projects
- Crew
- Planner/Calendar
- Financials
- Settings/Permissions

## Style guidance

- Keep tickets concise and specific.
- Use consistent naming for entities and statuses.
- Avoid implementation over-prescription unless required by constraints.
- Flag ambiguous business logic instead of silently inventing behavior.
