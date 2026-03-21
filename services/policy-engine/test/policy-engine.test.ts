import { describe, expect, it } from 'vitest';

import { createPolicyDecisionService } from '../src/index.js';

describe('@fulmen/policy-engine', () => {
  it('requires approval for high-risk execution actions', () => {
    const service = createPolicyDecisionService();

    const decision = service.evaluate(
      {
        id: 'execute-change',
        kind: 'execution',
        title: 'Execute router restart',
        actionType: 'change.execute',
        resourceRef: 'router-01',
        summary: 'Execute router restart',
        rationale: 'Operator requested a restart.',
      },
      'high',
    );

    expect(decision.decision).toBe('require_approval');
  });
});
