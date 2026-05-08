# TORP Optimizer — workflow audit template

Use during **Trace implementation** and **Collateral sweep** for TORP (media ops + CRM). Check items off in notes; record evidence (file paths, screenshots, rule snippets).

## A. Intent map

- [ ] Restate the happy path in **production/CRM language** (who, what artifact, what state change).
- [ ] List alternate paths (deep links, back-button, switching org or role mid-flow).
- [ ] List roles and confirm each can complete the intent **only where product allows**.

## B. CRM and relationship integrity

- [ ] Creating/updating records does not orphan required links (e.g. deal without account if product forbids it).
- [ ] **Deduplication / merge** behavior documented or intentionally out of scope; no silent duplicates with divergent truth.
- [ ] **History / audit**: who changed what is recoverable enough for disputes (even if MVP is thin).
- [ ] Large lists: sorting, filtering, and pagination or limits behave; no accidental full-collection client pulls.

## C. Pipeline, tasks, and handoffs

- [ ] Stage transitions match business rules (who can advance, regress, or archive).
- [ ] Notifications or task assignments (if present) align with actual permissions and do not leak names or titles to wrong roles.
- [ ] Deadline or “blocked” semantics are consistent across screens.

## D. Route and navigation

- [ ] Route definitions match intended URLs (`react-router-dom`).
- [ ] Unauthorized users are redirected or blocked as designed.
- [ ] Deep links survive refresh where product requires it.
- [ ] Mobile: primary navigation reachable (drawer/sheet if sidebar exists).

## E. UI states

For each screen in the flow:

- [ ] **Loading** — skeleton/spinner; no misleading empty state.
- [ ] **Empty** — guidance and primary action when applicable.
- [ ] **Error** — actionable message; retry or escape hatch.
- [ ] **Success** — confirmation or next step is obvious.

Apply `.cursor/skills/ui-responsive-guardrails/SKILL.md` and `.cursor/rules/ui-layout-guardrails.mdc`:

- [ ] No page-level horizontal scroll at `320`, `375`, `390`.
- [ ] Wide tables or timelines live in a scoped `overflow-x-auto` region when needed.
- [ ] Flex/grid children that truncate long content use `min-w-0` where appropriate.

If visuals matter: check `.cursor/skills/torp-aesthetic/SKILL.md`.

## F. Forms and validation

- [ ] Required fields enforced where CRM hygiene requires it (names, emails, legal entities as applicable).
- [ ] Server/rule failures surface clearly (no silent drops on save).
- [ ] Prevent double-submit on slow networks where destructive.

## G. Assets, storage, and confidentiality

- [ ] Correct Storage paths and Firebase rules for **read vs write vs delete**.
- [ ] Users cannot browse or guess URLs to **other clients’** or **higher classification** assets.
- [ ] Version or filename confusion called out if product allows multiple active versions.

## H. Data flow (Firebase)

- [ ] Every read/write/listen and collection/path identified.
- [ ] Writes match schema expectations (types, required fields, timestamps).
- [ ] Listeners unsubscribed or scoped; no leaks or duplicate live updates.
- [ ] Offline / latency: no corrupt partial saves without recovery UX.

## I. Security and authz

- [ ] Client checks mirrored or enforced by **rules** for untrusted clients.
- [ ] No secrets or privileged tokens in client bundles.
- [ ] Role and org assumptions documented; deny-by-default verified for sensitive reads.

## J. Collateral passes

Complete each pass; note **none found** when clean.

| Pass | Focus |
| --- | --- |
| **Adjacent modules** | Shared layout, providers, global listeners, CRM lists elsewhere |
| **Errors & telemetry** | Console noise, swallowed promises, missing error boundaries |
| **Performance** | Heavy tables, N+1 reads, rerenders on live subs |
| **Accessibility** | Focus order, labels, contrast on zinc surfaces |
| **Copy** | TORP voice; **no misleading client-facing promises** |
| **Testing** | Vitest gaps; manual-only paths documented |

## K. Verification log

After code changes:

- [ ] `npm run build`
- [ ] `npm test`
- [ ] Manual walkthrough notes (role, device width, outcome)
