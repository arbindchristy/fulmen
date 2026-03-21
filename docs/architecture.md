# Fulmen Architecture

## Purpose
Fulmen is a security-first, governed multi-agent platform for enterprise automation in regulated environments. The initial MVP is a governed multi-agent change-control workflow for IT operations.

This document treats `README.md` and `AGENTS.md` as the source of truth and optimizes for:

- Security
- Correctness
- Auditability
- Simplicity
- Enterprise credibility

## Core Principle
Agents think. Systems enforce. Humans approve.

## MVP Definition

### In scope
- One enterprise-facing control plane for one governed workflow
- One and only one MVP workflow: change control for IT operations
- Real AI agents for bounded reasoning tasks inside that workflow
- Policy evaluation before any sensitive action
- Human approval checkpoints for high-risk changes
- Secure tool access through a gateway, not direct model-to-tool execution
- Full audit trail and evidence capture for every request, decision, and action
- A reference workflow under `examples/change-control-agent`
- A local-development-friendly runtime that fits on one MacBook

### Out of scope
- Open-ended autonomous agents
- Generic workflow builder or generic agent framework abstractions beyond what the change-control flow requires
- Direct model-issued tool calls
- Multi-tenant self-serve SaaS onboarding
- Agent marketplace or plugin ecosystem
- Fine-tuning, custom model training, or long-term memory systems
- Broad workflow coverage beyond the initial change-control use case
- Complex event-driven microservice deployment for the first release

## Architecture Principles
- Agents reason only within bounded workflow roles.
- Policy before privilege: every sensitive action is evaluated by the policy engine first.
- No direct model-to-tool execution: agents may propose interpretations, plans, and execution-ready steps, but only the orchestrator and tool gateway may issue actions after policy and approval checks.
- Audit by default: all inputs, policy decisions, approvals, tool requests, and result summaries produce immutable audit events.
- Boring deployment first: MVP should ship as a modular monolith with internal service boundaries preserved in the monorepo.
- Least privilege everywhere: users, services, tools, and data stores get the minimum access required.
- Clear separation of duties: policy, orchestration, tool execution, and audit capture remain distinct responsibilities.
- System control over governance: policy enforcement, approval state, tool authorization, audit logging, and persistence are system responsibilities, not agent responsibilities.

## Target System Shape

### Runtime topology
For MVP, Fulmen should deploy as a single logical control-plane application split into:

- `apps/api`: primary HTTP API, session boundary, workflow entrypoint
- `apps/web`: operator and approver UI
- `services/*`: internal domain modules with clear interfaces, not independently deployed network services yet
- `packages/*`: shared contracts, policy definitions, SDK helpers, and UI primitives

This keeps the design simple while preserving clean seams for later extraction if scale or isolation requires it.

### Required vs Deferred Components
| Component | MVP status | Notes |
| --- | --- | --- |
| `apps/api` | Required | Single HTTP ingress and orchestration entrypoint |
| `apps/web` | Required | Minimal operator and approver UI |
| `services/orchestrator` | Required | In-process workflow state machine for the change-control flow |
| `services/guard-agent` | Required | Structured prompt, role, and validation layer around AI agent outputs |
| `services/policy-engine` | Required | In-process policy decision evaluation |
| `services/tool-gateway` | Required | One stub connector plus one execution abstraction |
| `services/audit` | Required | Append-only audit event writer and reader |
| `packages/contracts` | Required | API, event, and schema contracts |
| `packages/policies` | Required | Versioned change-control policy bundle |
| Provider-backed bounded agent reasoning | Required | The shipped MVP uses real AI agents; deterministic fixtures are acceptable only for tests and scaffolding work |
| `packages/ui` | Deferred | Use only if shared UI primitives are actually needed |
| `packages/sdk` | Deferred | No SDK needed to prove the MVP |
| External object storage service | Deferred | Local filesystem is enough for MVP evidence artifacts |
| External queue or broker | Deferred | Use in-process jobs or synchronous orchestration first |
| Separate network deployment of `services/*` | Deferred | Keep services as code modules inside the API process |
| Kubernetes deployment | Deferred | Preserve `deploy/k8s`, but do not require it for MVP |

### MVP Cut Line
The MVP architecture stops at a single governed vertical slice:

- One tenant in local development
- One multi-agent workflow: change control
- Four bounded AI agent roles: Intake, Planning, Risk & Policy, and Execution
- One workflow template for change review and execution
- One policy bundle for change-control actions
- One stub or simulated tool connector by default
- One audit evidence path with local persistence

Anything that introduces cross-domain agent orchestration, multiple workflow families, distributed infrastructure, or pluggable integrations beyond the single change-control slice is beyond the MVP cut line.

### AI Agent Roles
The MVP uses real AI agents, but only inside one governed workflow. These are reasoning roles, not autonomous control planes.

| Agent | Bounded responsibility | Explicit non-responsibilities |
| --- | --- | --- |
| Intake Agent | Normalize operator input into structured change context and identify missing information | Cannot persist requests, assign approvals, or invoke tools |
| Planning Agent | Propose bounded plan steps and execution hypotheses | Cannot approve changes, enforce policy, or execute tools |
| Risk & Policy Agent | Summarize risk, identify policy-relevant factors, and explain why actions may need review | Cannot issue the authoritative policy decision |
| Execution Agent | Reason about approved execution sequencing and summarize observed outcomes | Cannot call tools directly or bypass approval state |

### Core components
| Component | Responsibility | Security posture |
| --- | --- | --- |
| Web app | Submit change requests, review evidence, approve or reject actions, inspect audit history | Human users authenticate here; no direct access to tools |
| API app | AuthN/AuthZ, request validation, workflow APIs, orchestration entrypoint | Enforces tenancy and RBAC before domain logic |
| Orchestrator | Drives the multi-agent workflow state machine, coordinates agent turns, requests policy checks, pauses for approval, dispatches tool actions through gateway | Cannot bypass policy engine or audit service |
| Guard agent | Shapes prompts for the Intake, Planning, Risk & Policy, and Execution agents, constrains outputs to approved schemas, validates role boundaries | Never executes tools directly |
| Policy engine | Evaluates whether actions are allowed, denied, or require approval | Only source of truth for sensitive action gating; the Risk & Policy Agent is advisory only |
| Tool gateway | Executes approved tool operations against enterprise systems through allowlisted connectors | Holds least-privilege credentials and logs all invocations |
| Audit service | Stores append-only audit events and evidence references | Write-once event discipline for reviewability |

### MVP runtime simplification
For the first implementation, the orchestrator, guard agent, policy engine, tool gateway, and audit service should run as in-process modules behind `apps/api`.

- Keep interface boundaries in code.
- Do not introduce service-to-service networking in MVP.
- Do not introduce async infrastructure unless a concrete bottleneck appears.
- Prefer a synchronous request model plus persisted run state, with background work added only when a real need appears.
- Keep the four agent roles as in-process reasoning components inside the governed workflow, not as separate deployables.

## Request Lifecycle
1. An authenticated operator submits a change request with target systems, requested change window, rationale, and supporting context.
2. The API validates the request, creates a `change_request` record, and emits an initial audit event.
3. The orchestrator invokes the Intake Agent to normalize the request into structured change context.
4. The orchestrator invokes the Planning Agent to produce a bounded plan limited to approved action schemas.
5. The orchestrator invokes the Risk & Policy Agent to summarize risk and policy-relevant facts for each proposed action.
6. The system policy engine evaluates each proposed action and returns the authoritative decision.
7. If policy returns `deny`, the action is blocked and recorded.
8. If policy returns `require_approval`, the orchestrator creates an approval request and pauses execution.
9. An authorized approver reviews the proposed action, policy decision, agent reasoning summary, and evidence, then approves or rejects it.
10. For approved actions, the orchestrator invokes the Execution Agent to reason about safe step ordering and result interpretation.
11. Only system-approved actions are sent to the tool gateway.
12. The tool gateway executes the action with connector-specific credentials and returns structured results.
13. The orchestrator records outputs, updates workflow state, and produces a final outcome with linked audit evidence.

The first implemented vertical slice currently stops after step 6 and returns a governed preview response that includes:

- the persisted `change_request`
- normalized Intake Agent output
- the Planning Agent action plan
- the Risk & Policy Agent assessment for each action
- the authoritative system policy decision and approval requirement for each action

Approval creation, Execution Agent turns, and tool-gateway dispatch remain intentionally deferred until the next slice.

For the first working slice, tool execution should use a stub connector that simulates a governed change action while exercising the same policy, approval, and audit path as a real connector.

## Monorepo Tree Refinement
The existing top-level layout is correct. The refinement below keeps the same shape while making ownership and boundaries explicit.

```text
apps/
  api/
    src/
      auth/
      routes/
      workflows/
      approvals/
      audit/
      health/
  web/
    src/
      app/
      features/change-requests/
      features/approvals/
      features/audit/
      components/
services/
  orchestrator/
    src/
      agent-workflow/
      runs/
      planners/
      state-machine/
  guard-agent/
    src/
      prompts/
      roles/
      schemas/
      validators/
  policy-engine/
    src/
      evaluators/
      rules/
      decisions/
  tool-gateway/
    src/
      connectors/
      execution/
      redaction/
  audit/
    src/
      events/
      evidence/
      retention/
packages/
  contracts/
    src/
      api/
      events/
      policy/
      db/
  policies/
    bundles/
      change-control/
    schemas/
  sdk/
    src/
      api-client/
      policy-client/
  ui/
    src/
      audit/
      forms/
      workflow/
examples/
  change-control-agent/
    workflow/
    fixtures/
deploy/
  docker/
  k8s/
docs/
  architecture.md
  threat-model.md
  roadmap.md
  demo-script.md
```

### Refinement rationale
- `apps/api` stays the single ingress point for the MVP.
- `services/*` remain code modules with explicit interfaces, not separate distributed systems yet.
- The four agent roles should live inside the workflow implementation, not as generic external worker classes or separate runtimes.
- `packages/contracts` becomes the source of truth for API, event, policy, and schema contracts.
- `packages/policies` holds reviewable policy bundles instead of embedding rules in model prompts or business logic.
- `examples/change-control-agent` contains the canonical reference workflow and fixtures used in demos and tests.
- `packages/sdk` and broader shared package extraction should wait until duplication actually appears.

## Domain Model
The MVP domain should stay narrow and center on governed change execution with bounded multi-agent reasoning.

| Entity | Purpose | Key relationships |
| --- | --- | --- |
| Tenant | Logical enterprise boundary for data and policy scope | Owns users, agents, policies, tools, and requests |
| User | Authenticated operator, approver, or auditor | Belongs to a tenant; receives roles |
| Role | RBAC grouping such as operator, approver, auditor, admin | Assigned to users |
| Agent Definition | Metadata for one bounded AI agent role inside the workflow | References workflow template, role type, and policy-aware constraints |
| Workflow Template | Versioned definition of the governed workflow | Used to create runs |
| Change Request | Business object representing a requested operational change | Created by user; has many runs, approvals, and audit events |
| Run | One execution attempt of a workflow for a change request | Has many step executions and policy decisions |
| Step Execution | Individual workflow step or agent turn state and result | Belongs to a run |
| Policy Bundle | Versioned set of rules for action gating | Evaluated against requested actions |
| Policy Decision | Result of policy evaluation for an action | Belongs to a run and optional tool request |
| Approval Request | Human review task generated by policy | Targets a user or role; tied to a change request and run |
| Approval Decision | Approve or reject outcome with justification | Closes an approval request |
| Tool Connector | Allowlisted integration definition for enterprise tools | Used by tool requests through the gateway |
| Tool Request | Proposed or executed external action | Requires policy decision and maybe approval |
| Audit Event | Immutable record of state change or security-relevant action | References any major entity |
| Evidence Artifact | Pointer to preserved request/response summaries, reports, or attachments | Linked from audit events and runs |

## Database Schema
PostgreSQL is the preferred MVP system of record because it supports transactional correctness, row-level constraints, JSON payload storage where needed, and enterprise-friendly operations.

For local development, PostgreSQL remains the only required infrastructure dependency.

### Schema outline
| Table | Purpose | Important columns |
| --- | --- | --- |
| `tenants` | Tenant boundary | `id`, `name`, `status`, `created_at` |
| `users` | Human identities | `id`, `tenant_id`, `external_subject`, `email`, `display_name`, `status`, `created_at` |
| `roles` | RBAC roles | `id`, `tenant_id`, `name`, `description` |
| `user_roles` | User-role mapping | `user_id`, `role_id`, `granted_at`, `granted_by` |
| `agent_definitions` | Versioned metadata for bounded workflow agent roles | `id`, `tenant_id`, `name`, `agent_role`, `workflow_template_id`, `policy_bundle_id`, `status`, `version` |
| `workflow_templates` | Versioned workflow definitions | `id`, `tenant_id`, `name`, `version`, `definition_json`, `created_at` |
| `change_requests` | Requested operational changes | `id`, `tenant_id`, `request_key`, `title`, `description`, `requested_by`, `risk_level`, `status`, `scheduled_start_at`, `scheduled_end_at`, `created_at` |
| `change_request_targets` | Systems or resources impacted by a request | `id`, `change_request_id`, `target_type`, `target_ref`, `environment`, `metadata_json` |
| `runs` | Workflow execution attempts | `id`, `tenant_id`, `change_request_id`, `agent_definition_id`, `status`, `started_at`, `completed_at`, `final_summary` |
| `step_executions` | Workflow step state | `id`, `run_id`, `step_name`, `step_type`, `status`, `input_json`, `output_json`, `started_at`, `completed_at` |
| `policy_bundles` | Reviewable rule sets | `id`, `tenant_id`, `name`, `version`, `bundle_json`, `checksum`, `status` |
| `policy_decisions` | Action-level policy outcomes | `id`, `run_id`, `step_execution_id`, `action_type`, `resource_ref`, `decision`, `reason_code`, `explanation`, `policy_bundle_id`, `created_at` |
| `approval_requests` | Human approval tasks | `id`, `tenant_id`, `change_request_id`, `run_id`, `policy_decision_id`, `status`, `assigned_role`, `assigned_user_id`, `expires_at`, `created_at` |
| `approval_decisions` | Approval responses | `id`, `approval_request_id`, `decided_by`, `decision`, `justification`, `decided_at` |
| `tool_connectors` | Allowlisted connectors | `id`, `tenant_id`, `name`, `connector_type`, `status`, `credential_ref`, `config_json`, `created_at` |
| `tool_requests` | Proposed and executed tool operations | `id`, `run_id`, `step_execution_id`, `tool_connector_id`, `action_name`, `request_payload_json`, `status`, `executed_at`, `result_summary`, `idempotency_key` |
| `audit_events` | Append-only audit trail | `id`, `tenant_id`, `event_type`, `entity_type`, `entity_id`, `actor_type`, `actor_id`, `occurred_at`, `payload_json`, `hash` |
| `evidence_artifacts` | References to preserved evidence | `id`, `tenant_id`, `artifact_type`, `storage_uri`, `checksum`, `retention_class`, `created_at` |

### Schema design decisions
- Use UUIDs for primary keys to avoid predictable identifiers.
- Add `tenant_id` to all tenant-scoped business tables.
- Keep mutable business state tables separate from append-only `audit_events`.
- Store connector credentials outside PostgreSQL and reference them via `credential_ref`.
- Prefer explicit status enums over nullable state flags.
- Use idempotency keys on external tool requests to reduce duplicate execution risk.
- Allow evidence artifacts to reference local filesystem paths in development and object storage URIs later without changing the table shape.

## API Contract Outline
The API should be narrow, explicit, and designed around human governance. All payloads should use versioned JSON schemas in `packages/contracts`.

The contract surface should only expose what the change-control workflow needs. Do not add generic agent, generic tool, or generic memory APIs in MVP.

### Authentication and authorization
- `POST /api/v1/auth/session`: establish or refresh an authenticated session
- Authorization is RBAC plus tenant scoping enforced in API middleware

### Change request APIs
- `POST /api/v1/change-requests`: create a change request
- `GET /api/v1/change-requests`: list change requests visible to the caller
- `GET /api/v1/change-requests/{id}`: fetch request details, status, approvals, and audit summary
- `POST /api/v1/change-requests/{id}/submit`: move a draft request into evaluation

### Run and workflow APIs
- `POST /api/v1/change-requests/{id}/runs`: start a governed run for a request
- `GET /api/v1/runs/{id}`: fetch run state, step results, and policy decisions
- `GET /api/v1/runs/{id}/steps`: list step execution details

### Approval APIs
- `GET /api/v1/approvals`: list approval tasks for the caller
- `GET /api/v1/approvals/{id}`: fetch approval context and evidence
- `POST /api/v1/approvals/{id}/decision`: approve or reject with justification

### Audit APIs
- `GET /api/v1/change-requests/{id}/audit-events`: retrieve chronological audit events
- `GET /api/v1/runs/{id}/evidence`: retrieve evidence artifact metadata and download references

### Administrative APIs
- `GET /api/v1/policy-bundles`: list policy bundles
- `GET /api/v1/tool-connectors`: list configured tool connectors

No generic `/agents`, `/tools/execute`, `/memories`, or `/workflows` public APIs are required for MVP.

## Event Contract Outline
The audit and orchestration layers should share a small set of explicit event types:

- `change_request.created`
- `change_request.submitted`
- `run.started`
- `run.step_started`
- `run.step_completed`
- `policy.decision_recorded`
- `approval.requested`
- `approval.decided`
- `tool.requested`
- `tool.executed`
- `tool.blocked`
- `run.completed`

## Deployment Approach
The MVP should be deployable in a conservative enterprise environment:

- Stateless API and web applications
- PostgreSQL for relational state and audit event metadata
- Secret references for connector credentials
- Local filesystem evidence storage in development, object storage later if needed
- Private network egress restricted to allowlisted enterprise systems in production

This is intentionally a controlled internal platform, not an internet-scale SaaS design.

### Local Development Profile
The MVP must be runnable by one developer on a MacBook without distributed infrastructure.

#### Runs in Docker
- PostgreSQL

#### Runs locally on the host
- `apps/api`
- `apps/web`

#### Runs in-process inside `apps/api`
- Orchestrator
- Guard agent and bounded AI agent role logic
- Policy engine
- Tool gateway
- Audit service

#### Supported local substitutions
- External IdP: replace with a local development auth mode using seeded users and roles
- Model provider: allow either a live provider key or deterministic fixtures for tests and pre-integration work, while preserving the same four agent roles
- Tool connector: default to a stub change-control connector that simulates validation and execution
- Secret manager: use environment variables or local dev secrets only; keep the `credential_ref` abstraction so production can swap in a real secret manager
- Evidence object storage: use local filesystem paths

#### Not required for local development
- Kubernetes
- Message broker
- Separate worker process
- External cache
- External object storage
- Separate service deployments for `services/*`

### Implementation Sequence
The first implementation should move from foundation to one governed vertical slice in this order:

1. Contracts and persistence
   Define the change-request, run, policy-decision, approval, tool-request, and audit-event schemas plus the minimal PostgreSQL tables.
2. Minimal API and UI
   Add local auth, change-request creation, request detail view, and audit timeline read APIs with a simple operator and approver UI.
3. Audit backbone
   Ensure every write path emits immutable audit events before any model or tool work exists.
4. Policy engine
   Implement a small in-process policy evaluator with one reviewable change-control policy bundle.
5. Multi-agent reasoning layer
   Add the Intake Agent, Planning Agent, Risk & Policy Agent, and Execution Agent with strict input and output schemas and system-owned orchestration.
6. Run orchestration
   Persist runs and step executions and enforce the state machine that requires policy before execution.
7. Approval flow
   Add approval requests, approval decisions, and execution pause/resume behavior.
8. Stub tool execution
   Execute one simulated change action through the tool gateway so the full governance path is exercised end to end.
9. Evidence capture
   Persist evidence references and produce a reviewable audit trail for the completed run.

The first working vertical slice is complete when a local user can create a change request, trigger the Intake and Planning Agents, receive a structured plan, review the Risk & Policy Agent summary alongside the system policy decision, approve a gated step, execute a stub connector action with Execution Agent assistance, and inspect the full audit record.

## Assumptions
- MVP focuses on one primary workflow: IT change control.
- One logical deployment serves one enterprise tenant in the earliest production shape.
- Local development uses seeded users; production identity comes from an external IdP.
- Policy bundles are human-authored, versioned, and reviewable.
- Tool access is allowlisted per connector and action type.
- Audit events must be retained even when workflow runs fail.
- Model providers may vary later, but the governance boundary must stay provider-agnostic and system-controlled.

## Open Decisions
- Whether approval assignment is role-based only or supports named approvers in MVP
- Whether the first live connector after the stub targets a shell-based demo tool or an enterprise API
- Whether workflow templates are stored as JSON only or also represented as typed code definitions
