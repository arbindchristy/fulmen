# Fulmen Threat Model

## Scope
This threat model covers the current `ControlProof` alpha: a governed evidence-cycle workflow with bounded AI agent reasoning, policy evaluation, exception approvals, audit logging, and PostgreSQL-backed persistence.

## Core Principle
Agents think. Systems enforce. Humans approve.

## Security Objectives
- prevent unauthorized exception acceptance
- prevent agent output from becoming authoritative control evidence by itself
- protect sensitive control metadata, audit evidence, and approval history
- preserve a trustworthy audit trail
- limit blast radius if prompts, models, or future connectors behave unexpectedly

## MVP Cut Line
- one local deployment
- one PostgreSQL database
- one governed evidence-cycle workflow
- approval flow for high-sensitivity exception review
- audit recording and audit feed APIs
- no direct model-to-tool execution
- no live connector execution beyond deterministic preview generation

## Trust Boundaries
| Boundary | Main concern |
| --- | --- |
| User to web/API | identity, authorization, and tenant scoping |
| API to orchestrator | confused deputy and workflow bypass |
| Orchestrator to agents | hallucinated evidence assertions and prompt injection |
| Orchestrator to policy engine | stale or bypassed policy decisions |
| API/services to PostgreSQL | tampering, leakage, and retention failures |
| Audit read APIs to reviewers | integrity and completeness of the record |

## Protected Assets
- evidence-cycle records
- business-owner and control metadata
- generated evidence packs and follow-up lists
- approval requests and decisions
- policy bundle contents and decision history
- audit events and evidence provenance data
- user identities and role assignments

## Key Threats And Controls

### 1. Agents fabricate confidence that evidence is sufficient
Risk:
The model may confidently draft a narrative that sounds audit-ready even when provenance is weak.

Controls:
- treat agent output as untrusted input
- keep narrative drafts separate from authoritative approval state
- expose gaps, policy decisions, and source-oriented artifact metadata distinctly in the UI

### 2. Exception acceptance bypasses policy or human approval
Risk:
An implementation bug or privilege bug could let a high-sensitivity gap be treated as accepted without approval.

Controls:
- evaluate every governed evidence action through the policy engine
- require approval records for approval-required actions
- reject status transitions that are inconsistent with approval state
- record immutable approval outcome events

### 3. Cross-tenant or cross-cycle evidence leakage
Risk:
A reviewer or agent could see artifacts or context from another tenant or unrelated cycle.

Controls:
- enforce tenant scoping on every query path
- keep prompt context request-scoped and role-scoped
- filter audit feed reads by tenant

### 4. Audit trail tampering
Risk:
A privileged actor could modify or remove events to hide unsafe evidence handling.

Controls:
- keep audit events append-only
- separate mutable cycle state from audit history
- preserve actor identity, entity identity, and timestamps on every event

### 5. Sensitive evidence overexposure
Risk:
Control evidence can contain security, identity, or operational details that should not be broadly visible or sent to a model provider.

Controls:
- minimize prompt context
- keep connectors and raw evidence retrieval deferred until least-privilege handling exists
- plan field-level and artifact-level redaction before live integrations ship

### 6. Approval queue abuse or denial of service
Risk:
Attackers or misuse could flood the system with evidence cycles or pending approvals.

Controls:
- keep workflow actions bounded
- add per-tenant rate limits and quotas before production
- expire or escalate stale approval requests

## Security Requirements For This Alpha
- no direct model-to-tool path
- policy evaluation before any sensitive exception action
- immutable audit events for submission, preview, approval creation, and approval outcome
- strict separation between generated narrative and authoritative decision state
- human approval required for high-sensitivity exception review
- least-privilege role checks on approval APIs

## Local Development Notes
- local development uses deterministic previews and development identities
- the same policy and approval path is exercised locally as in the product workflow
- live connector execution remains deferred to avoid false confidence before credential, provenance, and redaction controls exist
