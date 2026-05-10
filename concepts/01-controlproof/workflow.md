# Workflow

## End-to-end user workflow
1. A control owner or audit lead selects a control set and evidence period.
2. The system pulls connector data and existing artifacts into an evidence workspace.
3. The Evidence Collector Agent groups raw artifacts by control assertion and flags obvious gaps.
4. The Gap Investigator Agent asks for missing artifacts or clarifications with tightly scoped requests.
5. The Narrative Composer Agent drafts the control narrative, exceptions, and evidence rationale.
6. A reviewer validates the proposed evidence pack, accepts or rejects artifacts, and records exceptions.
7. The system routes high-risk exceptions or weak evidence chains to approvers.
8. An audit-ready pack is frozen, versioned, and exported with a full provenance trail.

## Where agents are used
- Artifact classification and evidence grouping
- Contradiction and completeness checks
- Drafting control narratives and exception summaries
- Generating targeted follow-up requests

## Where system controls are used
- Connector authentication and least-privilege retrieval
- Evidence hashing, provenance capture, and immutable timestamps
- Policy-based access controls for sensitive artifacts
- Approval routing for exception acceptance or evidence overrides
- Audit logging for every artifact view, decision, and export

## Where human decisions remain
- Accepting whether evidence sufficiently proves a control
- Approving compensating controls or exceptions
- Signing off control narratives for external or internal audit use
- Deciding when a control period is ready to freeze
