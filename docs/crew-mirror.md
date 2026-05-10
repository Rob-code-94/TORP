# Crew mirror

The admin HQ uses shared TypeScript types in [`types.ts`](../types.ts). Org data is **persisted in Cloud Firestore** and mirrored client-side for reactive UI:

- [`components/hq/HqFirestoreProvider.tsx`](../components/hq/HqFirestoreProvider.tsx) subscribes via [`data/hqFirestoreService.ts`](../data/hqFirestoreService.ts) and fills [`data/hqSyncDirectory.ts`](../data/hqSyncDirectory.ts).
- See [**HQ data source matrix**](hq-data-source-matrix.md) for routes, collections, and getters.

The **Crew** role (`/hq/staff/*`) should not duplicate entities — only **filter** and **limit actions**:

- **Read**: projects the user is assigned to, related planner items, call sheets, shared assets, and messages.
- **Write**: own time entries, gear checklists, task status on assigned work, and uploads scoped to those projects.
- **Hide**: org-wide financial totals, unassigned clients, other projects’ margin, user management, and global settings.

Firestore security rules and custom claims enforce isolation; route components stay thin views over the same `AdminProject` / `PlannerItem` layers backed by the sync mirror.
