# Fulmen Architecture

## Purpose
Fulmen currently ships a governed `ControlProof` alpha: a security-first evidence operations workflow for regulated enterprises. The product assembles an evidence pack for one control and one review period, exposes agent reasoning in bounded roles, and keeps policy, approval, audit, and persistence under system control.

## Core Principle
Agents think. Systems enforce. Humans approve.

## Product Slice

### In scope
- one governed workflow family: control evidence cycles
- one operator-facing intake flow for one control, one framework reference, one owner, and one evidence window
- deterministic multi-agent preview generation for evidence collection, reconciliation, narrative drafting, and gap adjudication
- approval routing for high-sensitivity exception review
- append-only audit history with read APIs
- local development on a modular monolith with PostgreSQL

### Out of scope
- open-ended autonomous agents
- direct model-to-tool execution
- generic workflow-builder abstractions
- production connector execution against live enterprise systems
- distributed service decomposition, queues, or broker infrastructure
- broad cross-workflow productization beyond the ControlProof alpha

## Architecture Principles
- Policy before privilege: every sensitive review action is evaluated by the policy engine first.
- Audit by default: every submission, preview, approval, and state transition emits an immutable audit event.
- Bounded agent roles only: agents can normalize, plan, summarize, and draft, but they never approve, persist, or execute.
- Provenance matters: the product must preserve evidence lineage and distinguish sourced facts from generated narrative.
- Boring deployment first: keep the MVP as a modular monolith until scale or isolation demands more.

## Runtime Shape

### Components
| Component | Responsibility |
| --- | --- |
| `apps/web` | Evidence-cycle intake, preview review, exception approvals, audit timeline |
| `apps/api` | Auth boundary, input validation, orchestration entrypoint, approval and audit APIs |
| `services/orchestrator` | Bounded multi-agent workflow for evidence normalization, plan generation, and evidence-pack preview |
| `services/guard-agent` | Schema validation and role boundaries for agent output |
| `services/policy-engine` | Authoritative policy decisions for evidence actions |
| `services/audit` | Append-only event recording and audit feed |
| `packages/contracts` | Reviewable request, response, audit, and approval schemas |
| `packages/policies` | Versioned policy bundle for governed evidence review |

### Deployment posture
- single API process
- single web application
- single PostgreSQL database
- local filesystem evidence root for development

## Implemented Workflow
1. An operator launches an evidence cycle with control metadata, business owner, source systems, sensitivity, and evidence window.
2. The API validates the request and persists the cycle.
3. The Intake Agent normalizes the request and identifies missing information.
4. The Planning Agent produces four bounded actions:
   - evidence collection
   - reconciliation
   - narrative drafting
   - gap adjudication
5. The Risk & Policy Agent summarizes review posture and policy-relevant factors for each action.
6. The policy engine returns the authoritative decision for each action.
7. The orchestrator generates an evidence pack with:
   - artifact inventory
   - gap list
   - follow-up actions
   - draft control narrative
8. Approval-required actions create human review tasks.
9. Approvers approve or reject the exception action.
10. Audit history remains queryable throughout the cycle.

The current cut line stops after preview, approvals, and audit review. Live connector execution remains deferred.

## Agent Roles
| Agent | Responsibility | Explicit non-responsibilities |
| --- | --- | --- |
| Intake Agent | Normalize evidence-cycle input and identify missing context | Cannot persist, approve, or retrieve systems directly |
| Planning Agent | Produce bounded evidence workflow actions | Cannot enforce policy or accept exceptions |
| Risk & Policy Agent | Summarize why an action may need review | Cannot issue the authoritative policy decision |
| Future Execution Agent | Interpret approved downstream execution results | Cannot execute tools directly |

## Domain Model
| Entity | Purpose |
| --- | --- |
| Evidence Cycle | Top-level business object for one control review period |
| Evidence Pack | Generated working set of artifacts, gaps, follow-ups, and narrative draft |
| Governed Action | One bounded step in the evidence workflow |
| Approval Request | Human review task for exception acceptance |
| Approval Decision | Authoritative approval or rejection record |
| Audit Event | Immutable event trail across the workflow |

## Security-Critical Boundaries
- The web client never decides policy or approval state.
- The orchestrator never bypasses the policy engine.
- Agents never directly call tools or source systems.
- Approval decisions are system authoritative and actor-bound.
- Audit events are append-only and queryable separately from mutable workflow state.

## Key Design Decisions
- The alpha uses deterministic evidence-pack generation instead of fragile free-form agent output so the product remains testable and reviewable.
- Evidence exception handling is modeled as a governed action rather than informal reviewer comments, because that is the real trust boundary.
- Audit read APIs are part of the MVP because evidence workflows without inspectable history are not credible to enterprise buyers.

## Deferred Next
- live evidence connectors with least-privilege credential brokerage
- frozen evidence-pack export and signing
- richer artifact lineage and hash-based provenance
- external auditor views
- execution of downstream remediation or collection jobs through a controlled tool gateway
