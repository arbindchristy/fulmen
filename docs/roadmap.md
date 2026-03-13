# Fulmen Roadmap

## Positioning
Fulmen is currently a pre-build scaffold. The immediate goal is not to build a broad agent platform, but to deliver a credible MVP for governed enterprise automation using one high-trust workflow: change control for IT operations.

This roadmap distinguishes:

- MVP work that should be implemented now
- Post-MVP items that should be deferred
- Milestones that preserve security, correctness, auditability, and simplicity

## MVP Cut Line
The MVP ends at a single working vertical slice for a governed change-control agent.

Included in the cut line:

- One local-developer-friendly deployment
- One change-control workflow
- One policy bundle
- One approval path
- One stub connector path
- One audit evidence path

Excluded from the cut line:

- Generic agent platform capabilities
- Multiple workflow families
- Multi-service distributed runtime
- Production-only infrastructure dependencies for local development
- Broad connector ecosystems

## MVP Outcome
An enterprise operator can submit a change request, the system can generate a constrained execution plan, each sensitive action is policy-checked, high-risk actions can be routed for human approval, approved tool operations run through a secure gateway, and the full lifecycle is available as audit evidence.

## MVP Scope

### Must ship
- Authenticated operator and approver experience
- Change request creation and submission
- Governed orchestration for the change-control workflow
- Structured model planning with no direct tool execution
- Policy evaluation for every sensitive action
- Approval workflow for actions requiring human review
- Secure tool gateway with allowlisted connectors
- Immutable audit trail and evidence references
- Reference workflow in `examples/change-control-agent`

### Nice if cheap, but still MVP-safe
- Basic dashboard for request and approval status
- Policy bundle version history
- Evidence export for a single request or run

### Required components for MVP
- `apps/api`
- `apps/web`
- PostgreSQL
- In-process orchestrator module
- In-process guard-agent module
- In-process policy engine module
- In-process audit module
- Tool gateway with one stub connector
- Contracts and policy bundles

### Deferred components
- Separate worker processes
- Separate service deployments
- External object storage
- External secret manager as a runtime dependency for local development
- SDK package
- Shared UI package unless duplication proves it necessary
- Kubernetes-based deployment as an MVP requirement

## Explicitly Deferred Beyond MVP
These items may be valuable later, but they should not be built during MVP implementation:

- General-purpose multi-agent orchestration across unrelated domains
- Generic agent builder or generic workflow designer
- Marketplace, plugin ecosystem, or user-authored connector SDK
- Autonomous execution without policy or approval controls
- Customer self-serve multi-tenancy
- Complex real-time collaboration and notifications
- Advanced analytics, forecasting, or optimization engines
- Long-term agent memory, retrieval systems, or knowledge graph features
- Multi-region active-active deployment

## Local Development Profile
To keep the MVP realistic on a MacBook:

- Run PostgreSQL in Docker.
- Run `apps/api` locally.
- Run `apps/web` locally.
- Keep orchestrator, policy engine, guard agent, tool gateway, and audit logic in-process inside the API.
- Default to a deterministic stub planner and a stub change-control connector.
- Use local filesystem evidence storage and environment-based secrets in development.

Nothing else should be required to reach the first working vertical slice.

## Milestone Plan

### Milestone 0: Architecture Baseline
Goal:
Lock the MVP design, contracts, and security boundaries before code scaffolding expands.

Deliverables:
- Finalized `docs/architecture.md`
- Finalized `docs/threat-model.md`
- Finalized `docs/roadmap.md`
- Reviewed monorepo refinement and domain model
- Initial contract list for API, events, and policy decisions

Exit criteria:
- Team agrees on MVP scope
- Non-MVP items are explicitly deferred
- Security review confirms no direct model-to-tool path exists in the design

### Milestone 1: Foundation
Goal:
Create the smallest locally runnable control plane and persistence layer.

Deliverables:
- Shared contracts in `packages/contracts`
- Database migrations for the core schema
- Local development auth with seeded users and roles
- `apps/api` with health and change-request CRUD
- Basic audit event emission for request lifecycle changes

Exit criteria:
- A developer can run the stack on a MacBook
- Users can create and view change requests locally
- Core audit records exist for all write operations

### Milestone 2: Working Vertical Slice
Goal:
Implement one governed change-control run from request to audited stub execution.

Deliverables:
- Minimal operator and approver UI in `apps/web`
- Run and step execution storage
- Orchestrator state machine
- Policy engine and first policy bundle
- Guarded planning with deterministic stub planner
- Approval request and decision flow
- Tool gateway with one stub connector

Exit criteria:
- A local user can complete the end-to-end governed change-control flow
- Runs produce structured plans only
- No execution path exists without policy and, when required, approval
- Approval-required actions pause correctly
- Only approved actions execute
- Stub tool executions are auditable end to end

### Milestone 3: Audit Evidence And Demo Readiness
Goal:
Make the MVP reviewable by security, compliance, and enterprise stakeholders.

Deliverables:
- Audit timeline UI
- Evidence artifact retrieval/export
- Reference workflow and fixtures in `examples/change-control-agent`
- Demo script aligned to the real workflow
- Optional live model-provider path behind the same guard layer

Exit criteria:
- A full end-to-end change request can be demonstrated
- Reviewers can inspect request history, policy decisions, approvals, and execution results
- Security-sensitive flows have corresponding tests

## Sequencing Rationale
- Build contracts and persistence before workflow complexity.
- Get local development stable before live integrations.
- Add planning before execution.
- Add approval before live tool actions.
- Treat audit evidence as a product requirement, not a reporting afterthought.
- Prove the change-control agent before extracting generic abstractions.

## Assumptions
- One workflow is enough to prove the platform thesis for MVP.
- Enterprise buyers will evaluate governance and auditability before breadth.
- The team prefers a modular monolith first and will extract services only when justified by scale or isolation needs.
- Postgres and a small set of boring platform dependencies are acceptable for the first release.
- The first successful demo can use a stub planner and stub connector if governance and auditability are real.

## Success Measures For MVP
- Every executed tool action has a linked policy decision and audit trail.
- High-risk actions cannot execute without approval.
- Reviewers can reconstruct what happened from persisted records without relying on application logs.
- The reference change-control workflow is clear enough to guide the next implementation phase.
