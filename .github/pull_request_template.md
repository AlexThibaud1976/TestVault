## What does this PR do?

<!-- Brief description of the change and its motivation -->

## Task reference

<!-- T-X.Y from tasks.md -->

## Non-regression check *(required — constitution §10.7)*

**Which existing functionality could I have potentially impacted, and how did I verify?**

<!--
Required: provide a link to the relevant test(s) OR a written justification.
"No impact" is acceptable only if the change is provably isolated.
-->

## Done-when checklist

<!-- Tick each "Done when" criterion from the T-X.Y task in tasks.md -->

- [ ] All T-X.Y "Done when" criteria verified
- [ ] `pnpm turbo lint` passes (Biome clean)
- [ ] `pnpm turbo typecheck` passes (zero TS errors)
- [ ] `pnpm turbo test` passes (coverage thresholds met: ≥90% core, ≥80% UI)
- [ ] `pnpm turbo build` passes
- [ ] `npm audit --audit-level=high` clean
- [ ] `README.md` + `docs/user-guide.md` updated if user-visible behaviour changed
- [ ] `CHANGELOG.md` updated (for releases / user-visible changes)
- [ ] Spec-kit (`constitution.md`, `spec.md`, `plan.md`, `tasks.md`) updated if scope changed
