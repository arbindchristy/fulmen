# System Architecture

## High-level architecture
- Enterprise web app plus supplier-facing portal
- API orchestration layer for case lifecycle, approvals, and boundary enforcement
- Evidence store with tenant-scoped artifacts and retention policies
- Case management service for findings, submissions, deadlines, and decisions
- Agent runtime for finding interpretation, evidence review, and remediation planning
- Policy engine for exception rules, case closure criteria, and access boundaries
- Audit service for append-only cross-party event history

## Agent roles
- Finding Interpreter Agent
- Evidence Reviewer Agent
- Remediation Planner Agent
- Portfolio Pattern Detector

## System services
- Supplier identity and invitation service
- Secure artifact exchange service
- Approval workflow engine
- Notification and escalation service
- Portfolio analytics service

## Auth / audit / policy implications
- Multi-party access control is central because enterprise teams and suppliers must collaborate without overexposure.
- The system must preserve exactly which evidence was visible to which party and when.
- Exception approvals need clear expiry, owner, and residual-risk statements.
- Agents can evaluate and summarize evidence, but closure state must remain system-controlled and reviewer-approved.
