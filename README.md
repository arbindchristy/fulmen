# Fulmen

Fulmen is a security-first, governed AI platform for enterprise automation in regulated environments. The current repository scaffold is intentionally narrow: a MacBook-buildable modular monolith for a governed change-control agent MVP.

## MVP Shape
- `apps/api` is the single HTTP ingress and orchestration entrypoint.
- `apps/web` is the minimal operator and approver interface.
- `services/*` are in-process modules behind the API.
- `packages/contracts` and `packages/policies` are the reviewable contract and policy source of truth.
- PostgreSQL is the only required local infrastructure dependency.

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
- No live model-provider integration
- No direct model-to-tool execution
- No external broker, queue, cache, or Kubernetes dependency
- No full business workflow implementation yet

See `docs/architecture.md`, `docs/threat-model.md`, and `docs/roadmap.md` for the approved planning baseline.
