# Fulmen

Fulmen is a security-first, governed multi-agent platform for enterprise automation in regulated environments. The current product slice is `ControlProof`: an AI-native control evidence workflow that assembles audit-ready proof, detects evidence gaps, and routes high-sensitivity exception decisions through system-enforced approval.

## Core Principle
Agents think. Systems enforce. Humans approve.

## Current Product
`ControlProof` is a governed evidence-cycle alpha for control owners, audit teams, and approvers.

The implemented vertical slice supports:

- evidence-cycle intake for one control and one evidence period
- bounded agent reasoning for evidence normalization, planning, risk summarization, and gap adjudication
- deterministic evidence-pack generation with artifacts, follow-ups, and draft narrative
- system-authoritative policy evaluation for governed evidence actions
- approval workflows for high-sensitivity exception review
- append-only audit event capture and read APIs

The system remains authoritative for:

- policy enforcement
- approval state
- audit logging
- persistence
- any future tool execution or connector dispatch

## Repository Shape
- `apps/api` — HTTP API, orchestration boundary, approval and audit endpoints
- `apps/web` — ControlProof operator and approver interface
- `services/orchestrator` — bounded multi-agent evidence workflow
- `services/policy-engine` — reviewable policy decisions for evidence actions
- `services/audit` — append-only audit service and local evidence boundary
- `packages/contracts` — shared schemas and API contracts
- `packages/policies` — versioned policy bundle for governed evidence review

## Local Development
1. Install Node.js 20+ and Docker Desktop.
2. Copy the example environment files:
   - `cp .env.example .env`
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/web/.env.example apps/web/.env`
3. Start PostgreSQL:
   - `docker compose -f deploy/docker/compose.yml up -d`
4. Install dependencies:
   - `npm install`
5. Apply the schema and migrations:
   - `npm run db:migrate`
6. Start the API:
   - `npm run dev:api`
7. Start the web app in another terminal:
   - `npm run dev:web`

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`

## Boundaries
- no direct model-to-tool execution
- no agent-owned policy enforcement, approvals, audit logging, or persistence
- no generic open-ended agent platform behavior
- tool execution remains deferred; the alpha stops at governed review and approval

See `docs/architecture.md` and `docs/threat-model.md` for the current product baseline.
