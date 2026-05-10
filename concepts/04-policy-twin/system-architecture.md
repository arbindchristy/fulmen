# System Architecture

## High-level architecture
- Web application for policy teams, control owners, approvers, and auditors
- API orchestration layer as the authoritative workflow and approval boundary
- Document ingestion and versioning service
- Knowledge graph linking obligations, controls, systems, owners, and evidence
- Agent runtime for decomposition, mapping, and planning
- Policy and approval engine for change authorization
- Audit service for append-only traceability

## Agent roles
- Obligation Extractor Agent
- Impact Mapper Agent
- Change Planner Agent
- Conflict Finder Agent

## System services
- Policy repository with version control
- Ownership directory and role model
- Approval workflow engine
- Evidence tracking service
- Notification and escalation service

## Auth / audit / policy implications
- Policy versions need immutable storage and clear lineage because disputes often hinge on “which text applied when.”
- Control change approvals should be system authoritative and separate from agent recommendations.
- Access controls must respect sensitive policy domains and cross-functional confidentiality boundaries.
- Every implementation action must remain traceable back to specific source obligations and human approvals.
