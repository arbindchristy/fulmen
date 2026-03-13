# Fulmen Agent Instructions

## Project purpose
Fulmen is a security-first, governed multi-agent platform for enterprise automation in regulated environments.

## Repository priorities
1. Security
2. Correctness
3. Auditability
4. Simplicity
5. Developer experience

## Rules
- Do not introduce direct model-to-tool execution.
- All sensitive actions must be policy-checked.
- Prefer boring, reliable designs over clever ones.
- Keep changes scoped and cohesive.
- Add or update tests for meaningful behavior changes.
- Document important design decisions in `docs/architecture.md`.
- Document security-sensitive decisions in `docs/threat-model.md`.
- If a feature is out of MVP scope, put it in `docs/roadmap.md` instead of implementing it.

## Repo layout
- `apps/web` — frontend
- `apps/api` — main API
- `services/*` — domain services
- `packages/*` — shared contracts, UI, SDK, policies
- `examples/change-control-agent` — reference workflow
- `deploy/*` — local and production deployment
- `docs/*` — architecture, threat model, roadmap, demo docs

## Definition of done
A task is done only when:
- code is written
- tests pass or are updated appropriately
- docs are updated if behavior changed
- security implications are considered
- changes are reviewable and scoped
