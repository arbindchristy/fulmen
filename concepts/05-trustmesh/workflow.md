# Workflow

## End-to-end user workflow
1. A finding is imported from an assessment, audit, or external review.
2. The Finding Interpreter Agent converts the finding into a structured case with expected evidence and likely remediation paths.
3. The enterprise team opens a supplier case room and sends a tightly scoped remediation request.
4. The supplier uploads evidence, timeline commitments, and narrative explanations.
5. The Evidence Reviewer Agent evaluates the submission for completeness, freshness, and alignment to the finding.
6. The Remediation Planner Agent suggests next steps, compensating controls, or acceptance paths.
7. The system routes residual-risk exceptions, deadline extensions, or compensating-control approvals to the right enterprise approvers.
8. The case closes only when the system records accepted remediation or an approved exception with evidence.

## Where agents are used
- Finding interpretation
- Evidence review and completeness checks
- Remediation-plan drafting
- Portfolio pattern detection across suppliers

## Where system controls are used
- Tenant and supplier boundary enforcement
- Evidence retention, versioning, and provenance tracking
- Approval routing for exceptions and compensating controls
- Audit logging across both enterprise and supplier actions

## Where human decisions remain
- Accepting or rejecting submitted remediation evidence
- Approving residual-risk exceptions
- Deciding whether a supplier deadline extension is acceptable
- Escalating unresolved issues into procurement or executive action
