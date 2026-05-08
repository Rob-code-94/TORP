# TORP Optimizer — output templates

Structured outputs for TORP audits (media operations + CRM). Use severities from `SKILL.md`.

## 1. Executive summary

```markdown
## Summary
- **Flow:** <name>
- **TORP context:** <CRM | production | asset | mixed>
- **Verdict:** Pass | Pass with follow-ups | Blocked
- **Top risks:** <up to 3 bullets; call out confidentiality or wrong-audience access if any>

## Assumptions
- <bullet list>

## Recommendations (ordered)
1. <most important>
2. ...
```

## 2. Findings table

```markdown
| ID | Severity | Area | Finding | Evidence | Proposed fix | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | P0 | Auth/Rules | ... | `path:line` or rule snippet | ... | eng / product |
```

**Area hints:** `CRM-data`, `Pipeline`, `Assets/Storage`, `Auth/Rules`, `UI/Responsive`, `Performance`, `Copy`, `A11y`.

## 3. Trace map (optional)

```markdown
## Implementation trace
1. Route `<path>` → `<Component>` (`src/...`)
2. Entity `<Contact|Deal|Production|...>` → service/hook → Firebase `<collection>` ...
3. Storage / assets: `<bucket/path pattern>` + rules reference
4. Rules: `<firestore.rules>` / `<storage.rules>` section ...
```

## 4. Remediation plan

```markdown
## In scope now
- [ ] F-01: <one-line fix>
- [ ] F-02: ...

## Deferred / product decision
- [ ] F-07: <needs PM, legal, or rule policy>

## Verification after fixes
- `npm run build` — pass/fail
- `npm test` — pass/fail
- Manual: <steps; include role + mobile width if UI>
```

## 5. Regression checklist (TORP-flavored)

```markdown
- [ ] Happy path (<role>) for CRM or production intent
- [ ] Permission denial path (wrong org / wrong role)
- [ ] Empty + error states (slow network)
- [ ] Mobile widths 320 / 375 / 390 (no page horizontal scroll)
- [ ] Firebase rules deny unauthorized reads/writes on sensitive paths
- [ ] Asset access: cannot open other client or unreleased classification (if applicable)
```

## 6. Mini ticket stub (optional — `torp-feature-spec-writer`)

```markdown
### [TORP-XXX] <Title>
- **Module:** <module>
- **Type:** `bug` | `enhancement` | `refactor` | `tech-debt`
- **User value:** ... (tie to media ops or CRM outcome)
- **Scope:** ...
- **Frontend requirements:** ... (states + responsive)
- **Backend / rules:** ... (roles, org boundary, Storage)
- **Acceptance criteria:**
  - [ ] ...
- **Test plan:**
  - [ ] vitest
  - [ ] manual responsive QA
  - [ ] rules / permission matrix spot-check
```
