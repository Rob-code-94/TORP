# TORP Optimizer — intake questionnaire

Copy into the audit thread and fill what you know. Leave blanks rather than guessing; list gaps under **Assumptions**. This skill is **TORP-only** and assumes **media company / production operations** plus **CRM-style** relationship and pipeline work.

## Scope

- **Module / feature name:**
- **Primary user goal (one sentence):**
- **Entry route(s) or URL path(s):**
- **Roles / personas:** (e.g. exec producer, coordinator, sales, finance read-only, external collaborator if any)
- **Out of scope for this pass:**

## Media + CRM context

- **Entity types in play:** (e.g. contact, company, deal, production, project, task, asset, invoice)
- **Pipeline or stage model** (if any): names and who may move stages
- **Typical record volume:** (e.g. list screens with hundreds+ rows)
- **Sensitive data classes:** (unreleased work, rates, contracts, PII, talent minors—yes/no)
- **Asset lifecycles:** WIP vs client-ready vs archived; who may download or share

## Success criteria

- **Must work (acceptance):**
- **Nice-to-have (explicitly optional):**
- **Known constraints:** (deadline, embargo, flag-gated behavior, legacy imports)

## Technical surfaces

- **React Router routes touched:**
- **Components / screens (paths if known):**
- **Firebase:** Auth flows? Firestore collections/doc paths? Storage paths?
- **Backend / Cloud Functions / Express** (`server/`, `functions/`): yes / no — details:
- **Environment:** local dev, emulator, staging — what is available?

## Data and permissions

- **Who may read / write what?** (by role and org boundary)
- **Cross-tenant or cross-client isolation** expected: yes / no — how enforced?
- **Rules files or indexes expected to change:** (`firestore.rules`, `storage.rules`, etc.)

## UX and layout

- **Loading / empty / error copy expectations** (if any):
- **Mobile-critical actions** (on-set / travel; no horizontal page scroll):
- **Design references:** spec, Figma, prior PR — links:

## Risk flags

- **Client-facing surfaces** (wrong copy or wrong file = reputational risk):
- **Payments, billing, or external OAuth:**
- **Bulk deletes, imports, or migrations:**
- **Production-only repro:**

## Assumptions

- (Agent: list inferred defaults when the questionnaire is incomplete.)
