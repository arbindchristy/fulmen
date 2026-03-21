import { describe, expect, it } from 'vitest';

import { createAuditService } from '@fulmen/audit';
import { createGuardAgent } from '@fulmen/guard-agent';
import { createPolicyDecisionService } from '@fulmen/policy-engine';

import { createDefaultOrchestrator } from '../src/index.js';

describe('@fulmen/orchestrator governed preview', () => {
  it('produces a deterministic governed preview with approval requirements', async () => {
    const orchestrator = createDefaultOrchestrator({
      auditService: createAuditService(),
      guardAgent: createGuardAgent(),
      policyDecisionService: createPolicyDecisionService(),
    });

    const preview = await orchestrator.preview({
      changeRequest: {
        id: '00000000-0000-0000-0000-000000000111',
        tenantId: '00000000-0000-0000-0000-000000000001',
        requestKey: 'cr-001',
        title: 'Restart edge router',
        description: 'Restart router-01 and verify routing health after the restart.',
        rationale: 'Recover from a stuck routing process.',
        riskLevel: 'high',
        status: 'submitted',
        targetRef: 'router-01',
        environment: 'production',
        requestedBy: '00000000-0000-0000-0000-000000000010',
        requestedWindow: {
          startAt: '2026-03-22T01:00:00.000Z',
          endAt: '2026-03-22T02:00:00.000Z',
        },
        createdAt: '2026-03-21T12:00:00.000Z',
      },
      submission: {
        title: 'Restart edge router',
        description: 'Restart router-01 and verify routing health after the restart.',
        rationale: 'Recover from a stuck routing process.',
        riskLevel: 'high',
        targetRef: 'router-01',
        environment: 'production',
        requestedWindow: {
          startAt: '2026-03-22T01:00:00.000Z',
          endAt: '2026-03-22T02:00:00.000Z',
        },
      },
    });

    expect(preview.normalizedRequest.changeCategory).toBe('network');
    expect(preview.actionPlan.actions).toHaveLength(3);
    expect(
      preview.governedActions.some((action) => action.approvalRequired),
    ).toBe(true);
    expect(preview.previewSummary).toContain('requiring approval');
  });
});
