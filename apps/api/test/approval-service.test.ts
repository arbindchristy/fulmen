import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { AuditService } from '@fulmen/audit';
import type { ApprovalRequestDetail } from '@fulmen/contracts';

import { createApprovalService } from '../src/approvals/approval-service.js';
import type { ApprovalRepository } from '../src/approvals/approval-repository.js';
import type { ChangeRequestRepository } from '../src/change-requests/change-request-repository.js';

describe('@fulmen/api approval service', () => {
  it('creates approval requests only for approval-required evidence actions and audits creation', async () => {
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
            createdAt: '2026-05-10T12:05:00.000Z',
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
        async summarizeChangeRequestApprovals() {
          return {
            total: 1,
            pending: 1,
            approved: 0,
            rejected: 0,
          };
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
      changeRequestRepository: {
        async ensurePrincipal() {},
        async updateStatus() {
          throw new Error('updateStatus should not be called when creating approvals');
        },
      } satisfies Pick<ChangeRequestRepository, 'ensurePrincipal' | 'updateStatus'>,
    });

    const approvals = await service.createApprovalRequestsForActions({
      tenantId: '00000000-0000-0000-0000-000000000001',
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
        createdAt: '2026-05-10T12:00:00.000Z',
      },
      governedActions: [
        {
          action: {
            id: 'collect-evidence',
            kind: 'collection',
            title: 'Collect governed evidence from declared systems',
            actionType: 'evidence.collect',
            resourceRef: 'UGR-ACCESS-01',
            summary: 'Collect source artifacts.',
            rationale: 'Collection is system controlled.',
          },
          riskAssessment: {
            actionId: 'collect-evidence',
            riskLevel: 'high',
            posture: 'inform',
            summary: 'Collection only.',
            factors: ['No final acceptance'],
          },
          policyDecision: {
            actionType: 'evidence.collect',
            resourceRef: 'UGR-ACCESS-01',
            decision: 'allow',
            reasonCode: 'policy.allow-evidence-collection',
            explanation: 'Allowed.',
          },
          approvalRequired: false,
          approvalRequest: null,
          approvalDecision: null,
        },
        {
          action: {
            id: 'adjudicate-gaps',
            kind: 'adjudication',
            title: 'Adjudicate evidence gaps and compensating explanations',
            actionType: 'evidence.exception_review',
            resourceRef: 'UGR-ACCESS-01',
            summary: 'Route unresolved gaps through governed review.',
            rationale: 'Gap acceptance is the trust boundary.',
          },
          riskAssessment: {
            actionId: 'adjudicate-gaps',
            riskLevel: 'high',
            posture: 'review',
            summary: 'This action accepts unresolved evidence gaps.',
            factors: ['High sensitivity'],
          },
          policyDecision: {
            actionType: 'evidence.exception_review',
            resourceRef: 'UGR-ACCESS-01',
            decision: 'require_approval',
            reasonCode: 'policy.require-approval-high-sensitivity-exception',
            explanation: 'High-sensitivity evidence exception requires approval.',
          },
          approvalRequired: true,
          approvalRequest: null,
          approvalDecision: null,
        },
      ],
    });

    expect(createdInputs).toEqual([1]);
    expect(approvals[0]!.actionId).toBe('adjudicate-gaps');
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
        factors: ['High sensitivity'],
      },
      decision: null,
    };

    let currentApprovalStatus: 'pending' | 'approved' = 'pending';
    let currentDecision: ApprovalRequestDetail['decision'] = null;
    let currentChangeRequestStatus: 'in_review' | 'approved' = 'in_review';

    const approvalRepository: ApprovalRepository = {
      async createApprovalRequests() {
        return [];
      },
      async listPendingApprovals() {
        return [];
      },
      async getApprovalDetail() {
        return {
          ...detail,
          status: currentApprovalStatus,
          changeRequest: {
            ...detail.changeRequest,
            status: currentChangeRequestStatus,
          },
          decision: currentDecision,
        };
      },
      async recordApprovalDecision() {
        currentApprovalStatus = 'approved';
        currentDecision = {
          decision: 'approved',
          decidedBy: '00000000-0000-0000-0000-000000000099',
          justification: 'Residual evidence gap is understood and accepted for this period.',
          decidedAt: '2026-05-10T12:10:00.000Z',
        };

        return {
          ...detail,
          status: currentApprovalStatus,
          decision: currentDecision,
        };
      },
      async summarizeChangeRequestApprovals() {
        return {
          total: 1,
          pending: 0,
          approved: 1,
          rejected: 0,
        };
      },
    };

    const updateStatuses: string[] = [];

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
      changeRequestRepository: {
        async ensurePrincipal() {},
        async updateStatus(_id, _tenantId, status) {
          updateStatuses.push(status);
          currentChangeRequestStatus = status as 'approved';

          return {
            ...detail.changeRequest,
            status,
            tenantId: '00000000-0000-0000-0000-000000000001',
            requestedWindow: undefined,
          };
        },
      } satisfies Pick<ChangeRequestRepository, 'ensurePrincipal' | 'updateStatus'>,
    });

    const decision = await service.approve(
      '00000000-0000-0000-0000-000000000211',
      {
        justification: 'Residual evidence gap is understood and accepted for this period.',
      },
      {
        userId: '00000000-0000-0000-0000-000000000099',
        tenantId: '00000000-0000-0000-0000-000000000001',
        role: 'approver',
      },
    );

    expect(decision.status).toBe('approved');
    expect(decision.changeRequest.status).toBe('approved');
    expect(decision.decision?.decidedBy).toBe(
      '00000000-0000-0000-0000-000000000099',
    );
    expect(updateStatuses).toEqual(['approved']);
    expect(auditEvents).toEqual(['approval_request.approved']);
  });
});
