// PagaMenos — DISPOSABLE required-check enforcement canary.
// This file exists ONLY to make `pnpm lint` fail on a PR targeting
// `m3.5b-a2-integration`, so we can prove GitHub's ruleset blocks merge
// when the required `verify` status check fails. It touches nothing else:
// no runtime import, no build output, no side effect. Delete this file
// as soon as the canary PR has demonstrated enforcement (its PR must
// never be merged into integration).
//
// The intentional lint failure below is `no-unused-vars` — deterministic
// under this repo's flat ESLint config (js.configs.recommended).

const enforcementCanaryUnused =
  'CANARY: intentional unused binding to fail pnpm lint — DELETE with the canary PR.';
