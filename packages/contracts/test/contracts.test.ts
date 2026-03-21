import { describe, expect, it } from 'vitest';

import {
  createChangeRequestInputSchema,
  governedPreviewResponseSchema,
  policyDecisionSchema,
  riskPolicyAssessmentSchema,
  structuredPlanSchema,
} from '../src/index.js';

describe('@fulmen/contracts', () => {
  it('parses a minimal change request input', () => {
    const payload = createChangeRequestInputSchema.parse({
      title: 'Restart edge router',
      description: 'Controlled restart during the approved maintenance window.',
      rationale: 'Resolve stuck routing processes before business hours.',
      riskLevel: 'medium',
      targetRef: 'router-01',
      environment: 'production',
      requestedWindow: {
        startAt: '2026-03-22T01:00:00.000Z',
        endAt: '2026-03-22T02:00:00.000Z',
      },
    });

    expect(payload.title).toBe('Restart edge router');
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
      actionType: 'change.execute',
      resourceRef: 'router-01',
      decision: 'require_approval',
      reasonCode: 'risk.high',
      explanation: 'High-risk change requires approval.',
    });

    expect(decision.decision).toBe('require_approval');
  });

  it('validates a governed preview response', () => {
    const assessment = riskPolicyAssessmentSchema.parse({
      actionId: 'execute-change',
      riskLevel: 'high',
      posture: 'review',
      summary: 'Production execution needs review because it changes a live router.',
      factors: ['Production environment', 'Operator declared high risk'],
    });

    const preview = governedPreviewResponseSchema.parse({
      changeRequest: {
        id: '00000000-0000-0000-0000-000000000111',
        tenantId: '00000000-0000-0000-0000-000000000001',
        requestKey: 'cr-001',
        title: 'Restart edge router',
        description: 'Controlled restart during the approved maintenance window.',
        rationale: 'Resolve stuck routing processes before business hours.',
        riskLevel: 'high',
        status: 'preview_ready',
        targetRef: 'router-01',
        environment: 'production',
        requestedBy: '00000000-0000-0000-0000-000000000010',
        requestedWindow: {
          startAt: '2026-03-22T01:00:00.000Z',
          endAt: '2026-03-22T02:00:00.000Z',
        },
        createdAt: '2026-03-21T12:00:00.000Z',
      },
      normalizedRequest: {
        title: 'Restart edge router',
        changeCategory: 'network',
        targetRef: 'router-01',
        environment: 'production',
        requestedOutcome: 'Restart the router cleanly.',
        rationale: 'Resolve stuck routing processes before business hours.',
        operatorIntentSummary: 'Restart router-01 during the approved window.',
        assumptions: ['A maintenance window exists.'],
        missingInformation: [],
        requestedWindow: {
          startAt: '2026-03-22T01:00:00.000Z',
          endAt: '2026-03-22T02:00:00.000Z',
        },
      },
      actionPlan: {
        planId: 'plan-1',
        summary: 'Validate, execute, and verify the requested change.',
        actions: [
          {
            id: 'execute-change',
            kind: 'execution',
            title: 'Apply change',
            actionType: 'change.execute',
            resourceRef: 'router-01',
            summary: 'Restart the router within the approved window.',
            rationale: 'The operator requested a production router restart.',
          },
        ],
      },
      governedActions: [
        {
          action: {
            id: 'execute-change',
            kind: 'execution',
            title: 'Apply change',
            actionType: 'change.execute',
            resourceRef: 'router-01',
            summary: 'Restart the router within the approved window.',
            rationale: 'The operator requested a production router restart.',
          },
          riskAssessment: assessment,
          policyDecision: {
            actionType: 'change.execute',
            resourceRef: 'router-01',
            decision: 'require_approval',
            reasonCode: 'policy.require-approval-high-risk-execution',
            explanation: 'High-risk change requires approval.',
          },
          approvalRequired: true,
        },
      ],
      previewSummary:
        'Preview prepared with one action that requires approval before execution.',
    });

    expect(preview.governedActions[0]!.approvalRequired).toBe(true);
  });
});
