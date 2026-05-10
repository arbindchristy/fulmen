import { describe, expect, it } from 'vitest';

import { createAuditService } from '@fulmen/audit';
import { createGuardAgent } from '@fulmen/guard-agent';
import { createPolicyDecisionService } from '@fulmen/policy-engine';

import { createDefaultOrchestrator } from '../src/index.js';

describe('@fulmen/orchestrator governed preview', () => {
  it('produces a deterministic governed evidence preview with approval requirements', async () => {
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
        title: 'Quarterly access review evidence pack',
        controlFamily: 'Access Governance',
        framework: 'SOC 2 CC6.2',
        description: 'Collect evidence for privileged access review completion.',
        rationale: 'Produce an audit-ready evidence pack.',
        businessOwner: 'Head of Identity Operations',
        sourceSystems: ['Okta', 'Jira'],
        riskLevel: 'high',
        status: 'submitted',
        targetRef: 'UGR-ACCESS-01',
        environment: 'Global identity operations',
        requestedBy: '00000000-0000-0000-0000-000000000010',
        requestedWindow: {
          startAt: '2026-05-01T00:00:00.000Z',
          endAt: '2026-05-31T23:59:00.000Z',
        },
        createdAt: '2026-05-10T12:00:00.000Z',
      },
      submission: {
        title: 'Quarterly access review evidence pack',
        controlFamily: 'Access Governance',
        framework: 'SOC 2 CC6.2',
        description: 'Collect evidence for privileged access review completion.',
        rationale: 'Produce an audit-ready evidence pack.',
        businessOwner: 'Head of Identity Operations',
        sourceSystems: ['Okta', 'Jira'],
        riskLevel: 'high',
        targetRef: 'UGR-ACCESS-01',
        environment: 'Global identity operations',
        requestedWindow: {
          startAt: '2026-05-01T00:00:00.000Z',
          endAt: '2026-05-31T23:59:00.000Z',
        },
      },
    });

    expect(preview.normalizedRequest.controlFamily).toBe('Access Governance');
    expect(preview.actionPlan.actions).toHaveLength(4);
    expect(preview.evidencePack.artifacts.length).toBeGreaterThan(0);
    expect(
      preview.governedActions.some((action) => action.approvalRequired),
    ).toBe(true);
    expect(preview.previewSummary).toContain('requiring approval');
  });
});
