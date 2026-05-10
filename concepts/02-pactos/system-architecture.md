# System Architecture

## High-level architecture
- Web workbench for procurement, legal, finance, and approvers
- API orchestration layer for matter lifecycle, approvals, and audit
- Document ingestion and parsing pipeline
- Clause graph store linking issues, playbooks, precedent, and approvals
- Agent runtime for mapping, drafting, and concession modeling
- Policy service for delegated authority and fallback rules
- Audit and decision log service

## Agent roles
- Clause Mapper Agent
- Strategy Agent
- Redline Agent
- Counterparty Response Analyst

## System services
- Document versioning
- Approval workflow engine
- Precedent retrieval service
- Access-control service for privileged matters
- Export service for redline packages

## Auth / audit / policy implications
- Matter-level access controls are mandatory because contracts often contain privileged or commercially sensitive terms.
- Every proposed concession needs a traceable link to the governing playbook, precedent, or human override.
- Approval state must be authoritative; the model cannot “approve” a deviation by generating confident language.
- Audit logs should distinguish AI suggestions, human edits, and final outbound positions.
