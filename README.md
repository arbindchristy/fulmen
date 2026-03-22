# Fulmen

Fulmen is a security-first, governed multi-agent platform for enterprise automation in regulated environments. The current repository scaffold is intentionally narrow: a MacBook-buildable modular monolith for a governed change-control MVP in IT operations.

## Core Principle
Agents think. Systems enforce. Humans approve.

In the Fulmen MVP, real AI agents perform bounded reasoning inside one tightly controlled workflow:

- Intake Agent
- Planning Agent
- Risk & Policy Agent
- Execution Agent

Those agents do not control policy enforcement, approval gates, tool authorization, audit logging, or persistence. Those responsibilities remain in system-controlled components.

## MVP Shape
- `apps/api` is the single HTTP ingress, orchestration entrypoint, and system enforcement boundary.
- `apps/web` is the minimal operator and approver interface.
- `services/*` are in-process modules behind the API and host the controlled workflow logic.
- `packages/contracts` and `packages/policies` are the reviewable contract and policy source of truth.
- PostgreSQL is the only required local infrastructure dependency.

## MVP Workflow
The MVP wedge remains one governed workflow: change control for IT operations.

- The Intake Agent interprets the request and extracts structured change context.
- The Planning Agent proposes bounded execution steps.
- The Risk & Policy Agent summarizes risk and policy-relevant facts.
- The Execution Agent reasons about approved execution sequencing and result interpretation.

The currently implemented vertical slice stops at governed preview generation:

- operators submit a change request
- the request is persisted in PostgreSQL
- the bounded Intake, Planning, and Risk & Policy roles produce structured preview output
- the system policy engine attaches authoritative allow or approval-required decisions
- approval-required actions create human approval requests
- approvers can review and decide those requests in the UI
- submission and preview generation are written to the audit trail

System components remain authoritative for:

- Policy evaluation
- Approval enforcement
- Tool authorization and execution
- Audit logging
- Persistence

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
5. Apply the initial schema:
   - `npm run db:migrate`
6. Start the API:
   - `npm run dev:api`
7. Start the web app in another terminal:
   - `npm run dev:web`

## Initial Commands
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run db:migrate`

## Current Boundaries
- No direct model-to-tool execution
- No external broker, queue, cache, or Kubernetes dependency
- No generic swarm or open-ended multi-agent platform scope
- Tool execution remains deferred beyond preview and approval

See `docs/architecture.md`, `docs/threat-model.md`, and `docs/roadmap.md` for the approved planning baseline.
