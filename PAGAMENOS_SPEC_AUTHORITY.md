# PagaMenos — Specification Authority & Implementation Authorization

This file records which specification documents are authoritative, their precedence, the
independent closure verdict, and the current implementation authorization. It does **not**
restate or modify the specifications.

## Authoritative specification files (in this repository)

1. `PAGAMENOS_PHASE_0A-2_FINAL.md` — consolidated Phase 0A-2 spec.
2. `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH.md` — red-team patch (RT-01…RT-19).
3. `PAGAMENOS_PHASE_0A-2_REDTEAM_PATCH_REV2.md` — closure delta (RT-02/04/05/10/11/14).
4. `PAGAMENOS_PHASE_0A-2_RT04_MICROPATCH.md` — RT-04 final closure micro-patch.
   *(This is the file containing the RT-04 final micro-patch; the authorization brief
   referred to it provisionally as `…_RT04_FINAL_CLOSURE_MICROPATCH.md`.)*

Corpus/research inputs remain authoritative background: `PAGAMENOS_PHASE_0A.md`,
`PAGAMENOS_PHASE_0A_1.md`, `PAGAMENOS_PHASE_0A-1B.md`.

## Precedence (highest first)

```
RT-04 final micro-patch  >  Red-team Patch Revision 2  >  Red-team Patch  >  Phase 0A-2 FINAL
```

Earlier superseded revisions are historical evidence only and MUST NOT drive implementation.

## Independent closure verdict

Codex Sol final closure gate: **A — IMPLEMENTATION GO**. RT-04 CLOSED. 0 unresolved
CRITICAL/HIGH blocking M0–M3; 0 new CRITICAL/HIGH from the final micro-patch.

## Current implementation authorization

- **Authorized now:** M0 only — repository bootstrap & engineering guardrails.
- **Next unauthorized milestone:** M1 (corpus + typed rule domain). Requires an independent
  M0 gate approval before it may begin.
- **Not authorized in this run:** M1, M2, M3, M3.5, participant UI, source monitor,
  analytics, outcomes, admin, deployment.

No domain behavior (`RuleVersion`, `ComparisonScope`, `PurchaseSignature`, economic
calculations, decision states) is implemented at M0.
