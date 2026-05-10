# System Architecture

## High-level architecture
- Web command center for operators and approvers
- API orchestration layer for intake, recommendation lifecycle, and approvals
- Event ingestion and normalization service for operational data
- Decision store for case files, options, outcomes, and thresholds
- Agent runtime for synthesis and option generation
- Policy service for spend, SLA, and contractual constraints
- Audit service for immutable recommendation and decision history

## Agent roles
- Case Assembler Agent
- Option Simulator Agent
- Policy Analyst Agent
- Outcome Narrator Agent

## System services
- Connector layer for `ERP`, `CRM`, and logistics or service data
- Threshold and approval engine
- Outcome analytics service
- Notification service for escalations
- Action handoff service to downstream teams or systems

## Auth / audit / policy implications
- Recommendations must clearly separate system facts from model-inferred explanations.
- Delegated authority by region, product line, or spend level needs to be system-enforced.
- Every decision should preserve the option set that was available at the time, not just the action taken.
- The model cannot directly execute reroutes, credits, or commitments; it can only prepare options for governed action.
