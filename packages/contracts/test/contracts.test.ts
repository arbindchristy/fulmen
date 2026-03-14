import { describe, expect, it } from 'vitest';

import {
  createChangeRequestInputSchema,
  policyDecisionSchema,
  structuredPlanSchema,
} from '../src/index.js';

describe('@fulmen/contracts', () => {
  it('parses a minimal change request input', () => {
    const payload = createChangeRequestInputSchema.parse({
      title: 'Restart edge router',
      description: 'Controlled restart during the approved maintenance window.',
      riskLevel: 'medium',
      targetRef: 'router-01',
      environment: 'production',
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
});
