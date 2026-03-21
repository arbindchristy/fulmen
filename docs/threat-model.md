# Fulmen Threat Model

## Scope
This threat model covers the Fulmen MVP defined in `docs/architecture.md`: a governed multi-agent change-control workflow for IT operations with bounded AI agent reasoning, policy enforcement, approval workflows, secure tool access, observability, and audit evidence.

The main security constraints from the repository source of truth are:

- No direct model-to-tool execution
- All sensitive actions must be policy-checked
- Security comes before developer convenience
- Auditability is a first-class requirement

## Core Principle
Agents think. Systems enforce. Humans approve.

## MVP Cut Line
This threat model applies to the smallest buildable Fulmen slice:

- One governed multi-agent change-control workflow
- One local deployment
- One PostgreSQL database
- Four bounded agent roles:
  - Intake Agent
  - Planning Agent
  - Risk & Policy Agent
  - Execution Agent
- In-process orchestrator, policy, tool-gateway, and audit modules
- One stub connector by default

Threats and controls for distributed services, generalized agent frameworks, multi-region deployment, customer self-serve tenancy, and arbitrary plugin ecosystems are explicitly outside the MVP cut line.

## Security Objectives
- Prevent unauthorized or unapproved operational changes
- Prevent the agents from bypassing governance controls
- Protect enterprise credentials, policy bundles, and audit evidence
- Preserve a trustworthy audit trail for internal and external review
- Limit blast radius when prompts, tools, or integrations behave unexpectedly

## Trust Boundaries
| Boundary | Description | Main concern |
| --- | --- | --- |
| User to web/API | Human operators and approvers interact with Fulmen | Identity, authorization, input validation |
| API to orchestrator | Trusted application control flow | Confused deputy and bypass risks |
| Orchestrator to AI agents/model provider | Untrusted agent output boundary | Prompt injection, unsafe plans, hallucinated actions |
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
- Agent prompts, role outputs, structured plans, and tool results

## Threat Actors
- Unauthorized external attacker
- Authenticated but over-privileged internal user
- Malicious or careless operator
- Malicious approver colluding with operator
- Compromised tool connector or enterprise system
- Compromised agent output due to prompt injection or provider behavior
- Insider with database or infrastructure access

## Key Threats And Controls

### 1. Agents propose unsafe or unauthorized actions
Risk:
An agent may hallucinate actions, infer hidden capabilities, or be manipulated by prompt injection in change-request context.

Controls:
- Use strict action schemas in the guard agent.
- Treat every agent output as untrusted input.
- Require policy evaluation for every proposed sensitive action.
- Allow the orchestrator to dispatch only allowlisted action types.
- Block any action that lacks a matching contract, policy decision, or approval state.

### 2. Risk & Policy Agent is mistaken for the authoritative policy engine
Risk:
The system could over-trust the Risk & Policy Agent summary and accidentally let agent reasoning replace policy enforcement.

Controls:
- Keep the policy engine as the only authoritative decision-maker for allow, deny, or require-approval outcomes.
- Store the Risk & Policy Agent output separately from the recorded `policy_decision`.
- Require the approval UI to show system policy decisions distinctly from agent explanations.

### 3. Direct or indirect bypass of policy checks
Risk:
An implementation bug could let a tool request execute without a fresh policy decision.

Controls:
- Enforce orchestration state transitions so `tool_requests` cannot enter executable status without a linked `policy_decision`.
- Validate this invariant at the tool gateway as well as in the orchestrator.
- Record audit events for both decision issuance and execution.
- Add negative-path tests for missing, expired, or mismatched policy decisions.

### 4. Approval bypass or forged approval state
Risk:
A user or service could mark an action approved without valid reviewer authority.

Controls:
- Restrict approval APIs to approver roles only.
- Bind approval decisions to a specific request, run, action, and tenant.
- Require justification and actor identity on every approval decision.
- Record immutable audit events for approval creation and approval outcome.
- Reject execution if approval status does not match the exact action fingerprint.

### 5. Execution Agent exceeds its role
Risk:
The Execution Agent could be given tool-facing authority or allowed to collapse reasoning and execution into one uncontrolled step.

Controls:
- Keep the Execution Agent limited to reasoning about approved execution sequencing and result interpretation.
- Require the tool gateway to accept only system-issued requests after policy and approval checks.
- Do not expose connector credentials or tool clients to agent code paths.

### 6. Credential leakage from tool integrations
Risk:
Connector credentials may be exposed through logs, prompts, database records, or operator-visible output.

Controls:
- In production, store secrets in an enterprise secret manager; in local development, keep secrets in environment variables only.
- Reference secrets by opaque `credential_ref`.
- Redact secret-like fields from logs, audit payloads, and evidence.
- Give each connector least-privilege credentials scoped to its allowed action set.
- Limit which connector fields can be surfaced in UI and model context.

### 7. Audit trail tampering or deletion
Risk:
An attacker or privileged insider could modify or remove records to hide unauthorized behavior.

Controls:
- Keep `audit_events` append-only.
- Add event hashing or chained integrity metadata.
- Separate mutable workflow state from audit storage.
- Restrict delete privileges for audit tables and evidence stores.
- Periodically export signed audit snapshots for external review if required.

### 8. Cross-agent or cross-request context leakage
Risk:
A user could access another tenant's change requests or one agent could receive unrelated sensitive context from another request or role.

Controls:
- Apply tenant scoping at every API query and database access path.
- Include `tenant_id` on all tenant-scoped tables.
- Filter prompt context to the minimum relevant request data.
- Filter agent context to the minimum required for that specific role.
- Avoid broad search or retrieval across tenant boundaries in MVP.

### 9. Tool connector abuse and excessive blast radius
Risk:
A connector with broad permissions could perform harmful changes even when the requested operation is narrow.

Controls:
- Allowlist action types per connector.
- Use connector-specific service accounts with narrow privileges.
- Require idempotency keys and bounded execution windows.
- Log request payload hash, actor, target, and result summary for every execution.
- Prefer dry-run or validation-capable tool APIs where available.

### 10. Denial of service through expensive multi-agent runs or approval backlog
Risk:
Attackers or misuse could flood the system with change requests, runs, or pending approvals.

Controls:
- Rate-limit run creation and approval operations.
- Bound run concurrency per tenant.
- Expire stale approval requests.
- Add a separate worker only if synchronous execution becomes a real bottleneck.

### 11. Sensitive data overexposure in prompts and evidence
Risk:
Raw operational details, credentials, or internal topology may leak to model providers or stored artifacts.

Controls:
- Minimize prompt context to only fields required for planning.
- Redact credentials and irrelevant secrets before prompt assembly.
- Apply retention classes to evidence artifacts.
- Support provider-specific data handling review before production use.

### 12. Supply-chain or dependency compromise
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
- Agent prompt construction uses only request-scoped, role-scoped, and sanitized context.
- Local development stubs must exercise the same policy, approval, and audit path as live integrations.
- Intake, Planning, Risk & Policy, and Execution Agents must remain advisory; system components remain authoritative.

## Local Development Profile
The local development threat posture must reflect the intended production controls without requiring production infrastructure.

### Required locally
- One PostgreSQL instance
- Local API and web processes
- Seeded local users and roles
- Provider-backed or fixture-backed agent roles behind the same guard layer
- Stub tool connector behind the same tool-gateway interface

### Acceptable MVP substitutions
- Local filesystem evidence storage instead of object storage
- Environment-variable secrets instead of a production secret manager
- Deterministic agent fixtures instead of live provider-backed agents during tests and early scaffolding work

### Non-negotiable controls, even in local development
- No direct model-to-tool path
- Policy evaluation before tool execution
- Approval enforcement for approval-required actions
- Immutable audit events for all state-changing operations
- Redaction of secrets from logs and evidence
- Clear separation between agent reasoning output and system enforcement state

## Implementation Risks And Mitigations
| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Over-building distributed services too early | Increases attack surface and operational failure modes | Ship as modular monolith first; keep clear internal interfaces |
| Over-trusting agent reasoning in places where system enforcement is required | Blurs control boundaries and weakens auditability | Keep policy, approvals, tool authorization, audit logging, and persistence system-owned |
| Over-depending on live external systems during early development | Slows buildability and makes tests flaky | Support deterministic agent fixtures and a stub connector until the governed slice is proven |
| Embedding policy in prompts instead of code/data | Hard to review, test, and audit | Store policy bundles as versioned artifacts in `packages/policies` |
| Letting tool adapters define their own authorization logic | Creates inconsistent enforcement | Centralize authorization in policy engine and orchestrator |
| Mixing audit logs with mutable app logs | Weakens evidentiary quality | Use structured audit events with append-only discipline |
| Allowing broad connector permissions for convenience | Raises blast radius of compromise | Define narrow action allowlists and least-privilege service accounts |
| Capturing raw tool output everywhere | Risks secret and sensitive data sprawl | Store summarized output by default and redact aggressively |

## Residual Risks
- Human approvers can still make poor decisions; governance reduces but does not eliminate this risk.
- If an enterprise tool account is over-privileged outside Fulmen, platform controls cannot fully contain the external blast radius.
- Model providers remain an external trust dependency even with constrained prompting and structured outputs.
- Agent role confusion can still create operator misunderstanding if the UI does not distinguish agent reasoning from system decisions clearly.

## Security Review Gates
Before implementation begins, the team should verify:

- Policy decision objects are first-class entities in contracts and storage design.
- Tool execution code cannot be reached without prior policy and approval checks.
- Audit evidence requirements are represented in acceptance criteria, not left as future work.
- Connector credential handling is designed around secret references only.
- Local development shortcuts do not bypass production governance controls.
- The Risk & Policy Agent is not allowed to replace the system policy engine in any code path.
