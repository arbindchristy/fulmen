import { describe, expect, it } from 'vitest';

import { createPolicyDecisionService } from '../src/index.js';

describe('@fulmen/policy-engine', () => {
  it('requires approval for high-sensitivity evidence exception actions', () => {
    const service = createPolicyDecisionService();

    const decision = service.evaluate(
      {
        id: 'adjudicate-gaps',
        kind: 'adjudication',
        title: 'Adjudicate evidence gaps',
        actionType: 'evidence.exception_review',
        resourceRef: 'UGR-ACCESS-01',
        summary: 'Review unresolved evidence gaps.',
        rationale: 'Control proof still contains unresolved artifacts.',
      },
      'high',
    );

    expect(decision.decision).toBe('require_approval');
  });
});
