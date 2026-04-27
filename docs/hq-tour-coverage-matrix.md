# HQ Tour Coverage Matrix

Use this matrix to verify feature/function walkthrough coverage by role.

## Viewport matrix

- Desktop (>= 1024)
- Mobile small (320)
- Mobile medium (375)
- Mobile large (390)

## Route and role coverage

| Route / Module | Admin | PM | Staff |
|---|---|---|---|
| `/hq/admin` (Command) | yes | yes | n/a |
| `/hq/admin/projects` | yes | yes | n/a |
| `/hq/admin/planner` | yes | yes | n/a |
| `/hq/admin/crew` | yes | yes (read-only notes) | n/a |
| `/hq/admin/financials` | yes | gated by feature/nav | n/a |
| `/hq/admin/clients` | yes | gated by feature/nav | n/a |
| `/hq/admin/settings/*` | yes | gated by feature/nav | n/a |
| `/hq/admin/projects/:id` (full tabs) | yes | yes | n/a |
| `/hq/admin/projects/:id` (staff-limited tabs) | n/a | n/a | yes (assigned only) |
| `/hq/staff` | n/a | n/a | yes |
| `/hq/staff/settings/*` | n/a | n/a | yes |

## Core function checklist by module

### Command
- quick actions
- KPI interpretation
- priority feed
- storage/ops section

### Projects
- search/filter
- list/board/calendar modes
- stage lane behavior
- open project detail

### Planner
- quick calendar action
- mode switching
- task status/actions
- cross-project execution context

### Crew
- directory filters
- open/edit profile
- role-aware edit restrictions

### Financials
- KPI cards
- invoice filters
- invoice table actions
- proposals list

### Clients
- quick add/edit
- search/relationship filters
- linked project access

### Settings
- tab navigation (mobile + desktop)
- profile/security/notifications/integrations actions
- save/reset paths

### Staff home
- profile summary
- availability editor
- assignment status updates
- project links
- call sheet actions
