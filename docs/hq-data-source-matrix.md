# HQ data source matrix

To create **sample documents in every HQ collection** for console visibility (emulator or guarded prod), run [`scripts/seedHqFirestore.mjs`](../scripts/seedHqFirestore.mjs) — see [**Firestore HQ bootstrap**](firestore-hq-bootstrap.md).

Runtime HQ admin and staff surfaces read from **in-memory mirrors** populated by `HqFirestoreProvider` (`components/hq/HqFirestoreProvider.tsx`) via `subscribeHqOrgData` in `data/hqFirestoreService.ts`. UI layers call **`hqSyncDirectory` getters** (for example `getHqProjectDirectory()`, `getPlannerItemsSync()`) and bump renders with **`useHqOrgTick()`** when snapshots refresh.

Firestore uses **top-level collections** with a `tenantId` field on documents (see `HQ_COLLECTION` in `data/hqFirestoreService.ts`).

## Routes → primary collections / getters

| Route / surface | Sync getters (read) | Firestore collections (tenant-scoped docs) |
|----------------|---------------------|--------------------------------------------|
| `/hq/admin` (Command) | `getHqProjectDirectory`, `getPlannerItemsSync`, `getShootsSync`, `getAssetsSync`, `getActivitySync`, `getStorageOpsSync`, finance metrics via `financeApi` | `hqProjects`, `plannerItems`, `shoots`, `hqProjectAssets`, `hqActivity`, `hqStorageOpsEvents`, plus finance repo |
| `/hq/admin/projects`, project detail | `getHqProjectDirectory`, per-project helpers from `hqOrgRead` (`getPlannerByProject`, `getAssetsByProject`, …) | `hqProjects`, `plannerItems`, `shoots`, `meetings`, `hqProjectAssets`, `hqDeliverables`, `hqRisks`, `hqBlockers`, `hqDependencies`, `hqChangeOrders`, `hqActivity`, invoices/expenses via finance layer |
| `/hq/admin/planner` | `getPlannerItemsSync`, `getShootsSync`, `getMeetingsSync`, `getHqProjectDirectory` | `plannerItems`, `shoots`, `meetings`, `hqProjects` |
| `/hq/admin/crew` | `getHqCrewDirectory` | `crew` |
| `/hq/admin/clients` | `getHqClientDirectory` | `clients` |
| `/hq/admin/financials` | `getHqProjectDirectory` (project labels), `getFinanceRepository()` / `financeApi` reading from sync mirror | `hqProjects`, `hqInvoices`, `hqProposals`, `hqExpenses` (writes via `hqUpsertInvoice` / `hqUpsertExpense` + tenant context) |
| `/hq/staff`, call sheet print | `getPlannerItemsSync`, `getHqProjectDirectory`, `getShootsSync`, `getHqCrewDirectory`; `getAdminShootById` (`hqOrgRead`) | Same as above for mirrored entities |

## Write paths

Mutations use **`hqWriteContext`** tenant (`setHqTenantForWrites` in the provider) and modules such as `hqProjectOps`, `hqPlannerCalendarOps`, `hqProjectControlsOps`, `hqCrewCrud`, `hqStorageOps`, and `hqFirestoreService` upserts.
