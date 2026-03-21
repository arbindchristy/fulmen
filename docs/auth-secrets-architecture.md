# Fulmen Auth, Authorization, And Secrets Architecture

## Purpose
This document defines Fulmen's authentication, authorization, and secrets-handling architecture for the current MVP and the next implementation stages.

It is intentionally narrow and aligned with the current Fulmen shape:

- one governed change-control workflow
- one API control plane
- one web UI
- bounded agent roles
- system-owned governance controls
- MacBook-buildable local development

Core principle:

Agents think. Systems enforce. Humans approve.

## Scope And Principles
This document covers four separate security planes:

1. Human authentication and authorization
2. Model-provider authentication
3. Tool and connector authentication
4. Audit identity and traceability

The required separation is strict:

- human identity is not model-provider identity
- model-provider credentials are not connector credentials
- agents never receive raw backend secrets
- the frontend never receives backend secrets
- policy, approval, tool authorization, audit, and persistence remain system-owned

## Current MVP Position
Today Fulmen has:

- local development auth middleware in `apps/api`
- tenant and role context carried on requests
- auto-provisioned local development users and roles on submission
- a governed preview flow only
- no real OIDC session handling yet
- no real model-provider integration yet
- no real connector credential resolution yet

This is acceptable for the current MVP slice only because:

- execution is still deferred
- approvals are not yet live
- model-provider calls are not yet enabled
- the current system remains a local-development-first modular monolith

## Plane 1: Human Authentication And Authorization

### Current MVP
Human auth is currently a local development stub.

Behavior:

- `apps/api/src/auth/dev-auth.ts` reads `x-fulmen-user-id`, `x-fulmen-tenant-id`, and `x-fulmen-role`
- if headers are missing, the API falls back to local default values from environment variables
- request handling receives a tenant-scoped auth context
- local users and roles are auto-provisioned into PostgreSQL when needed

This mode is for local development only.

It is acceptable now because:

- it keeps the MVP buildable on one MacBook
- it exercises tenant and role-aware control paths without adding a production IdP dependency
- the current shipped slice stops before execution and live approvals

### Future Direction
Fulmen should move to OIDC-based enterprise authentication with SSO.

Expected shape:

- web app authenticates humans through enterprise OIDC or SAML-backed SSO routed through OIDC
- API trusts signed session or token material produced by the auth boundary
- API maps the authenticated user to a Fulmen tenant and RBAC role set
- local dev auth remains available behind an explicit development-only mode

Preferred production model:

- OIDC authorization code flow with PKCE for browser sign-in
- backend-issued session cookie or trusted token exchange for API calls
- no direct frontend ownership of Fulmen authorization logic

### Roles
Fulmen MVP roles are:

- `operator`: can submit change requests and review governed previews
- `approver`: can review and approve or reject approval-required actions
- `auditor`: can inspect audit history and evidence
- `admin`: can manage tenant-scoped configuration, connectors, policy bundles, and role assignments

Rules:

- users may hold multiple roles
- roles are tenant-scoped, not global
- authorization decisions require both role membership and tenant match
- role checks happen in system middleware and service boundaries, not inside agents

### Approval Identity Requirements
Approval is a human control point and must use stronger identity guarantees than ordinary browsing.

Minimum requirements for live approval:

- approver must be an individually identifiable human user
- approver must belong to the same tenant as the request
- approver must hold the `approver` role for that tenant
- approval decisions must record actor identity, timestamp, action fingerprint, tenant, and justification
- shared accounts must not be accepted for approval actions

Recommended hardening for the first live approval implementation:

- require recent authentication for approval decisions
- prefer MFA enforcement through the enterprise IdP
- record external subject and Fulmen user id together in approval audit records

### Tenant-Aware Authorization Expectations
Tenant scoping is mandatory across the API and persistence layers.

Required behavior:

- every authenticated API request resolves to exactly one tenant context
- every tenant-scoped read and write must filter by `tenant_id`
- role assignments must be evaluated within tenant scope
- approval tasks must not be visible across tenants
- audit records must preserve tenant context for reconstruction and export

Non-goal for MVP:

- broad self-serve multi-tenant administration

Fulmen only needs explicit tenant-aware boundaries in code and schema for now.

## Plane 2: Model-Provider Authentication

### Purpose
Later Fulmen will allow bounded agent roles to call external model providers through backend-controlled adapters.

These calls are for reasoning only. They are not an execution authority.

### Required Architecture
Model-provider credentials must exist only on the backend.

Rules:

- no provider API key in the frontend
- no provider API key in prompts
- no provider API key in database business tables
- no provider API key in audit payloads
- no direct browser-to-provider calls
- no direct model-to-tool execution

### Current MVP
Current agent behavior is deterministic local logic behind interfaces.

That is acceptable because:

- it preserves the agent role boundaries
- it allows contract and orchestration work to proceed
- it avoids introducing live provider dependencies before governance is ready

### Future Provider Integration Shape
Fulmen should use a provider abstraction or adapter layer.

Responsibilities of the provider adapter:

- accept a bounded role request from the orchestrator or guard layer
- add provider-specific authentication headers
- call the external provider
- normalize provider responses into Fulmen-owned structured output contracts
- surface provider metadata needed for audit and debugging

The provider adapter must not:

- decide policy
- authorize tools
- persist workflow state directly
- bypass the guard layer

### Secret Handling
Current local development:

- provider credentials live in backend environment variables only

Future production:

- provider credentials should come from a secret manager
- API process resolves secret values at runtime
- raw secret values stay out of app tables and out of the frontend

### Prompt And Context Rules
Prompts must never contain secrets.

Specifically:

- do not include API keys
- do not include connector credentials
- do not include tokens or session cookies
- do not include secret-manager payloads
- do not include raw credential-bearing config blobs

Only minimal request-scoped business context should be sent to the provider.

## Plane 3: Tool / Connector Authentication

### Purpose
Later Fulmen will authenticate to enterprise systems through the tool gateway and allowlisted connectors.

This is separate from model-provider access.

### Required Architecture
Connector auth must follow a `credential_ref` pattern.

Meaning:

- connector configuration in Fulmen stores a reference such as `credential_ref`
- the reference points to a backend-only secret source
- connector code resolves the secret at runtime through a system-controlled secret resolver
- connector secrets are never embedded in prompts, frontend payloads, or normal business records

### Rules
- connector credentials are backend-only
- connector credentials are distinct from model-provider credentials
- connector credentials are scoped per connector or per action family where possible
- connector credentials must use least privilege
- connector auth is resolved only inside the tool gateway or a dedicated connector-auth layer

### Current MVP
Current MVP uses a stub connector path only.

That means:

- no live enterprise credential exchange is required yet
- the design must still preserve `credential_ref` as the contract direction
- PostgreSQL may store connector metadata and `credential_ref`, but not raw secrets

### Production Direction
When live connectors arrive:

- store connector metadata in Fulmen
- store raw connector credentials in a secret manager
- resolve secrets only on the backend
- log connector identity and action metadata, not raw credential values
- use connector-specific service accounts instead of shared high-privilege credentials

### Least-Privilege Expectations
Each connector should be designed so that:

- actions are allowlisted by connector type
- credentials are limited to the minimum systems and verbs required
- prod and non-prod credentials are separated
- connector credentials can be rotated without rewriting workflow logic

## Plane 4: Audit Identity And Traceability

### Required Identities
Fulmen should record enough identity to reconstruct who asked for what, which bounded agent reasoned over it, which provider produced any model output, and which connector identity later executed actions.

The audit model must distinguish:

- request submitter identity
- approving human identity
- agent role identity
- model/provider identity
- tool connector identity

### Identity Recording Requirements
#### Request submitter
Record:

- Fulmen user id
- tenant id
- role at the time of submission
- external subject when real auth exists

Persist now:

- Fulmen user id
- tenant id
- role-derived context through request auth and audit event actor fields

Persist later:

- external IdP subject
- session or auth strength metadata if needed for approval-grade traceability

#### Approving human
Record:

- Fulmen user id
- tenant id
- approval decision
- justification
- exact action or approval request id
- timestamp

Persist now:

- schema support exists, but live approval processing is deferred

Persist later:

- external subject
- auth strength or recent-auth marker
- assigned role and optional named assignment

#### Agent role
Record:

- agent role name such as `intake`, `planning`, `risk_policy`, `execution`
- workflow or run context
- contract version or implementation version where practical

Persist now:

- audit actor id like `orchestrator` plus bounded agent role in payload where useful

Persist later:

- explicit run-step records for each agent turn
- prompt and output hashes or evidence references where needed

#### Model/provider
Record:

- provider name
- model name
- provider request id if available
- adapter version if useful for debugging

Persist now:

- not applicable because live providers are not yet enabled

Persist later:

- provider metadata in audit events or step records
- no raw API keys or raw auth headers

#### Tool connector identity
Record:

- connector id
- connector type
- service account or identity label if available
- action name

Persist now:

- connector metadata only when the stub path is exercised

Persist later:

- connector id plus `credential_ref`
- execution request and result summary
- no raw connector secrets

### Minimum Persistence Boundary
Now:

- submitted request identity
- tenant context
- audit events for submission and preview generation
- bounded agent role traceability at a coarse workflow level

Later:

- approval actor identity
- provider metadata
- connector identity metadata
- step-level identity and evidence linkage

## Local Development Profile vs Production Profile

### Local Development
Goals:

- keep the system easy to run on one MacBook
- avoid mandatory external identity or secret systems
- preserve the same control boundaries as production

Allowed locally:

- dev auth stub
- backend environment variables for provider and connector credentials
- deterministic agent behavior
- stub connectors
- local `.env` files excluded from version control

Not allowed locally:

- frontend-held provider or connector credentials
- raw secrets in prompts
- direct model-to-tool execution
- skipping tenant context

### Production
Expected production direction:

- enterprise OIDC/SSO for humans
- MFA and stronger approval identity guarantees via IdP
- secret manager for model-provider and connector credentials
- backend-only secret resolution
- strict RBAC plus tenant scoping
- audit records that tie human, agent, provider, and connector identities together

## Non-Goals For MVP
- full identity governance platform features
- customer self-serve tenant onboarding
- arbitrary user-defined auth plugins
- browser-side provider integration
- browser-side connector integration
- storing raw secrets in PostgreSQL
- giving agents direct access to secret material
- generalized secret orchestration beyond Fulmen's provider and connector needs

## Recommended Environment Variables
These do not all need to exist immediately. They define the intended implementation direction.

### Human auth
- `FULMEN_AUTH_MODE`
  - expected values later: `dev`, `oidc`
- `FULMEN_DEV_DEFAULT_USER_ID`
- `FULMEN_DEV_DEFAULT_TENANT_ID`
- `FULMEN_DEV_DEFAULT_ROLE`
- `FULMEN_OIDC_ISSUER_URL`
- `FULMEN_OIDC_CLIENT_ID`
- `FULMEN_OIDC_CLIENT_SECRET`
- `FULMEN_OIDC_REDIRECT_URI`
- `FULMEN_SESSION_SECRET`

### Model providers
- `FULMEN_MODEL_PROVIDER`
- `FULMEN_MODEL_PROVIDER_API_KEY`
- `FULMEN_MODEL_PROVIDER_BASE_URL`
- `FULMEN_MODEL_DEFAULT_MODEL`
- `FULMEN_MODEL_TIMEOUT_MS`

### Tool / connector auth
- `FULMEN_SECRET_RESOLVER_MODE`
  - expected values later: `env`, `secret_manager`
- `FULMEN_CONNECTOR_SECRET_PREFIX`
- `FULMEN_CONNECTOR_<NAME>_CREDENTIAL_REF`
- `FULMEN_CONNECTOR_<NAME>_BASE_URL`

### Secret manager integration
- `FULMEN_SECRET_MANAGER_PROVIDER`
- `FULMEN_SECRET_MANAGER_PROJECT`
- `FULMEN_SECRET_MANAGER_REGION`

Environment variable rules:

- only backend processes read these values
- web builds must not expose these values through `VITE_` variables
- if a variable carries a secret, do not copy it into logs, prompts, or audit payloads

## Security Rules
- Treat all agent output as untrusted input.
- Keep policy and approval enforcement outside agents.
- Keep all secrets backend-only.
- Separate model-provider credentials from connector credentials.
- Use `credential_ref`, not raw connector secrets in business tables.
- Require tenant-aware authorization on every tenant-scoped operation.
- Record human identity for every state-changing action.
- Record approval justification for every approval decision.
- Redact secret-like values from logs, evidence, and audit payloads.
- Keep a development auth mode only when it is explicitly gated to local environments.

## Anti-Patterns To Avoid
- putting provider keys in the frontend
- passing connector passwords or tokens into prompts
- reusing one shared secret for both model providers and enterprise connectors
- letting agents choose tenant context
- letting agents decide authorization or approval state
- storing raw connector credentials in `tool_connectors.config_json`
- using anonymous or shared approver identities
- logging raw request headers that contain auth material
- treating audit log entries as optional for approval or execution paths

## Implementation Sequencing Recommendation
1. Document the boundaries and expected identities first.
2. Add a provider abstraction so live model calls can be introduced without changing governance boundaries.
3. Introduce real human auth with OIDC/SSO and tenant-aware RBAC.
4. Harden approval identity requirements before live approval processing.
5. Integrate connector secret resolution behind `credential_ref` and a backend secret resolver.

## Recommended Next Decisions
The next implementation decisions that should be made explicitly are:

- exact session model for OIDC-backed API access
- exact shape of tenant-to-user mapping on first login
- provider adapter interface and provider metadata audit schema
- secret resolver interface for connector and model-provider credentials
- approval auth-strength requirements for the first live approval release
