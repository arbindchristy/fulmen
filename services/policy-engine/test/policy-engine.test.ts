import { describe, expect, it } from 'vitest';

import { createPolicyDecisionService } from '../src/index.js';

describe('@fulmen/policy-engine', () => {
  it('requires approval for high-risk execution actions', () => {
    const service = createPolicyDecisionService();

    const decision = service.evaluate(
      {
        id: 'execute-change',
        actionType: 'change.execute',
        resourceRef: 'router-01',
        summary: 'Execute router restart',
        requiresApproval: true,
      },
      'high',
    );

    expect(decision.decision).toBe('require_approval');
  });
});
