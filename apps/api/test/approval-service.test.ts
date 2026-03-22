import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { AuditService } from '@fulmen/audit';
import type { ApprovalRequestDetail } from '@fulmen/contracts';

import { createApprovalService } from '../src/approvals/approval-service.js';
import type { ApprovalRepository } from '../src/approvals/approval-repository.js';
import type { ChangeRequestRepository } from '../src/change-requests/change-request-repository.js';

describe('@fulmen/api approval service', () => {
  it('creates approval requests only for approval-required actions and audits creation', async () => {
    const auditEvents: string[] = [];
    const createdInputs: number[] = [];

    const service = createApprovalService({
      approvalRepository: {
        async createApprovalRequests(input) {
          createdInputs.push(input.length);

          return input.map((item, index) => ({
            id: `00000000-0000-0000-0000-00000000021${index + 1}`,
            tenantId: item.tenantId,
            changeRequestId: item.changeRequest.id,
            status: 'pending',
            assignedRole: item.assignedRole,
            assignedUserId: null,
            actionId: item.governedAction.action.id,
            actionTitle: item.governedAction.action.title,
            actionSummary: item.governedAction.action.summary,
            actionType: item.governedAction.action.actionType,
            resourceRef: item.governedAction.action.resourceRef,
            createdAt: '2026-03-21T12:05:00.000Z',
          }));
        },
        async listPendingApprovals() {
          return [];
        },
        async getApprovalDetail() {
          return null;
        },
        async recordApprovalDecision() {
          throw new Error('not implemented');
        },
      },
      auditService: {
        async record(event) {
          auditEvents.push(event.eventType);

          return {
            id: randomUUID(),
            tenantId: event.tenantId,
            eventType: event.eventType,
            entityType: event.entityType,
            entityId: event.entityId,
            actorType: event.actorType,
            actorId: event.actorId,
            occurredAt: new Date().toISOString(),
            payload: event.payload ?? {},
          };
        },
      } as AuditService,
      principalProvisioner: {
        async ensurePrincipal() {},
      } satisfies Pick<ChangeRequestRepository, 'ensurePrincipal'>,
    });

    const approvals = await service.createApprovalRequestsForActions({
      tenantId: '00000000-0000-0000-0000-000000000001',
      changeRequest: {
        id: '00000000-0000-0000-0000-000000000111',
        tenantId: '00000000-0000-0000-0000-000000000001',
        requestKey: 'cr-001',
        title: 'Restart edge router',
        description: 'Restart router-01 during the approved window.',
        rationale: 'Recover from a failed daemon.',
        riskLevel: 'high',
        status: 'submitted',
        targetRef: 'router-01',
        environment: 'production',
        requestedBy: '00000000-0000-0000-0000-000000000010',
        createdAt: '2026-03-21T12:00:00.000Z',
      },
      governedActions: [
        {
          action: {
            id: 'validate-target',
            kind: 'validation',
            title: 'Validate target',
            actionType: 'change.validate',
            resourceRef: 'router-01',
            summary: 'Validate target access.',
            rationale: 'Pre-check.',
          },
          riskAssessment: {
            actionId: 'validate-target',
            riskLevel: 'high',
            posture: 'inform',
            summary: 'Validation only.',
            factors: ['No state change'],
          },
          policyDecision: {
            actionType: 'change.validate',
            resourceRef: 'router-01',
            decision: 'allow',
            reasonCode: 'policy.allow-low-risk-validation',
            explanation: 'Allowed.',
          },
          approvalRequired: false,
          approvalRequest: null,
        },
        {
          action: {
            id: 'execute-change',
            kind: 'execution',
            title: 'Apply the requested change',
            actionType: 'change.execute',
            resourceRef: 'router-01',
            summary: 'Restart router-01 during the approved window.',
            rationale: 'Production restart requested by operator.',
          },
          riskAssessment: {
            actionId: 'execute-change',
            riskLevel: 'high',
            posture: 'review',
            summary: 'Execution changes a production router.',
            factors: ['Production environment'],
          },
          policyDecision: {
            actionType: 'change.execute',
            resourceRef: 'router-01',
            decision: 'require_approval',
            reasonCode: 'policy.require-approval-high-risk-execution',
            explanation: 'High-risk change requires approval.',
          },
          approvalRequired: true,
          approvalRequest: null,
        },
      ],
    });

    expect(createdInputs).toEqual([1]);
    expect(approvals).toHaveLength(1);
    expect(approvals[0]!.actionId).toBe('execute-change');
    expect(auditEvents).toEqual(['approval_request.created']);
  });

  it('records an approval decision with a real actor identity', async () => {
    const auditEvents: string[] = [];
    const detail: ApprovalRequestDetail = {
      id: '00000000-0000-0000-0000-000000000211',
      tenantId: '00000000-0000-0000-0000-000000000001',
      changeRequestId: '00000000-0000-0000-0000-000000000111',
      status: 'pending',
      assignedRole: 'approver',
      assignedUserId: null,
      actionId: 'execute-change',
      actionTitle: 'Apply the requested change',
      actionSummary: 'Restart router-01 during the approved window.',
      actionType: 'change.execute',
      resourceRef: 'router-01',
      createdAt: '2026-03-21T12:05:00.000Z',
      changeRequest: {
        id: '00000000-0000-0000-0000-000000000111',
        requestKey: 'cr-001',
        title: 'Restart edge router',
        description: 'Restart router-01 during the approved window.',
        rationale: 'Recover from a failed daemon.',
        riskLevel: 'high',
        targetRef: 'router-01',
        environment: 'production',
        requestedBy: '00000000-0000-0000-0000-000000000010',
        createdAt: '2026-03-21T12:00:00.000Z',
      },
      action: {
        id: 'execute-change',
        kind: 'execution',
        title: 'Apply the requested change',
        actionType: 'change.execute',
        resourceRef: 'router-01',
        summary: 'Restart router-01 during the approved window.',
        rationale: 'Production restart requested by operator.',
      },
      policyDecision: {
        actionType: 'change.execute',
        resourceRef: 'router-01',
        decision: 'require_approval',
        reasonCode: 'policy.require-approval-high-risk-execution',
        explanation: 'High-risk change requires approval.',
      },
      riskAssessment: {
        actionId: 'execute-change',
        riskLevel: 'high',
        posture: 'review',
        summary: 'Execution changes a production router.',
        factors: ['Production environment'],
      },
      decision: null,
    };

    const approvalRepository: ApprovalRepository = {
      async createApprovalRequests() {
        return [];
      },
      async listPendingApprovals() {
        return [];
      },
      async getApprovalDetail() {
        return detail;
      },
      async recordApprovalDecision() {
        return {
          ...detail,
          status: 'approved',
          decision: {
            decision: 'approved',
            decidedBy: '00000000-0000-0000-0000-000000000099',
            justification: 'Maintenance window confirmed and rollback is prepared.',
            decidedAt: '2026-03-21T12:10:00.000Z',
          },
        };
      },
    };

    const service = createApprovalService({
      approvalRepository,
      auditService: {
        async record(event) {
          auditEvents.push(event.eventType);

          return {
            id: randomUUID(),
            tenantId: event.tenantId,
            eventType: event.eventType,
            entityType: event.entityType,
            entityId: event.entityId,
            actorType: event.actorType,
            actorId: event.actorId,
            occurredAt: new Date().toISOString(),
            payload: event.payload ?? {},
          };
        },
      } as AuditService,
      principalProvisioner: {
        async ensurePrincipal() {},
      } satisfies Pick<ChangeRequestRepository, 'ensurePrincipal'>,
    });

    const decision = await service.approve(
      '00000000-0000-0000-0000-000000000211',
      {
        justification:
          'Maintenance window confirmed and rollback is prepared.',
      },
      {
        userId: '00000000-0000-0000-0000-000000000099',
        tenantId: '00000000-0000-0000-0000-000000000001',
        role: 'approver',
      },
    );

    expect(decision.status).toBe('approved');
    expect(decision.decision?.decidedBy).toBe(
      '00000000-0000-0000-0000-000000000099',
    );
    expect(auditEvents).toEqual(['approval_request.approved']);
  });
});
