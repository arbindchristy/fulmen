# System Architecture

## High-level architecture
- Web app for control owners, reviewers, and approvers
- API orchestration layer as the only workflow and enforcement boundary
- Connector service for governed evidence retrieval
- Evidence store with hashes, lineage metadata, and retention policies
- Agent runtime for evidence classification, gap analysis, and narrative drafting
- Policy engine for access, approval, and export controls
- Audit service for append-only event capture

## Agent roles
- Evidence Collector Agent
- Gap Investigator Agent
- Narrative Composer Agent
- Exception Summarizer Agent

## System services
- Identity and RBAC
- Connector credential broker
- Evidence normalization pipeline
- Approval workflow service
- Export service for audit packs

## Auth / audit / policy implications
- Sensitive artifacts require field-level or attachment-level access controls.
- Every generated narrative must preserve links to the exact source artifacts used.
- Evidence acceptance and exception approval need immutable decision records.
- The model never fetches source systems directly; the system retrieves artifacts and passes sanitized context to bounded agents.
