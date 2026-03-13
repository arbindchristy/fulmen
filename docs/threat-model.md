# Fulmen Threat Model

## Scope
This threat model covers the Fulmen MVP defined in `docs/architecture.md`: a governed AI change-control platform for IT operations with policy enforcement, approval workflows, secure tool access, observability, and audit evidence.

The main security constraints from the repository source of truth are:

- No direct model-to-tool execution
- All sensitive actions must be policy-checked
- Security comes before developer convenience
- Auditability is a first-class requirement

## MVP Cut Line
This threat model applies to the smallest buildable Fulmen slice:

- One governed AI change-control workflow
- One local deployment
- One PostgreSQL database
- In-process orchestrator, policy, tool-gateway, and audit modules
- One stub connector by default

Threats and controls for distributed services, generalized agent frameworks, multi-region deployment, customer self-serve tenancy, and arbitrary plugin ecosystems are explicitly outside the MVP cut line.

## Security Objectives
- Prevent unauthorized or unapproved operational changes
- Prevent the model from bypassing governance controls
- Protect enterprise credentials, policy bundles, and audit evidence
- Preserve a trustworthy audit trail for internal and external review
- Limit blast radius when prompts, tools, or integrations behave unexpectedly

## Trust Boundaries
| Boundary | Description | Main concern |
| --- | --- | --- |
| User to web/API | Human operators and approvers interact with Fulmen | Identity, authorization, input validation |
| API to orchestrator | Trusted application control flow | Confused deputy and bypass risks |
| Orchestrator to model provider | Untrusted model output boundary | Prompt injection, unsafe plans, hallucinated actions |
| Orchestrator to policy engine | Decision control boundary | Policy bypass or stale policy application |
| Orchestrator to tool gateway | Execution boundary | Unauthorized external actions |
| Tool gateway to enterprise systems | Sensitive operational boundary | Credential misuse and command abuse |
| Services to data stores | Persistence boundary | Tampering, leakage, and retention failures |
| Audit/evidence export | Reviewer boundary | Integrity and completeness of records |

For MVP, several logical boundaries still exist even though components run in one process. They must remain explicit in code and tests so production hardening later does not require redesign.

## Protected Assets
- Change request records
- Workflow definitions and agent definitions
- Policy bundles and policy decision history
- Approval requests and decisions
- Tool connector configuration and credential references
- Audit events and evidence artifacts
- User identity and role assignments
- Model prompts, structured plans, and tool results

## Threat Actors
- Unauthorized external attacker
- Authenticated but over-privileged internal user
- Malicious or careless operator
- Malicious approver colluding with operator
- Compromised tool connector or enterprise system
- Compromised model output due to prompt injection or provider behavior
- Insider with database or infrastructure access

## Key Threats And Controls

### 1. Model proposes unsafe or unauthorized actions
Risk:
The model may hallucinate actions, infer hidden capabilities, or be manipulated by prompt injection in change-request context.

Controls:
- Use strict action schemas in the guard agent.
- Treat model output as untrusted input.
- Require policy evaluation for every proposed sensitive action.
- Allow the orchestrator to dispatch only allowlisted action types.
- Block any action that lacks a matching contract, policy decision, or approval state.

### 2. Direct or indirect bypass of policy checks
Risk:
An implementation bug could let a tool request execute without a fresh policy decision.

Controls:
- Enforce orchestration state transitions so `tool_requests` cannot enter executable status without a linked `policy_decision`.
- Validate this invariant at the tool gateway as well as in the orchestrator.
- Record audit events for both decision issuance and execution.
- Add negative-path tests for missing, expired, or mismatched policy decisions.

### 3. Approval bypass or forged approval state
Risk:
A user or service could mark an action approved without valid reviewer authority.

Controls:
- Restrict approval APIs to approver roles only.
- Bind approval decisions to a specific request, run, action, and tenant.
- Require justification and actor identity on every approval decision.
- Record immutable audit events for approval creation and approval outcome.
- Reject execution if approval status does not match the exact action fingerprint.

### 4. Credential leakage from tool integrations
Risk:
Connector credentials may be exposed through logs, prompts, database records, or operator-visible output.

Controls:
- In production, store secrets in an enterprise secret manager; in local development, keep secrets in environment variables only.
- Reference secrets by opaque `credential_ref`.
- Redact secret-like fields from logs, audit payloads, and evidence.
- Give each connector least-privilege credentials scoped to its allowed action set.
- Limit which connector fields can be surfaced in UI and model context.

### 5. Audit trail tampering or deletion
Risk:
An attacker or privileged insider could modify or remove records to hide unauthorized behavior.

Controls:
- Keep `audit_events` append-only.
- Add event hashing or chained integrity metadata.
- Separate mutable workflow state from audit storage.
- Restrict delete privileges for audit tables and evidence stores.
- Periodically export signed audit snapshots for external review if required.

### 6. Cross-tenant or cross-request data leakage
Risk:
A user could access another tenant's change requests or the model could receive unrelated sensitive context.

Controls:
- Apply tenant scoping at every API query and database access path.
- Include `tenant_id` on all tenant-scoped tables.
- Filter prompt context to the minimum relevant request data.
- Avoid broad search or retrieval across tenant boundaries in MVP.

### 7. Tool connector abuse and excessive blast radius
Risk:
A connector with broad permissions could perform harmful changes even when the requested operation is narrow.

Controls:
- Allowlist action types per connector.
- Use connector-specific service accounts with narrow privileges.
- Require idempotency keys and bounded execution windows.
- Log request payload hash, actor, target, and result summary for every execution.
- Prefer dry-run or validation-capable tool APIs where available.

### 8. Denial of service through expensive runs or approval backlog
Risk:
Attackers or misuse could flood the system with change requests, runs, or pending approvals.

Controls:
- Rate-limit run creation and approval operations.
- Bound run concurrency per tenant.
- Expire stale approval requests.
- Add a separate worker only if synchronous execution becomes a real bottleneck.

### 9. Sensitive data overexposure in prompts and evidence
Risk:
Raw operational details, credentials, or internal topology may leak to model providers or stored artifacts.

Controls:
- Minimize prompt context to only fields required for planning.
- Redact credentials and irrelevant secrets before prompt assembly.
- Apply retention classes to evidence artifacts.
- Support provider-specific data handling review before production use.

### 10. Supply-chain or dependency compromise
Risk:
A compromised package or model SDK could undermine control boundaries.

Controls:
- Keep the MVP dependency set small.
- Pin dependency versions and review updates.
- Prefer official SDKs and boring infrastructure components.
- Preserve service boundaries in code so integrations are replaceable.

## STRIDE Summary
| Category | Fulmen example | Primary mitigation |
| --- | --- | --- |
| Spoofing | Forged approver identity | External IdP, signed sessions, RBAC checks |
| Tampering | Modified audit event or policy bundle | Append-only audit model, checksums, restricted writes |
| Repudiation | Operator denies submitting a risky change | Immutable audit events with actor identity and timestamps |
| Information disclosure | Secret leaked in logs or model prompts | Redaction, least context, secret manager references |
| Denial of service | Run flood or approval queue exhaustion | Rate limits, quotas, expiration, bounded concurrency |
| Elevation of privilege | Orchestrator or connector bypasses policy | Double-checks in orchestrator and tool gateway, least privilege |

## Security Requirements For MVP
- Every sensitive tool action must require a recorded policy decision.
- High-risk actions must require a recorded approval decision before execution.
- No secret values are stored in application tables or exposed to models.
- Audit events are immutable and retained independently of workflow success.
- Tool gateway requests are allowlisted, authenticated, authorized, and logged.
- Prompt construction uses only request-scoped and sanitized context.
- Local development stubs must exercise the same policy, approval, and audit path as live integrations.

## Local Development Profile
The local development threat posture must reflect the intended production controls without requiring production infrastructure.

### Required locally
- One PostgreSQL instance
- Local API and web processes
- Seeded local users and roles
- Stub model planner or provider-backed planner behind the same guard layer
- Stub tool connector behind the same tool-gateway interface

### Acceptable MVP substitutions
- Local filesystem evidence storage instead of object storage
- Environment-variable secrets instead of a production secret manager
- Deterministic stub planner instead of a live model provider

### Non-negotiable controls, even in local development
- No direct model-to-tool path
- Policy evaluation before tool execution
- Approval enforcement for approval-required actions
- Immutable audit events for all state-changing operations
- Redaction of secrets from logs and evidence

## Implementation Risks And Mitigations
| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Over-building distributed services too early | Increases attack surface and operational failure modes | Ship as modular monolith first; keep clear internal interfaces |
| Over-depending on live external systems during early development | Slows buildability and makes tests flaky | Default to stub planner and stub connector until the governed slice is proven |
| Embedding policy in prompts instead of code/data | Hard to review, test, and audit | Store policy bundles as versioned artifacts in `packages/policies` |
| Letting tool adapters define their own authorization logic | Creates inconsistent enforcement | Centralize authorization in policy engine and orchestrator |
| Mixing audit logs with mutable app logs | Weakens evidentiary quality | Use structured audit events with append-only discipline |
| Allowing broad connector permissions for convenience | Raises blast radius of compromise | Define narrow action allowlists and least-privilege service accounts |
| Capturing raw tool output everywhere | Risks secret and sensitive data sprawl | Store summarized output by default and redact aggressively |

## Residual Risks
- Human approvers can still make poor decisions; governance reduces but does not eliminate this risk.
- If an enterprise tool account is over-privileged outside Fulmen, platform controls cannot fully contain the external blast radius.
- Model providers remain an external trust dependency even with constrained prompting and structured outputs.

## Security Review Gates
Before implementation begins, the team should verify:

- Policy decision objects are first-class entities in contracts and storage design.
- Tool execution code cannot be reached without prior policy and approval checks.
- Audit evidence requirements are represented in acceptance criteria, not left as future work.
- Connector credential handling is designed around secret references only.
- Local development shortcuts do not bypass production governance controls.
