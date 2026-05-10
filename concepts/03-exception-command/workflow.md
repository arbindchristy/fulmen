# Workflow

## End-to-end user workflow
1. The system ingests operational exception events from source systems and normalizes them into a unified queue.
2. The Case Assembler Agent builds a concise case file with customer impact, financial exposure, SLA risk, and root-cause signals.
3. The Option Simulator Agent proposes recovery options such as expedite, reroute, split shipment, substitute inventory, grant credit, or defer.
4. The Policy Analyst Agent checks whether each option crosses spend, service, or contractual thresholds.
5. The operator reviews the ranked options and selects a path.
6. The system routes non-standard options or high-cost actions to approvers.
7. Approved actions are handed to downstream systems or human teams for execution.
8. The outcome is recorded so future recommendations reflect actual resolution quality.

## Where agents are used
- Case synthesis from multiple systems
- Root-cause signal extraction
- Recovery option generation
- Outcome summary and post-incident learning

## Where system controls are used
- Event ingestion and data normalization
- Authoritative threshold checks for cost, contract terms, or customer promises
- Approval routing for non-standard or above-limit actions
- Audit logging for recommendation, decision, and outcome

## Where human decisions remain
- Selecting the final recovery path
- Approving spend, credits, or non-standard commitments
- Handling edge cases with missing or contradictory data
- Deciding when to escalate to leadership or customer-facing teams
