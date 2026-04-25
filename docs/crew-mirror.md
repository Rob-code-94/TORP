# Crew mirror (future)

The admin HQ uses shared TypeScript types in [`types.ts`](../types.ts) and mock data in [`data/adminMock.ts`](../data/adminMock.ts). The **Crew** role should not duplicate entities — only **filter** and **limit actions**:

- **Read**: projects the user is assigned to, related planner items, call sheets, shared assets, and messages.
- **Write**: own time entries, gear checklists, task status on assigned work, and uploads scoped to those projects.
- **Hide**: org-wide financial totals, unassigned clients, other projects’ margin, user management, and global settings.

When Firebase is added, enforce the same rules in Firestore security rules and custom claims; keep route components (`/hq/staff/*`) as thin views over the same `AdminProject` / `PlannerItem` data layer.
