import { describe, expect, it } from 'vitest';

import {
  approvalRequestDetailSchema,
  createChangeRequestInputSchema,
  governedPreviewResponseSchema,
  policyDecisionSchema,
  riskPolicyAssessmentSchema,
  structuredPlanSchema,
} from '../src/index.js';

describe('@fulmen/contracts', () => {
  it('parses a minimal evidence cycle input', () => {
    const payload = createChangeRequestInputSchema.parse({
      title: 'Quarterly access review evidence pack',
      controlFamily: 'Access Governance',
      framework: 'SOC 2 CC6.2',
      description: 'Collect evidence for privileged access review completion.',
      rationale: 'Produce an audit-ready evidence pack.',
      businessOwner: 'Head of Identity Operations',
      sourceSystems: ['Okta', 'Jira'],
      riskLevel: 'medium',
      targetRef: 'UGR-ACCESS-01',
      environment: 'Global identity operations',
      requestedWindow: {
        startAt: '2026-05-01T00:00:00.000Z',
        endAt: '2026-05-31T23:59:00.000Z',
      },
    });

    expect(payload.framework).toBe('SOC 2 CC6.2');
  });

  it('requires at least one planned action', () => {
    expect(() =>
      structuredPlanSchema.parse({
        planId: 'plan-1',
        summary: 'Empty plan',
        actions: [],
      }),
    ).toThrow();
  });

  it('accepts a review-required policy decision', () => {
    const decision = policyDecisionSchema.parse({
      actionType: 'evidence.exception_review',
      resourceRef: 'UGR-ACCESS-01',
      decision: 'require_approval',
      reasonCode: 'policy.require-approval-high-sensitivity-exception',
      explanation: 'High-sensitivity evidence exception requires approval.',
    });

    expect(decision.decision).toBe('require_approval');
  });

  it('validates a governed evidence preview response', () => {
    const assessment = riskPolicyAssessmentSchema.parse({
      actionId: 'adjudicate-gaps',
      riskLevel: 'high',
      posture: 'review',
      summary: 'Exception review needs approval because the pack remains high sensitivity.',
      factors: ['Evidence sensitivity: high.', 'Open intake gaps remain.'],
    });

    const preview = governedPreviewResponseSchema.parse({
      changeRequest: {
        id: '00000000-0000-0000-0000-000000000111',
        tenantId: '00000000-0000-0000-0000-000000000001',
        requestKey: 'cr-001',
        title: 'Quarterly access review evidence pack',
        controlFamily: 'Access Governance',
        framework: 'SOC 2 CC6.2',
        description: 'Collect evidence for privileged access review completion.',
        rationale: 'Produce an audit-ready evidence pack.',
        businessOwner: 'Head of Identity Operations',
        sourceSystems: ['Okta', 'Jira'],
        riskLevel: 'high',
        status: 'preview_ready',
        targetRef: 'UGR-ACCESS-01',
        environment: 'Global identity operations',
        requestedBy: '00000000-0000-0000-0000-000000000010',
        requestedWindow: {
          startAt: '2026-05-01T00:00:00.000Z',
          endAt: '2026-05-31T23:59:00.000Z',
        },
        createdAt: '2026-05-10T12:00:00.000Z',
      },
      normalizedRequest: {
        title: 'Quarterly access review evidence pack',
        controlFamily: 'Access Governance',
        framework: 'SOC 2 CC6.2',
        targetRef: 'UGR-ACCESS-01',
        environment: 'Global identity operations',
        businessOwner: 'Head of Identity Operations',
        sourceSystems: ['Okta', 'Jira'],
        requestedOutcome:
          'Collect evidence for privileged access review completion for SOC 2 CC6.2 control UGR-ACCESS-01.',
        rationale: 'Produce an audit-ready evidence pack.',
        operatorIntentSummary:
          'Prepare a governed evidence pack for Access Governance control UGR-ACCESS-01 in Global identity operations for the evidence window starting 2026-05-01T00:00:00.000Z.',
        expectedArtifacts: [
          'Okta evidence extract for UGR-ACCESS-01',
          'Jira evidence extract for UGR-ACCESS-01',
        ],
        assumptions: ['A bounded evidence collection period has been declared.'],
        missingInformation: [],
        requestedWindow: {
          startAt: '2026-05-01T00:00:00.000Z',
          endAt: '2026-05-31T23:59:00.000Z',
        },
      },
      actionPlan: {
        planId: 'plan-1',
        summary: 'Collect, reconcile, narrate, and adjudicate evidence for UGR-ACCESS-01.',
        actions: [
          {
            id: 'adjudicate-gaps',
            kind: 'adjudication',
            title: 'Adjudicate evidence gaps and compensating explanations',
            actionType: 'evidence.exception_review',
            resourceRef: 'UGR-ACCESS-01',
            summary:
              'Route unresolved gaps and compensating explanations for UGR-ACCESS-01 through governed review.',
            rationale: 'Gap acceptance is the trust boundary.',
          },
        ],
      },
      governedActions: [
        {
          action: {
            id: 'adjudicate-gaps',
            kind: 'adjudication',
            title: 'Adjudicate evidence gaps and compensating explanations',
            actionType: 'evidence.exception_review',
            resourceRef: 'UGR-ACCESS-01',
            summary:
              'Route unresolved gaps and compensating explanations for UGR-ACCESS-01 through governed review.',
            rationale: 'Gap acceptance is the trust boundary.',
          },
          riskAssessment: assessment,
          policyDecision: {
            actionType: 'evidence.exception_review',
            resourceRef: 'UGR-ACCESS-01',
            decision: 'require_approval',
            reasonCode: 'policy.require-approval-high-sensitivity-exception',
            explanation: 'High-sensitivity evidence exception requires approval.',
          },
          approvalRequired: true,
          approvalDecision: null,
          approvalRequest: {
            id: '00000000-0000-0000-0000-000000000211',
            tenantId: '00000000-0000-0000-0000-000000000001',
            changeRequestId: '00000000-0000-0000-0000-000000000111',
            status: 'pending',
            assignedRole: 'approver',
            assignedUserId: null,
            actionId: 'adjudicate-gaps',
            actionTitle: 'Adjudicate evidence gaps and compensating explanations',
            actionSummary:
              'Route unresolved gaps and compensating explanations for UGR-ACCESS-01 through governed review.',
            actionType: 'evidence.exception_review',
            resourceRef: 'UGR-ACCESS-01',
            createdAt: '2026-05-10T12:05:00.000Z',
          },
        },
      ],
      evidencePack: {
        coverageSummary: '2 of 3 artifacts are audit-ready for SOC 2 CC6.2 control UGR-ACCESS-01. 1 gap remains open for reviewer adjudication.',
        narrativeDraft:
          'SOC 2 CC6.2 control UGR-ACCESS-01 for Access Governance is supported by evidence from Okta, Jira.',
        artifacts: [
          {
            id: 'artifact-1',
            system: 'Okta',
            artifactType: 'system-export',
            title: 'Okta control evidence',
            description: 'System-generated evidence extract from Okta.',
            status: 'ready',
            freshness: 'current',
            provenance: 'Connector snapshot captured from Okta.',
          },
        ],
        gaps: [
          {
            id: 'gap-1',
            severity: 'high',
            title: 'Owner attestation is not audit-ready',
            summary: 'Owner attestation still needs stronger provenance.',
            remediation: 'Confirm provenance and provide reviewer-acceptable attachment.',
            approvalRequired: true,
          },
        ],
        followUps: ['Confirm provenance and provide reviewer-acceptable attachment.'],
      },
      previewSummary:
        'Evidence pack prepared with 1 high-severity gap and 1 governed review action requiring approval.',
    });

    expect(preview.evidencePack.gaps[0]!.approvalRequired).toBe(true);
  });

  it('validates an approval request detail payload', () => {
    const detail = approvalRequestDetailSchema.parse({
      id: '00000000-0000-0000-0000-000000000211',
      tenantId: '00000000-0000-0000-0000-000000000001',
      changeRequestId: '00000000-0000-0000-0000-000000000111',
      status: 'pending',
      assignedRole: 'approver',
      assignedUserId: null,
      actionId: 'adjudicate-gaps',
      actionTitle: 'Adjudicate evidence gaps and compensating explanations',
      actionSummary: 'Route unresolved gaps through governed review.',
      actionType: 'evidence.exception_review',
      resourceRef: 'UGR-ACCESS-01',
      createdAt: '2026-05-10T12:05:00.000Z',
      changeRequest: {
        id: '00000000-0000-0000-0000-000000000111',
        requestKey: 'cr-001',
        title: 'Quarterly access review evidence pack',
        controlFamily: 'Access Governance',
        framework: 'SOC 2 CC6.2',
        description: 'Collect evidence for privileged access review completion.',
        rationale: 'Produce an audit-ready evidence pack.',
        businessOwner: 'Head of Identity Operations',
        sourceSystems: ['Okta', 'Jira'],
        riskLevel: 'high',
        status: 'in_review',
        targetRef: 'UGR-ACCESS-01',
        environment: 'Global identity operations',
        requestedBy: '00000000-0000-0000-0000-000000000010',
        createdAt: '2026-05-10T12:00:00.000Z',
      },
      action: {
        id: 'adjudicate-gaps',
        kind: 'adjudication',
        title: 'Adjudicate evidence gaps and compensating explanations',
        actionType: 'evidence.exception_review',
        resourceRef: 'UGR-ACCESS-01',
        summary: 'Route unresolved gaps through governed review.',
        rationale: 'Gap acceptance is the trust boundary.',
      },
      policyDecision: {
        actionType: 'evidence.exception_review',
        resourceRef: 'UGR-ACCESS-01',
        decision: 'require_approval',
        reasonCode: 'policy.require-approval-high-sensitivity-exception',
        explanation: 'High-sensitivity evidence exception requires approval.',
      },
      riskAssessment: {
        actionId: 'adjudicate-gaps',
        riskLevel: 'high',
        posture: 'review',
        summary: 'This action accepts unresolved evidence gaps.',
        factors: ['Evidence sensitivity: high.'],
      },
      decision: null,
    });

    expect(detail.changeRequest.framework).toBe('SOC 2 CC6.2');
  });
});
